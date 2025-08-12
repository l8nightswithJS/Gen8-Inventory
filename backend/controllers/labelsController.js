// backend/controllers/labelsController.js
const net = require('net');
const supabase = require('../lib/supabaseClient');

// ====== ENV CONFIG (with safe defaults) ======
const PRINTER_HOST = process.env.ZEBRA_HOST || process.env.PRINTER_HOST; // e.g. 192.168.1.50
const PRINTER_PORT = Number(
  process.env.ZEBRA_PORT || process.env.PRINTER_PORT || 9100,
);

const LABEL_WIDTH = Number(process.env.ZPL_LABEL_WIDTH || 812); // dots (812 ≈ 4" @ 203dpi)
const LABEL_HEIGHT = Number(process.env.ZPL_LABEL_HEIGHT || 406); // dots (406 ≈ 2" @ 203dpi)
const COPIES = Math.max(1, Number(process.env.ZPL_COPIES || 1)); // default 1

// ====== SMALL HELPERS ======
const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];

function quantityFrom(attrs = {}) {
  for (const k of QTY_KEYS) {
    const v = attrs[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

function escapeZpl(str = '') {
  // Replace characters that can break ^FD (simple pass)
  return String(str).replace(/[\^~\\]/g, ' ');
}

function fbBlock(text, widthDots, maxLines, lineSpace) {
  // ^FB: Field Block (width in dots, max lines, line spacing, alignment L, hanging indent 0)
  return `^FB${widthDots},${maxLines},${lineSpace},L,0^FD${escapeZpl(text)}^FS`;
}

// Build ZPL for one item (simple clean layout; tweak env sizes if needed)
function buildLabelZpl({ clientName, item }) {
  const a = item.attributes || {};
  const part = a.part_number || '';
  const desc = a.description || '';
  const barcode = a.barcode || a.part_number || String(item.id);
  const onHand = quantityFrom(a);
  const loc = a.location || '';

  // Layout measurements
  const pad = 24;
  const textW = LABEL_WIDTH - pad * 2 - 320; // leave room on the right for barcode
  const y1 = 20; // part number
  const y2 = 70; // description
  const y3 = 140; // client/qty/location group
  const bcx = LABEL_WIDTH - 300; // barcode X
  const bcy = 30; // barcode Y

  return [
    '^XA',
    `^PW${LABEL_WIDTH}`,
    `^LL${LABEL_HEIGHT}`,
    '^LH0,0',
    '^CI28', // UTF-8 codepage where supported

    // Part Number (bold)
    `^FO${pad},${y1}^A0N,44,44^FD${escapeZpl(part)}^FS`,

    // Description (wrap to 2 lines)
    `^FO${pad},${y2}^A0N,28,28${fbBlock(desc, textW, 2, 4)}`,

    // Client / Qty / Location (single line each)
    `^FO${pad},${y3}^A0N,24,24^FDClient: ${escapeZpl(clientName || '')}^FS`,
    `^FO${pad},${y3 + 28}^A0N,24,24^FDOn Hand: ${escapeZpl(onHand)}^FS`,
    `^FO${pad},${y3 + 56}^A0N,24,24^FDLoc: ${escapeZpl(loc)}^FS`,

    // Right-side Code128 barcode + human-readable
    '^BY2,2,120', // module width, wide:narrow ratio, height
    `^FO${bcx},${bcy}^BCN,120,Y,N,N`,
    `^FD${escapeZpl(barcode)}^FS`,

    // Tiny footer with ItemId (debugging/tracking)
    `^FO${pad},${LABEL_HEIGHT - 28}^A0N,20,20^FDItem ID: ${item.id}^FS`,

    '^XZ',
  ].join('');
}

// Send ZPL to printer via TCP 9100
function sendZplRaw(zpl, { host, port }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    socket.setTimeout(10000);

    socket.on('connect', () => {
      socket.write(zpl, 'utf8', () => {
        socket.end();
      });
    });

    socket.on('timeout', () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error('Printer connection timed out'));
      }
    });

    socket.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    socket.on('close', () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });

    socket.connect(port, host);
  });
}

async function printRowsAsZpl(rows, jobName = '') {
  if (!PRINTER_HOST || !PRINTER_PORT) {
    const e = new Error(
      'Printer not configured. Set ZEBRA_HOST and ZEBRA_PORT (or PRINTER_HOST/PRINTER_PORT).',
    );
    e.status = 500;
    throw e;
  }
  // Build one big payload: copies × labels (concatenate ^XA…^XZ blocks)
  const payload = rows
    .map((r) => {
      const base = buildLabelZpl(r);
      if (COPIES <= 1) return base;
      return Array.from({ length: COPIES }, () => base).join('');
    })
    .join('');

  await sendZplRaw(payload, { host: PRINTER_HOST, port: PRINTER_PORT });
  return { ok: true, count: rows.length, copies: COPIES, jobName };
}

// ====== CONTROLLERS ======
exports.printAllForClient = async (req, res, next) => {
  try {
    const clientId = parseInt(req.body.client_id ?? req.query.client_id, 10);
    if (isNaN(clientId)) {
      const e = new Error('client_id is required');
      e.status = 400;
      throw e;
    }

    const { data: client, error: cErr } = await supabase
      .from('clients')
      .select('id,name')
      .eq('id', clientId)
      .single();
    if (cErr) throw cErr;

    const { data: items, error } = await supabase
      .from('items')
      .select('id, client_id, attributes')
      .eq('client_id', clientId)
      .order('id', { ascending: true });
    if (error) throw error;

    const rows = (items || []).map((it) => ({
      clientName: client?.name || String(clientId),
      item: it,
    }));

    if (!rows.length)
      return res.json({ ok: true, count: 0, message: 'No items' });

    const out = await printRowsAsZpl(
      rows,
      `Client ${client?.name || clientId}`,
    );
    res.json({ ok: true, ...out });
  } catch (err) {
    next(err);
  }
};

exports.printSelected = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.item_ids) ? req.body.item_ids : [];
    if (!ids.length) {
      const e = new Error('item_ids array is required');
      e.status = 400;
      throw e;
    }

    const { data: items, error } = await supabase
      .from('items')
      .select('id, client_id, attributes')
      .in('id', ids);
    if (error) throw error;
    if (!items || !items.length)
      return res.json({ ok: true, count: 0, message: 'No items' });

    // Lookup a client name for the job title (best-effort)
    let clientName = '';
    const firstClientId = items[0].client_id;
    if (firstClientId) {
      const { data: c, error: cErr } = await supabase
        .from('clients')
        .select('id,name')
        .eq('id', firstClientId)
        .single();
      if (!cErr && c) clientName = c.name || '';
    }

    const rows = items.map((it) => ({ clientName, item: it }));
    const out = await printRowsAsZpl(rows, `Selected (${rows.length})`);
    res.json({ ok: true, ...out });
  } catch (err) {
    next(err);
  }
};
