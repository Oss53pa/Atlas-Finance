-- Inventaire physique des articles gérés par n° de série : on stocke la liste des
-- n° de série physiquement trouvés lors du comptage. La validation en déduit les
-- manquants (→ sortie 702 par n°) et les excédents (→ entrée 701 par n°).
alter table public.stock_count_lines
  add column if not exists counted_serials text[];
