const pool = require('../db/pool');

const LABEL_WIDTH = Number(process.env.ZPL_LABEL_WIDTH || 812);
const LABEL_HEIGHT = Number(process.env.ZPL_LABEL_HEIGHT || 406);
const COPIES = Math.max(1, Number(process.env.ZPL_COPIES || 1));
const BATCH_SIZE = Math.max(1, Number(process.env.PRINT_BATCH_SIZE || 100));

function escapeZpl(value = '') {
  return String(value).replace(/[\^~\\]/g, ' ');
}

function fbBlock(text, widthDots, maxLines, lineSpace) {
  return `^FB${widthDots},${maxLines},${lineSpace},L,0^FD${escapeZpl(text)}^FS`;
}

function buildContainerLabelZpl({ clientName, item }) {
  const pad = 24;
  const textWidth = LABEL_WIDTH - pad * 2 - 315;
  const part = item.part_number || item.name || item.description || `Item ${item.id}`;
  const description = item.description || item.name || '';
  const lot = item.lot_number || 'N/A';
  const barcode = item.barcode || String(item.id);
  const location = item.inventory_location || 'UNASSIGNED';
  const quantity = item.total_quantity == null ? '' : item.total_quantity;
  const uom = item.uom || '';

  return [
    '^XA',
    `^PW${LABEL_WIDTH}`,
    `^LL${LABEL_HEIGHT}`,
    '^LH0,0',
    '^CI28',
    `^FO${pad},20^A0N,42,42^FD${escapeZpl(part)}^FS`,
    `^FO${pad},68^A0N,25,25${fbBlock(description, textWidth, 2, 3)}`,
    `^FO${pad},138^A0N,23,23^FDLot: ${escapeZpl(lot)}^FS`,
    `^FO${pad},168^A0N,23,23^FDQty: ${escapeZpl(quantity)} ${escapeZpl(uom)}^FS`,
    `^FO${pad},198^A0N,23,23^FDLoc: ${escapeZpl(location)}^FS`,
    `^FO${pad},228^A0N,21,21^FDClient: ${escapeZpl(clientName || '')}^FS`,
    '^BY2,2,118',
    `^FO${LABEL_WIDTH - 300},34^BCN,118,Y,N,N`,
    `^FD${escapeZpl(barcode)}^FS`,
    `^FO${pad},${LABEL_HEIGHT - 34}^A0N,20,20^FDContainer: ${escapeZpl(barcode)}^FS`,
    '^XZ',
  ].join('');
}

function buildLocationLabelZpl(location) {
  const code = location.code || '';
  const barcode = location.barcode || code;
  const description = location.description || '';
  const hierarchy = [
    location.zone ? `Zone ${location.zone}` : '',
    location.rack ? `Rack ${location.rack}` : '',
    location.shelf ? `Shelf ${location.shelf}` : '',
    location.bin_position ? `Bin ${location.bin_position}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return [
    '^XA',
    `^PW${LABEL_WIDTH}`,
    `^LL${LABEL_HEIGHT}`,
    '^LH0,0',
    '^CI28',
    `^FO20,22^A0N,56,56^FD${escapeZpl(code)}^FS`,
    `^FO20,86^A0N,28,28${fbBlock(description, LABEL_WIDTH - 40, 2, 3)}`,
    `^FO20,150^A0N,24,24^FD${escapeZpl(hierarchy)}^FS`,
    '^BY3,2,125',
    `^FO80,205^BCN,125,Y,N,N`,
    `^FD${escapeZpl(barcode)}^FS`,
    '^XZ',
  ].join('');
}

function buildLocalPrintJob(labels) {
  const zpl = labels
    .flatMap((label) => Array.from({ length: COPIES }, () => label))
    .join('');
  return {
    zpl,
    label_count: labels.length,
    copy_count: labels.length * COPIES,
  };
}

function localPrintResponse(jobs, totalLabels, message) {
  return {
    ok: true,
    print_mode: 'local_windows_spooler',
    count: totalLabels,
    copies: COPIES,
    jobs,
    message,
  };
}

async function fetchContainerRows({ clientId = null, ids = null, offset = 0, limit = BATCH_SIZE }) {
  const conditions = ['item.archived_at IS NULL'];
  const values = [];

  if (clientId) {
    values.push(clientId);
    conditions.push(`item.client_id = $${values.length}`);
  }
  if (ids) {
    values.push(ids);
    conditions.push(`item.id = ANY($${values.length}::bigint[])`);
  }

  values.push(offset, limit);
  return pool.query(
    `SELECT
       item.id,
       item.client_id,
       item.part_number,
       item.name,
       item.description,
       item.lot_number,
       item.barcode,
       item.uom,
       item.container_status,
       client.name AS client_name,
       COALESCE(SUM(inventory.quantity), 0)::numeric AS total_quantity,
       COALESCE(
         string_agg(DISTINCT location.code, ', ' ORDER BY location.code),
         ''
       ) AS inventory_location
     FROM items AS item
     JOIN clients AS client ON client.id = item.client_id
     LEFT JOIN inventory ON inventory.item_id = item.id
     LEFT JOIN locations AS location ON location.id = inventory.location_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY item.id, client.id
     ORDER BY item.id
     OFFSET $${values.length - 1}
     LIMIT $${values.length}`,
    values,
  );
}

exports.printAllForClient = async (req, res, next) => {
  try {
    const clientId = Number(req.body?.client_id ?? req.query?.client_id);
    if (!Number.isSafeInteger(clientId) || clientId < 1) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    let offset = 0;
    let totalLabels = 0;
    const jobs = [];
    while (true) {
      const result = await fetchContainerRows({ clientId, offset });
      if (!result.rows.length) break;
      const labels = result.rows.map((item) =>
        buildContainerLabelZpl({
          clientName: item.client_name,
          item,
        }),
      );
      jobs.push(buildLocalPrintJob(labels));
      totalLabels += labels.length;
      offset += result.rows.length;
    }

    return res.json(localPrintResponse(
      jobs,
      totalLabels,
      totalLabels
        ? 'Container labels are ready for the local Zebra printer.'
        : 'No active containers to print.',
    ));
  } catch (error) {
    return next(error);
  }
};

exports.printSelected = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.item_ids)
      ? req.body.item_ids
          .map(Number)
          .filter((id) => Number.isSafeInteger(id) && id > 0)
      : [];
    if (!ids.length) {
      return res.status(400).json({ message: 'item_ids array is required' });
    }

    let totalLabels = 0;
    const jobs = [];
    for (let index = 0; index < ids.length; index += BATCH_SIZE) {
      const batch = ids.slice(index, index + BATCH_SIZE);
      const result = await fetchContainerRows({ ids: batch, offset: 0, limit: batch.length });
      const labels = result.rows.map((item) =>
        buildContainerLabelZpl({
          clientName: item.client_name,
          item,
        }),
      );
      if (labels.length) jobs.push(buildLocalPrintJob(labels));
      totalLabels += labels.length;
    }

    return res.json(localPrintResponse(
      jobs,
      totalLabels,
      totalLabels
        ? 'Selected labels are ready for the local Zebra printer.'
        : 'No active containers found.',
    ));
  } catch (error) {
    return next(error);
  }
};

exports.printLocation = async (req, res, next) => {
  try {
    const id = Number(req.params?.id);
    const result = await pool.query(
      `SELECT id, code, description, barcode, location_type,
              zone, rack, shelf, bin_position, active
       FROM locations
       WHERE id = $1`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Location not found.' });
    }
    const job = buildLocalPrintJob([buildLocationLabelZpl(result.rows[0])]);
    return res.json(localPrintResponse(
      [job],
      1,
      `Location label ${result.rows[0].code} is ready for the local Zebra printer.`,
    ));
  } catch (error) {
    return next(error);
  }
};

module.exports._test = {
  buildContainerLabelZpl,
  buildLocalPrintJob,
  buildLocationLabelZpl,
  escapeZpl,
};
