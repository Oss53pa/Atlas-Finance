-- BUG CORRIGÉ : protect_posted_entries() faisait RETURN NEW sur un trigger
-- BEFORE DELETE. En DELETE, NEW est NULL → la suppression était SILENCIEUSEMENT
-- annulée pour toute écriture non 'posted'. Conséquences :
--   • impossible de supprimer une écriture (0 ligne affectée, sans erreur) ;
--   • la réinitialisation / le ré-import « remplacer » n'effaçaient jamais les
--     anciennes écritures → empilement des lots de migration.
-- Correctif : RETURN OLD sur DELETE, en conservant le blocage des 'posted'.
CREATE OR REPLACE FUNCTION public.protect_posted_entries()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'posted' THEN
      RAISE EXCEPTION 'Suppression interdite - ecriture comptabilisee (SYSCOHADA Art. 19)';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Modification du statut interdite - ecriture comptabilisee. Utilisez une contrepassation.';
    END IF;
    IF ROW(NEW.journal, NEW.date, NEW.entry_number, NEW.label)
        IS DISTINCT FROM ROW(OLD.journal, OLD.date, OLD.entry_number, OLD.label) THEN
      RAISE EXCEPTION 'Modification interdite - ecriture comptabilisee (SYSCOHADA Art. 19)';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
