const axios = require('axios');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  const plain = /^\d+(?:\.\d{1,3})?$/;
  const thousands = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,3})?$/;
  const normalized = thousands.test(raw)
    ? raw.replace(/,/g, '')
    : plain.test(raw)
      ? raw
      : null;
  if (normalized === null) return null;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function integerOrNull(value) {
  const number = numberOrNull(value);
  return number !== null && Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeDocumentType(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  return ['packing_slip', 'coc', 'invoice', 'label'].includes(normalized)
    ? normalized
    : 'other';
}

function normalizeProfile(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['resin', 'molded_parts', 'genmark_components', 'general'].includes(normalized)
    ? normalized
    : 'general';
}

function extractJson(text) {
  const source = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = source.indexOf('{');
  const last = source.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('Document extraction did not return structured JSON.');
  return JSON.parse(source.slice(first, last + 1));
}

function extractionPrompt() {
  return `Extract incoming manufacturing-material receiving data from this document. Return JSON only. Never invent missing identifiers or quantities; use null when not visible.
{
  "document_type":"packing_slip|coc|invoice|label|other",
  "supplier_name":null,
  "po_number":null,
  "packing_slip_number":null,
  "coc_number":null,
  "received_date":null,
  "lines":[{
    "part_number":null,
    "manufacturer_part_number":null,
    "vendor_item_number":null,
    "name":null,
    "description":null,
    "manufacturer":null,
    "lot_number":null,
    "batch_number":null,
    "quantity":null,
    "uom":null,
    "container_count":null,
    "quantity_per_container":null,
    "package_type":null,
    "profile_hint":"resin|molded_parts|genmark_components|general",
    "color":null,
    "additive":null,
    "manufacture_date":null,
    "expiration_date":null,
    "source_text":null,
    "confidence":{"part_number":"high|medium|low|unknown","lot_number":"high|medium|low|unknown","quantity":"high|medium|low|unknown","uom":"high|medium|low|unknown","container_count":"high|medium|low|unknown"}
  }]
}
If packaging such as 20 CTNS x 100 EA or 4 Gaylords x 550 LB is explicitly shown, capture container_count and quantity_per_container. Do not divide totals unless the document supports the packaging split. If punctuation makes a number ambiguous, return null instead of guessing.`;
}

function normalizeExtractedData(raw) {
  return {
    document_type: normalizeDocumentType(raw?.document_type),
    supplier_name: cleanText(raw?.supplier_name),
    po_number: cleanText(raw?.po_number),
    packing_slip_number: cleanText(raw?.packing_slip_number),
    coc_number: cleanText(raw?.coc_number),
    received_date: cleanText(raw?.received_date),
    lines: (Array.isArray(raw?.lines) ? raw.lines : []).map((line) => ({
      part_number: cleanText(line?.part_number),
      manufacturer_part_number: cleanText(line?.manufacturer_part_number),
      vendor_item_number: cleanText(line?.vendor_item_number),
      name: cleanText(line?.name),
      description: cleanText(line?.description),
      manufacturer: cleanText(line?.manufacturer),
      lot_number: cleanText(line?.lot_number),
      batch_number: cleanText(line?.batch_number),
      quantity: numberOrNull(line?.quantity),
      uom: cleanText(line?.uom),
      container_count: integerOrNull(line?.container_count),
      quantity_per_container: numberOrNull(line?.quantity_per_container),
      package_type: cleanText(line?.package_type),
      profile_hint: normalizeProfile(line?.profile_hint),
      color: cleanText(line?.color),
      additive: cleanText(line?.additive),
      manufacture_date: cleanText(line?.manufacture_date),
      expiration_date: cleanText(line?.expiration_date),
      source_text: cleanText(line?.source_text),
      confidence: line?.confidence && typeof line.confidence === 'object' ? line.confidence : {},
    })),
  };
}

async function extractReceivingDocument(file) {
  if (!file || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error('Supported receiving documents are PDF, JPEG, PNG, or WebP.');
    error.status = 400;
    throw error;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  if (!apiKey) {
    const error = new Error('Smart document extraction is not configured on the Inventory service.');
    error.status = 503;
    throw error;
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      contents: [{ parts: [
        { inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } },
        { text: extractionPrompt() },
      ] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    },
    {
      timeout: 90000,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      maxContentLength: 60 * 1024 * 1024,
      maxBodyLength: 60 * 1024 * 1024,
    },
  );

  const text = response.data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('\n');
  return { model, data: normalizeExtractedData(extractJson(text)) };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  cleanText,
  extractJson,
  extractReceivingDocument,
  integerOrNull,
  normalizeDocumentType,
  normalizeExtractedData,
  normalizeProfile,
  numberOrNull,
};
