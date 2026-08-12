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

function validIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function normalizeDate(value) {
  const raw = cleanText(value);
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim();

  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) return validIsoDate(match[1], match[2], match[3]);

  match = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) return validIsoDate(match[1], match[2], match[3]);

  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = match[3];
    if (first > 12 && second <= 12) return validIsoDate(year, second, first);
    if (second > 12 && first <= 12) return validIsoDate(year, first, second);
    return null;
  }

  match = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = match[3];
    if (first > 12 && second <= 12) return validIsoDate(year, second, first);
    if (second > 12 && first <= 12) return validIsoDate(year, first, second);
    return null;
  }

  return null;
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
Return all dates as YYYY-MM-DD only when the date is unambiguous from the document. If a numeric date could reasonably be interpreted in more than one order, return null instead of guessing. If packaging such as 20 CTNS x 100 EA or 4 Gaylords x 550 LB is explicitly shown, capture container_count and quantity_per_container. Do not divide totals unless the document supports the packaging split. If punctuation makes a number ambiguous, return null instead of guessing.`;
}

function normalizeExtractedData(raw) {
  const rawReceivedDate = cleanText(raw?.received_date);
  const receivedDate = normalizeDate(rawReceivedDate);
  const warnings = [];
  if (rawReceivedDate && !receivedDate) {
    warnings.push(`Received date "${rawReceivedDate}" needs manual confirmation.`);
  }

  return {
    document_type: normalizeDocumentType(raw?.document_type),
    supplier_name: cleanText(raw?.supplier_name),
    po_number: cleanText(raw?.po_number),
    packing_slip_number: cleanText(raw?.packing_slip_number),
    coc_number: cleanText(raw?.coc_number),
    received_date: receivedDate,
    extraction_warnings: warnings,
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
      manufacture_date: normalizeDate(line?.manufacture_date),
      expiration_date: normalizeDate(line?.expiration_date),
      source_text: cleanText(line?.source_text),
      confidence: line?.confidence && typeof line.confidence === 'object' ? line.confidence : {},
    })),
  };
}

function isTransientGeminiError(error) {
  const status = Number(error?.response?.status || 0);
  const message = String(
    error?.response?.data?.error?.message || error?.message || '',
  ).toLowerCase();
  return [408, 429, 500, 502, 503, 504].includes(status)
    || message.includes('deadline')
    || message.includes('temporarily unavailable')
    || message.includes('timeout')
    || message.includes('timed out');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const requestBody = {
    contents: [{ parts: [
      { inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } },
      { text: extractionPrompt() },
    ] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };

  let response;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        requestBody,
        {
          timeout: 90000,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          maxContentLength: 60 * 1024 * 1024,
          maxBodyLength: 60 * 1024 * 1024,
        },
      );
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 0 && isTransientGeminiError(error)) {
        await wait(750);
        continue;
      }
      throw error;
    }
  }
  if (!response) throw lastError || new Error('Document extraction failed.');

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
  normalizeDate,
  normalizeDocumentType,
  normalizeExtractedData,
  normalizeProfile,
  numberOrNull,
};
