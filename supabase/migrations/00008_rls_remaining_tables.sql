-- RLS policies for all new tables (company_id isolation)

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'closure_sessions', 'provisions', 'exchange_rates', 'hedging_positions',
    'revision_items', 'fixed_assets', 'budget_lines', 'inventory_items'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- SELECT: users can only read their company's data
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      )',
      'select_' || t, t
    );

    -- INSERT: users can only insert for their company
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      )',
      'insert_' || t, t
    );

    -- UPDATE: users can only update their company's data
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      )',
      'update_' || t, t
    );

    -- DELETE: users can only delete their company's data
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      )',
      'delete_' || t, t
    );
  END LOOP;
END $$;
