const { createClient } = require('@supabase/supabase-js');

function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function storeReceivingDocument(file, clientId, documentId) {
  const supabase = getStorageClient();
  if (!supabase) {
    return {
      bucket: null,
      path: null,
      warning: 'Original-document storage is not configured on the Inventory service.',
    };
  }

  const safeName = String(file.originalname || 'document')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-120);
  const path = `${clientId}/${new Date().toISOString().slice(0, 10)}/${documentId}-${safeName}`;
  const { error } = await supabase.storage
    .from('receiving-documents')
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) {
    return {
      bucket: null,
      path: null,
      warning: `Original document could not be stored: ${error.message}`,
    };
  }
  return { bucket: 'receiving-documents', path, warning: null };
}

module.exports = { storeReceivingDocument };
