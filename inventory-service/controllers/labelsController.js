// inventory-service/controllers/labelsController.js
const net = require('net');
const pool = require('../db/pool');

// ====== ENV CONFIG (with safe defaults) ======
const PRINTER_HOST = process.env.ZEBRA_HOST || process.env.PRINTER_HOST;
const PRINTER_PORT = Number(
  process.env.ZEBRA_PORT || process.env.PRINTER_PORT || 9100,
);
const LABEL_WIDTH = Number(process.env.ZPL_LABEL_WIDTH || 812);
const LABEL_HEIGHT = Number(process.env.ZPL_LABEL_HEIGHT || 406);
const COPIES = Math.max(1, Number(process.env.ZPL_COPIES || 1));
const BATCH_SIZE = Number(process.env.PRINT_BATCH_SIZE || 100);

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
  return String(str).replace(/[\^~\\]/g, ' ');
}

function fbBlock(text, widthDots, maxLines, lineSpace) {
  return `^FB${widthDots},${maxLines},${lineSpace},L,0^FD${escapeZpl(text)}^FS`;
}

function normalizeItemIds(rawIds) {
  if (!Array.isArray(rawIds)) return [];
  return rawIds
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));
}

// ====== ZPL & PRINTER LOGIC ======
function buildLabelZpl({ clientName, item }) {
  const a = item.attributes || {};
  const part = item.part_number || a.part_number || '';
  const desc = item.description || item.name || a.description || a.name || '';
  const barcode = item.barcode || a.barcode || part || String(item.id);
  const onHand = item.total_quantity ?? quantityFrom(a);
  const loc = item.location || a.location || '';
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

function buildZplPayload(rows) {
  return rows
    .map((row) => {
      const base = buildLabelZpl(row);
      return COPIES <= 1
        ? base
        : Array.from({ length: COPIES }, () => base).join('');
    })
    .join('');
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

  const payload = buildZplPayload(rows);
  if (!payload) return;
  await sendZplRaw(payload, { host: PRINTER_HOST, port: PRINTER_PORT });
}

async function getClient(clientId) {
  const clientResult = await pool.query(
    'SELECT id, name FROM clients WHERE id = $1',
    [clientId],
  );
  return clientResult.rows[0] || null;
}

async function getAllRowsForClient(clientId, clientName) {
  const rows = [];
  let page = 0;

  while (true) {
    const result = await pool.query(
      `SELECT
         i.*,
         COALESCE(SUM(inv.quantity), 0)::int AS total_quantity
       FROM items i
       LEFT JOIN inventory inv ON inv.item_id = i.id
       WHERE i.client_id = $1
       GROUP BY i.id
       ORDER BY i.id ASC
       OFFSET $2 LIMIT $3`,
      [clientId, page * BATCH_SIZE, BATCH_SIZE],
    );

    if (!result.rows.length) break;
    rows.push(
      ...result.rows.map((item) => ({
        clientName,
        item,
      })),
    );
    page += 1;
  }

  return rows;
}

async function getRowsForSelected(ids) {
  const rows = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const result = await pool.query(
      `SELECT
         i.*,
         c.name AS client_name,
         COALESCE(SUM(inv.quantity), 0)::int AS total_quantity
       FROM items i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN inventory inv ON inv.item_id = i.id
       WHERE i.id = ANY($1::int[])
       GROUP BY i.id, c.name
       ORDER BY i.id ASC`,
      [batch],
    );

    rows.push(
      ...result.rows.map((item) => ({
        clientName: item.client_name || '',
        item,
      })),
    );
  }

  return rows;
}

// ====== LOCAL BROWSER PRINT CONTROLLERS ======
// These endpoints do not contact a printer. They return ZPL to the authenticated
// browser, which can send it to a Zebra connected to that workstation through
// Zebra Browser Print.

// @desc Build all labels for a client and return ZPL
// @route POST /api/labels/zpl/all
exports.getAllZplForClient = async (req, res, next) => {
  try {
    const clientId = parseInt(req.body.client_id ?? req.query.client_id, 10);
    if (Number.isNaN(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const client = await getClient(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const rows = await getAllRowsForClient(clientId, client.name);
    const zpl = buildZplPayload(rows);

    return res.json({
      ok: true,
      count: rows.length,
      copies: COPIES,
      jobName: `Client ${client.name}`,
      zpl,
      message:
        rows.length > 0
          ? 'Labels ready for local printing.'
          : 'No items to print.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc Build selected labels and return ZPL
// @route POST /api/labels/zpl/selected
exports.getSelectedZpl = async (req, res, next) => {
  try {
    const ids = normalizeItemIds(req.body.item_ids);
    if (!ids.length) {
      return res.status(400).json({ message: 'item_ids array is required' });
    }

    const rows = await getRowsForSelected(ids);
    const zpl = buildZplPayload(rows);

    return res.json({
      ok: true,
      count: rows.length,
      copies: COPIES,
      jobName: `Selected (${rows.length})`,
      zpl,
      message:
        rows.length > 0
          ? 'Labels ready for local printing.'
          : 'No items found for the given IDs.',
    });
  } catch (err) {
    next(err);
  }
};

// ====== LEGACY / NETWORK PRINT CONTROLLERS ======
// Retained as a fallback for sites that intentionally expose a Zebra to the
// inventory service over TCP 9100.

// @desc Print all labels for a given client
// @route POST /api/labels/print/all
exports.printAllForClient = async (req, res, next) => {
  try {
    const clientId = parseInt(req.body.client_id ?? req.query.client_id, 10);
    if (Number.isNaN(clientId)) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const client = await getClient(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const rows = await getAllRowsForClient(clientId, client.name);
    await printRowsAsZpl(rows);

    res.json({
      ok: true,
      count: rows.length,
      copies: COPIES,
      jobName: `Client ${client.name}`,
      message: rows.length > 0 ? 'Print job completed.' : 'No items to print.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc Print labels for selected items
// @route POST /api/labels/print/selected
exports.printSelected = async (req, res, next) => {
  try {
    const ids = normalizeItemIds(req.body.item_ids);
    if (!ids.length) {
      return res.status(400).json({ message: 'item_ids array is required' });
    }

    const rows = await getRowsForSelected(ids);
    await printRowsAsZpl(rows);

    res.json({
      ok: true,
      count: rows.length,
      copies: COPIES,
      jobName: `Selected (${rows.length})`,
      message:
        rows.length > 0
          ? 'Print job completed.'
          : 'No items found for the given IDs.',
    });
  } catch (err) {
    next(err);
  }
};
