/**
 * ExecutiveDigest — « Vue Dirigeant » (/executive/digest).
 *
 * Synthèse exécutive destinée à un dirigeant : les mêmes agrégats financiers
 * RÉELS que la vue exécutive (source unique `computeDashboardMetrics`), présentés
 * de façon condensée, ET un panneau de PROGRAMMATION permettant de recevoir cette
 * synthèse par email (HTML) à cadence hebdomadaire ou mensuelle.
 *
 * L'envoi planifié est assuré côté serveur par l'Edge Function
 * `send-executive-report` (mode cron) ; le bouton « Envoyer maintenant »
 * déclenche un envoi immédiat (mode test).
 *
 * i18n : libellés FR inline (objet `L`) — cohérent avec PremiumOverview.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Mail, Calendar, Clock, Send, Save, CheckCircle2, Plus, X,
  Users, TrendingUp, TrendingDown, Wallet, Percent, Landmark, Info,
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { computeDashboardMetrics, type DashboardPeriod } from '../../utils/dashboardMetrics';
import {
  loadSchedule, saveSchedule, sendTestReport, isValidEmail,
  DEFAULT_SCHEDULE, type ExecutiveReportSchedule, type ReportFrequency,
} from '../../services/executiveReportService';

const L = {
  title: 'Vue Dirigeant',
  subtitle: 'Synthèse exécutive condensée, programmable par email (HTML).',
  ca: 'CHIFFRE D\'AFFAIRES',
  resultatNet: 'RÉSULTAT NET',
  treasury: 'TRÉSORERIE',
  marge: 'MARGE NETTE',
  vsPrev: 'vs mois précédent',
  scheduleTitle: 'Programmer l\'envoi',
  scheduleSub: 'Recevez automatiquement cette synthèse par email.',
  frequency: 'Fréquence',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuelle',
  recipients: 'Destinataires',
  addEmail: 'Ajouter un email…',
  weekdayLabel: 'Jour d\'envoi',
  monthDayLabel: 'Jour du mois',
  hourLabel: 'Heure (UTC)',
  enable: 'Activer l\'envoi programmé',
  save: 'Enregistrer',
  sendNow: 'Envoyer maintenant',
  nextRun: 'Prochain envoi',
  lastSent: 'Dernier envoi',
  never: 'jamais',
  noRecipients: 'Ajoutez au moins un destinataire pour activer l\'envoi.',
};

const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function fcfa(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(a / 1e9 >= 100 ? 0 : 2).replace('.', ',')} Md`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(a / 1e6 >= 100 ? 0 : 1).replace('.', ',')} M`;
  if (a >= 1e3) return `${s}${Math.round(a / 1e3)} K`;
  return `${s}${Math.round(a).toLocaleString('fr-FR')}`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return L.never;
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    }) + ' UTC';
  } catch { return L.never; }
}

interface KpiProps { eyebrow: string; value: string; unit?: string; delta?: { value: string; up: boolean | null }; icon: React.ReactNode; accent?: string }

const Kpi: React.FC<KpiProps> = ({ eyebrow, value, unit, delta, icon, accent }) => (
  <div className="rounded-xl p-5 border" style={{ background: 'var(--color-card-bg, var(--color-surface))', borderColor: 'var(--color-border)' }}>
    <div className="flex items-center justify-between mb-3">
      <div className="p-2 rounded-lg" style={{ background: 'var(--color-background)' }}>
        <span style={{ color: accent || 'var(--color-primary)' }}>{icon}</span>
      </div>
      {delta && (
        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: delta.up === true ? 'var(--color-success)' : delta.up === false ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
          {delta.up === true ? <TrendingUp className="w-3.5 h-3.5" /> : delta.up === false ? <TrendingDown className="w-3.5 h-3.5" /> : null}
          {delta.value}
        </span>
      )}
    </div>
    <div className="text-2xl font-extrabold" style={{ color: accent || 'var(--color-text-primary)' }}>
      {value} {unit && <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{unit}</span>}
    </div>
    <div className="text-xs font-bold uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-secondary)' }}>{eyebrow}</div>
  </div>
);

const ExecutiveDigest: React.FC = () => {
  const { adapter } = useData();

  const [entries, setEntries] = useState<any[]>([]);
  const [period, setPeriod] = useState<DashboardPeriod>({});
  const [fyYear, setFyYear] = useState<number>(new Date().getFullYear());

  const [schedule, setSchedule] = useState<ExecutiveReportSchedule>({ ...DEFAULT_SCHEDULE });
  const [emailInput, setEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // ─── Données GL réelles (exercice actif) ───
  useEffect(() => {
    (async () => {
      try {
        const [ents, fiscalYears] = await Promise.all([
          adapter.getAll<any>('journalEntries'),
          adapter.getAll<any>('fiscalYears'),
        ]);
        const activeFY = (fiscalYears as any[]).find((fy: any) => fy.isActive || fy.is_active);
        const start = activeFY?.startDate || activeFY?.start_date;
        const end = activeFY?.endDate || activeFY?.end_date;
        const y = start ? parseInt(String(start).slice(0, 4), 10) : new Date().getFullYear();
        setEntries(ents as any[]);
        setFyYear(y);
        setPeriod(start && end
          ? { from: String(start).slice(0, 10), to: String(end).slice(0, 10) }
          : { from: `${y}-01-01`, to: `${y}-12-31` });
      } catch { /* état vide honnête */ }
    })();
  }, [adapter]);

  // ─── Planification enregistrée ───
  useEffect(() => {
    (async () => {
      setLoadingSchedule(true);
      try {
        setSchedule(await loadSchedule());
      } catch { /* mode local : valeurs par défaut */ }
      finally { setLoadingSchedule(false); }
    })();
  }, []);

  const m = useMemo(() => computeDashboardMetrics(entries, period), [entries, period]);

  // Séries + delta mois courant vs précédent (mêmes règles que PremiumOverview).
  const delta = useMemo(() => {
    const buckets = Array.from({ length: 12 }, () => ({ ca: 0, res: 0 }));
    for (const e of entries) {
      if (!e || e.status === 'draft') continue;
      const d = String(e.date || '').slice(0, 10);
      if (!d || d.slice(0, 4) !== String(fyYear)) continue;
      const mi = parseInt(d.slice(5, 7), 10) - 1;
      if (mi < 0 || mi > 11) continue;
      for (const l of (e.lines || [])) {
        const cls = String(l.accountCode || '').charAt(0);
        const debit = Number(l.debit) || 0, credit = Number(l.credit) || 0;
        if (cls === '7') { buckets[mi].ca += credit - debit; buckets[mi].res += credit - debit; }
        else if (cls === '6') buckets[mi].res -= (debit - credit);
      }
    }
    const lastIdx = (() => { for (let i = 11; i >= 0; i--) if (buckets[i].ca !== 0 || buckets[i].res !== 0) return i; return -1; })();
    const pct = (cur: number, prev: number): { value: string; up: boolean | null } => {
      if (prev === 0) return { value: '—', up: null };
      const d = ((cur - prev) / Math.abs(prev)) * 100;
      return { value: `${d >= 0 ? '+' : ''}${d.toFixed(0)} %`, up: d > 1 ? true : d < -1 ? false : null };
    };
    if (lastIdx <= 0) return { ca: undefined as any, res: undefined as any };
    return {
      ca: pct(Math.round(buckets[lastIdx].ca), Math.round(buckets[lastIdx - 1].ca)),
      res: pct(Math.round(buckets[lastIdx].res), Math.round(buckets[lastIdx - 1].res)),
    };
  }, [entries, fyYear]);

  const resultPositive = m.resultatNet >= 0;
  const validRecipients = (schedule.recipients || []).filter(isValidEmail);

  // ─── Handlers ───
  const patch = (p: Partial<ExecutiveReportSchedule>) => setSchedule((s) => ({ ...s, ...p }));

  const addEmail = () => {
    const e = emailInput.trim();
    if (!e) return;
    if (!isValidEmail(e)) { toast.error('Email invalide.'); return; }
    if (schedule.recipients.includes(e)) { setEmailInput(''); return; }
    patch({ recipients: [...schedule.recipients, e] });
    setEmailInput('');
  };
  const removeEmail = (e: string) => patch({ recipients: schedule.recipients.filter((r) => r !== e) });

  const onSave = async () => {
    if (schedule.enabled && validRecipients.length === 0) { toast.error(L.noRecipients); return; }
    setSaving(true);
    try {
      const saved = await saveSchedule(schedule);
      setSchedule(saved);
      toast.success('Planification enregistrée.');
    } catch (err: any) {
      toast.error(err?.message || 'Échec de l\'enregistrement.');
    } finally { setSaving(false); }
  };

  const onSendNow = async () => {
    if (validRecipients.length === 0) { toast.error(L.noRecipients); return; }
    setSending(true);
    try {
      await sendTestReport(validRecipients, schedule.frequency);
      toast.success(`Rapport envoyé à ${validRecipients.length} destinataire(s).`);
    } catch (err: any) {
      toast.error(err?.message || 'Échec de l\'envoi.');
    } finally { setSending(false); }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="p-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}>
          <Mail className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>{L.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{L.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Synthèse (aperçu) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Kpi eyebrow={L.ca} value={fcfa(m.ca)} unit="FCFA" delta={delta.ca} icon={<Landmark className="w-5 h-5" />} />
            <Kpi eyebrow={L.resultatNet} value={fcfa(m.resultatNet)} unit="FCFA" delta={delta.res}
              icon={resultPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              accent={resultPositive ? 'var(--color-success)' : 'var(--color-error)'} />
            <Kpi eyebrow={L.treasury} value={fcfa(m.treasury)} unit="FCFA" icon={<Wallet className="w-5 h-5" />} />
            <Kpi eyebrow={L.marge} value={`${m.margeNette.toFixed(1).replace('.', ',')} %`} icon={<Percent className="w-5 h-5" />} />
          </div>

          <div className="rounded-xl p-4 border flex items-start gap-3" style={{ background: 'var(--color-card-bg, var(--color-surface))', borderColor: 'var(--color-border)' }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              L'email envoyé reprend ces indicateurs de l'exercice {period.from ? period.from.slice(0, 4) : fyYear}, avec la
              tendance sur 6 mois, le score de santé financière et le top clients — au format HTML, optimisé pour la lecture sur mobile.
              {m.count === 0 && ' Aucune écriture comptabilisée pour l\'instant : les indicateurs se rempliront dès les premières saisies validées.'}
            </p>
          </div>
        </div>

        {/* ── Panneau de programmation ── */}
        <aside className="rounded-xl border overflow-hidden self-start" style={{ background: 'var(--color-card-bg, var(--color-surface))', borderColor: 'var(--color-border)' }}>
          <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> {L.scheduleTitle}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{L.scheduleSub}</p>
          </div>

          <div className="p-5 space-y-5" style={{ opacity: loadingSchedule ? 0.6 : 1 }}>
            {/* Fréquence */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{L.frequency}</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(['weekly', 'monthly'] as ReportFrequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => patch({ frequency: f })}
                    className="px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
                    style={schedule.frequency === f
                      ? { background: 'var(--color-primary)', color: 'var(--color-text-inverse, #fff)', borderColor: 'var(--color-primary)' }
                      : { background: 'var(--color-background)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                  >
                    {f === 'weekly' ? L.weekly : L.monthly}
                  </button>
                ))}
              </div>
            </div>

            {/* Jour + heure */}
            <div className="grid grid-cols-2 gap-3">
              {schedule.frequency === 'weekly' ? (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{L.weekdayLabel}</label>
                  <select value={schedule.weekday} onChange={(e) => patch({ weekday: Number(e.target.value) })}
                    className="mt-2 w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                    {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{L.monthDayLabel}</label>
                  <select value={schedule.month_day} onChange={(e) => patch({ month_day: Number(e.target.value) })}
                    className="mt-2 w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}><Clock className="w-3 h-3" /> {L.hourLabel}</label>
                <select value={schedule.send_hour} onChange={(e) => patch({ send_hour: Number(e.target.value) })}
                  className="mt-2 w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h00</option>)}
                </select>
              </div>
            </div>

            {/* Destinataires */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}><Users className="w-3 h-3" /> {L.recipients}</label>
              <div className="flex gap-2 mt-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                  placeholder={L.addEmail}
                  className="flex-1 px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
                <button type="button" onClick={addEmail} className="px-3 rounded-lg" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse, #fff)' }} aria-label="Ajouter">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {schedule.recipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {schedule.recipients.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium border"
                      style={{ background: 'var(--color-background)', borderColor: isValidEmail(e) ? 'var(--color-border)' : 'var(--color-error)', color: 'var(--color-text-primary)' }}>
                      {e}
                      <button type="button" onClick={() => removeEmail(e)} className="p-0.5 rounded-full hover:opacity-70" aria-label={`Retirer ${e}`}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              {schedule.recipients.length === 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{L.noRecipients}</p>
              )}
            </div>

            {/* Activer */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{L.enable}</span>
              <button
                type="button"
                role="switch"
                aria-checked={schedule.enabled}
                onClick={() => patch({ enabled: !schedule.enabled })}
                className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                style={{ background: schedule.enabled ? 'var(--color-success)' : 'var(--color-border)' }}
              >
                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: schedule.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
            </label>

            {/* Statut */}
            {schedule.enabled && (
              <div className="rounded-lg p-3 text-xs space-y-1 border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <div className="flex items-center justify-between"><span>{L.nextRun}</span><span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{fmtDate(schedule.next_run_at)}</span></div>
                <div className="flex items-center justify-between"><span>{L.lastSent}</span><span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{fmtDate(schedule.last_sent_at)}</span></div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button type="button" onClick={onSave} disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse, #fff)' }}>
                <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : L.save}
              </button>
              <button type="button" onClick={onSendNow} disabled={sending || validRecipients.length === 0}
                className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border disabled:opacity-60"
                style={{ background: 'transparent', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
                <Send className="w-4 h-4" /> {sending ? 'Envoi…' : L.sendNow}
              </button>
            </div>

            <p className="text-[11px] leading-relaxed flex items-start gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
              L'envoi programmé fonctionne en mode SaaS. L'email est généré côté serveur à partir de vos écritures comptabilisées.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ExecutiveDigest;
