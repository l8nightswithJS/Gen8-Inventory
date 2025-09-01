// inventory-service/controllers/labelsController.js
const net = require('net');
const supabase = require('../lib/supabaseClient');

// ====== ENV CONFIG (with safe defaults) ======
const PRINTER_HOST = process.env.ZEBRA_HOST || process.env.PRINTER_HOST;
const PRINTER_PORT = Number(
  process.env.ZEBRA_PORT || process.env.PRINTER_PORT || 9100,
);
const LABEL_WIDTH = Number(process.env.ZPL_LABEL_WIDTH || 812);
const LABEL_HEIGHT = Number(process.env.ZPL_LABEL_HEIGHT || 406);
const COPIES = Math.max(1, Number(process.env.ZPL_COPIES || 1));
const BATCH_SIZE = Number(process.env.PRINT_BATCH_SIZE || 100); // Batch size for printing

// ====== SMALL HELPERS (Unchanged) ======
const QTY_KEYS = ['quantity', 'on_hand', 'qty_in_stock', 'stock'];

function quantityFrom(attrs = {}) {
  for (const k of QTY_KEYS) {
    const v = attrs[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

function escapeZpl(str = '') {
  return String(str).replace(/[\^~\\]/g, ' ');
}

function fbBlock(text, widthDots, maxLines, lineSpace) {
  return `^FB${widthDots},${maxLines},${lineSpace},L,0^FD${escapeZpl(text)}^FS`;
}

// ====== ZPL & PRINTER LOGIC (Unchanged) ======
function buildLabelZpl({ clientName, item }) {
  const a = item.attributes || {};
  const part = a.part_number || '';
  const desc = a.description || '';
  const barcode = a.barcode || a.part_number || String(item.id);
  const onHand = quantityFrom(a);
  const loc = a.location || '';
  const pad = 24;
  const textW = LABEL_WIDTH - pad * 2 - 320;
  const y1 = 20;
  const y2 = 70;
  const y3 = 140;
  const bcx = LABEL_WIDTH - 300;
  const bcy = 30;

  return [
    '^XA',
    `^PW${LABEL_WIDTH}`,
    `^LL${LABEL_HEIGHT}`,
    '^LH0,0',
    '^CI28',
    `^FO${pad},${y1}^A0N,44,44^FD${escapeZpl(part)}^FS`,
    `^FO${pad},${y2}^A0N,28,28${fbBlock(desc, textW, 2, 4)}`,
    `^FO${pad},${y3}^A0N,24,24^FDClient: ${escapeZpl(clientName || '')}^FS`,
    `^FO${pad},${y3 + 28}^A0N,24,24^FDOn Hand: ${escapeZpl(onHand)}^FS`,
    `^FO${pad},${y3 + 56}^A0N,24,24^FDLoc: ${escapeZpl(loc)}^FS`,
    '^BY2,2,120',
    `^FO${bcx},${bcy}^BCN,120,Y,N,N`,
    `^FD${escapeZpl(barcode)}^FS`,
    `^FO${pad},${LABEL_HEIGHT - 28}^A0N,20,20^FDItem ID: ${item.id}^FS`,
    '^XZ',
  ].join('');
}

function sendZplRaw(zpl, { host, port }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    socket.setTimeout(10000);
    socket.on('connect', () => {
      socket.write(zpl, 'utf8', () => socket.end());
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

async function printRowsAsZpl(rows) {
  if (!PRINTER_HOST || !PRINTER_PORT) {
    const e = new Error(
      'Printer not configured. Set ZEBRA_HOST and ZEBRA_PORT.',
    );
    e.status = 500;
    throw e;
  }
  const payload = rows
    .map((r) => {
      const base = buildLabelZpl(r);
      return COPIES <= 1
        ? base
        : Array.from({ length: COPIES }, () => base).join('');
    })
    .join('');

  if (!payload) return;
  await sendZplRaw(payload, { host: PRINTER_HOST, port: PRINTER_PORT });
}

// ====== REFACTORED CONTROLLERS ======
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
    if (!client) {
      const e = new Error('Client not found');
      e.status = 404;
      throw e;
    }

    let page = 0;
    let totalPrinted = 0;

    while (true) {
      const { data: items, error } = await supabase
        .from('items')
        .select('id, client_id, attributes')
        .eq('client_id', clientId)
        .order('id', { ascending: true })
        .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);

      if (error) throw error;
      if (!items || items.length === 0) break;

      const rows = items.map((it) => ({ clientName: client.name, item: it }));
      await printRowsAsZpl(rows);

      totalPrinted += items.length;
      page++;
    }

    res.json({
      ok: true,
      count: totalPrinted,
      copies: COPIES,
      jobName: `Client ${client.name}`,
      message: totalPrinted > 0 ? 'Print job completed.' : 'No items to print.',
    });
  } catch (err) {
    next(err);
  }
};

exports.printSelected = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.item_ids)
      ? req.body.item_ids
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id))
      : [];
    if (!ids.length) {
      const e = new Error('item_ids array is required');
      e.status = 400;
      throw e;
    }

    const idBatches = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      idBatches.push(ids.slice(i, i + BATCH_SIZE));
    }

    let totalPrinted = 0;
    let clientName = '';

    for (const batch of idBatches) {
      const { data: items, error } = await supabase
        .from('items')
        .select('id, client_id, attributes, clients(name)')
        .in('id', batch);

      if (error) throw error;
      if (!items || items.length === 0) continue;

      if (!clientName && items[0].clients) {
        clientName = items[0].clients.name || '';
      }

      const rows = items.map((it) => ({
        clientName: it.clients?.name || clientName,
        item: it,
      }));
      await printRowsAsZpl(rows);
      totalPrinted += items.length;
    }

    res.json({
      ok: true,
      count: totalPrinted,
      copies: COPIES,
      jobName: `Selected (${totalPrinted})`,
      message:
        totalPrinted > 0
          ? 'Print job completed.'
          : 'No items found for the given IDs.',
    });
  } catch (err) {
    next(err);
  }
};
