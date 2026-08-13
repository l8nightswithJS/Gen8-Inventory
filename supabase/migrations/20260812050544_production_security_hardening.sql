REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

ALTER FUNCTION public.assign_g8_item_barcode()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.assign_g8_location_barcode()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.assign_g8_receipt_number()
  SET search_path = pg_catalog, public;

DROP INDEX IF EXISTS public.client_import_templates_client_idx;

CREATE INDEX IF NOT EXISTS client_import_templates_default_location_id_idx
  ON public.client_import_templates (default_location_id)
  WHERE default_location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS receipts_received_by_user_id_idx
  ON public.receipts (received_by_user_id)
  WHERE received_by_user_id IS NOT NULL;
