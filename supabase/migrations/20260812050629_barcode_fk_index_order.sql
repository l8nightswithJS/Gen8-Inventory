DROP INDEX IF EXISTS public.item_barcodes_item_client_idx;

CREATE INDEX IF NOT EXISTS item_barcodes_client_item_idx
  ON public.item_barcodes (client_id, item_id);
