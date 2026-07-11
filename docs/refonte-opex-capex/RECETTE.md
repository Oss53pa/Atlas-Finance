# Recette — Refonte OPEX/CAPEX (CDC §26)

Statut de la recette au terme de la refonte (7 lots livrés, PR #42 mergée).

## 1. Couverture des invariants (CDC §26.1)

| Invariant | Couvert par | Statut |
|---|---|---|
| #1 Disponible = Budget − Engagé − Réalisé | test unitaire (`refonteInvariants`) + **harnais E2E base** (§3) + contrôle structurel de la vue | ✅ |
| #3 Bascule engagé→réalisé nette, atomique | test unitaire + **harnais E2E** (trigger prouvé : 600→partiellement, +400→soldé, +200 via harnais) | ✅ |
| #3bis Surfacture > tolérance → statut, pas de bascule silencieuse | trigger `budget_engagement_sync_facture` (seuil 2 %) | ✅ (logique en base) |
| #4 Une version en vigueur ; version verrouillée immuable | `setVersionStatut` + hash chaîné (`verifyVersionChain`) ; trigger `budget_lines_lock_guard` | ✅ |
| #5 Virements à somme nulle | non implémenté (virements = feature différée) | ⏳ |
| #6/#7 CAPEX ≤ approprié ; pas de ligne sans CAR ; CAR ≤ BC | `carService.emitCar` (garde statut approuvé) + `capex_projets` | ✅ (flux) |
| #11/#11bis Enveloppe ; réaffectable clampé | `computeRanking` (flottaison) + `reaffectableAmount` (tests) | ✅ |
| #12 Snapshots immuables rejouables | `budget_snapshots` (pas de policy UPDATE) + `verifySnapshot` + test déterminisme | ✅ |
| #13 Hash chain vérifiable | `integrity.sha256Hex` + `verifyVersionChain` (test déterminisme) | ✅ |
| #10 Σ réalisé vues = balance GL | vues `security_invoker` sur `journal_lines` ; à jouer sur données réelles | ⏳ (données) |

**54 tests refonte verts** (10 fichiers, fonctions pures + logique). Invariants purs = couverts.

## 2. Protocole R1–R19 (CDC §26.2)

Les scénarios R1–R19 sont des flux **applicatifs de bout en bout** (UI → API → GL). Ils nécessitent un **tenant de test seedé + l'application lancée** (2 directions, 8 sections, 5 BC…), non exécutables en environnement headless. À jouer manuellement / en CI E2E. Les briques déterministes sous-jacentes sont couvertes par les tests unitaires ci-dessus et le harnais base ci-dessous.

## 3. Harnais E2E niveau base (non destructif, exécuté)

Valide les invariants **dépendants du schéma/vues/triggers** sur un scénario seedé, dans une transaction **rollback** (aucune écriture ne persiste — prouvé : 0 résidu). Exécuté via Supabase MCP sur le tenant EMERGENCE PLAZA.

Scénario : section + version active + ligne budget 1000 (mois 3) + engagement 300 + rapprochement 200.
Attendu : engagement `montant_facture=200`, statut `partiellement_facture` (inv #3) ; `v_budget_execution` → budget=1000, engagé=100, réalisé=0, disponible=900, et disponible=budget−engagé−réalisé (inv #1).

```sql
do $$
declare
  t uuid := '<tenant>'; fy uuid; axe uuid; sec uuid; ver uuid; line uuid; je uuid; jl uuid; eng uuid;
  v_fact numeric; v_stat text; r record; inv3 bool; inv1 bool; msg text;
begin
  insert into fiscal_years(tenant_id,code,name,start_date,end_date,is_active)
    values (t,'2099','Recette 2099','2099-01-01','2099-12-31',true) returning id into fy;
  insert into axes_analytiques(tenant_id,code,libelle,type_axe) values (t,'REC-AXE','Recette','centre_cout') returning id into axe;
  insert into sections_analytiques(axe_id,tenant_id,code,libelle) values (axe,t,'REC-CC','Recette CC') returning id into sec;
  insert into budget_versions(tenant_id,fiscal_year_id,libelle,type,statut,is_active)
    values (t,fy,'Recette','initial','brouillon',true) returning id into ver;
  insert into budget_lines(tenant_id,version_id,budget_type,account_code,section_id,nature)
    values (t,ver,'exploitation','6011',sec,'opex') returning id into line;
  insert into budget_line_periods(tenant_id,budget_line_id,period,montant_prevu) values (t,line,3,1000);
  insert into budget_engagements(tenant_id,source,account_code,section_id,periode,montant_initial,statut)
    values (t,'manuel','6011',sec,'2099-03-01',300,'ouvert') returning id into eng;
  insert into journal_entries(tenant_id,entry_number,journal,date,label,status)
    values (t,'RECETTE-TEST','OD','2099-03-15','Recette','validated') returning id into je;
  insert into journal_lines(entry_id,tenant_id,account_code,account_name,debit,credit)
    values (je,t,'9999','Recette',300,0) returning id into jl;
  insert into engagement_rapprochements(tenant_id,journal_line_id,engagement_id,montant) values (t,jl,eng,200);

  select montant_facture,statut into v_fact,v_stat from budget_engagements where id=eng;
  inv3 := (v_fact=200 and v_stat='partiellement_facture');
  select budget,engage,realise,disponible into r
    from v_budget_execution where account_code='6011' and section_id=sec and annee='2099' and period=3;
  inv1 := (r.budget=1000 and r.engage=100 and r.realise=0 and r.disponible=900
           and abs(r.disponible-(r.budget-r.engage-r.realise))<0.01);
  msg := format('RECETTE-E2E | inv3=%s [fact=%s stat=%s] | inv1=%s [b=%s e=%s r=%s d=%s]',
                inv3, v_fact, v_stat, inv1, r.budget, r.engage, r.realise, r.disponible);
  raise exception '%', msg;   -- rollback + retourne le résumé
end $$;
```

**Résultat obtenu (2026-07-11)** :
```
RECETTE-E2E | inv3(trigger)=t [fact=200.00 stat=partiellement_facture] | inv1(equation)=t [b=1000.00 e=100.00 r=0 d=900.00]
```
→ inv #1 et inv #3 **PASS**, rollback vérifié (0 résidu : `fiscal_years code='2099'`, `journal_entries 'RECETTE-TEST'`, `axes 'REC-AXE'` = 0).

## 4. Reste à jouer (hors périmètre code)
- R1–R19 UI E2E sur tenant test seedé + app lancée.
- Invariant #10 (Σ réalisé = balance GL) sur données budget réelles (l'analytique est vide aujourd'hui → lancer l'onboarding org du hub d'abord).
- Virements de crédits (#5) = feature différée.
