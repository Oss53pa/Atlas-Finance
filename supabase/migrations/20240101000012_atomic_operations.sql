-- AF-T04: Atomic bulk import of exchange rates via RPC
-- Replaces non-atomic for..of loop in exchangeRateService.ts

CREATE OR REPLACE FUNCTION import_exchange_rates(
  p_rates JSONB,
  p_tenant_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_tid UUID;
BEGIN
  v_tid := COALESCE(p_tenant_id, current_setting('app.tenant_id', true)::UUID);

  FOR i IN 0..jsonb_array_length(p_rates) - 1 LOOP
    INSERT INTO exchange_rates (
      id, tenant_id, from_currency, to_currency, rate, date, provider, created_at
    )
    VALUES (
      gen_random_uuid(),
      v_tid,
      p_rates->i->>'fromCurrency',
      p_rates->i->>'toCurrency',
      (p_rates->i->>'rate')::NUMERIC,
      (p_rates->i->>'date')::DATE,
      COALESCE(p_rates->i->>'provider', 'import'),
      now()
    )
    ON CONFLICT (tenant_id, from_currency, to_currency, date)
    DO UPDATE SET rate = EXCLUDED.rate, provider = EXCLUDED.provider;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
