CREATE INDEX IF NOT EXISTS item_barcodes_item_client_idx
  ON public.item_barcodes (item_id, client_id);
