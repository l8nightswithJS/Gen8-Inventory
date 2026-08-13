const pool = require('../db/pool');
const { loadClientSettings } = require('./_profileSettings');

function spreadsheetSafe(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csv(value) {
  return `"${spreadsheetSafe(value).replace(/"/g, '""')}"`;
}

exports.exportItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const [settings, result] = await Promise.all([
      loadClientSettings(clientId),
      pool.query(
        `SELECT
           item.*,
           COALESCE(SUM(inventory.quantity), 0)::numeric AS total_quantity,
           COALESCE(
             string_agg(DISTINCT location.code, ', ' ORDER BY location.code),
             ''
           ) AS inventory_location
         FROM items AS item
         LEFT JOIN inventory ON inventory.item_id = item.id
         LEFT JOIN locations AS location ON location.id = inventory.location_id
         WHERE item.client_id = $1
           AND item.archived_at IS NULL
         GROUP BY item.id
         ORDER BY item.part_number, item.lot_number, item.id`,
        [clientId],
      ),
    ]);

    const coreHeaders = [
      'barcode',
      'part_number',
      'name',
      'description',
      'lot_number',
      'vendor_barcode',
      'inventory_location',
      'initial_quantity',
      'total_quantity',
      'uom',
      'container_status',
      'review_status',
    ];
    const customHeaders = Array.from(
      new Set(result.rows.flatMap((item) => Object.keys(item.attributes || {}))),
    ).sort();
    const headers = [...coreHeaders, ...customHeaders];
    const lines = [headers.map(csv).join(',')];

    result.rows.forEach((item) => {
      const row = headers.map((header) => {
        if (header === 'uom') return item.uom || settings.default_uom || '';
        if (customHeaders.includes(header)) return item.attributes?.[header] ?? '';
        return item[header] ?? '';
      });
      lines.push(row.map(csv).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inventory_${clientId}_${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return res.send(lines.join('\n'));
  } catch (error) {
    return next(error);
  }
};

module.exports._test = { csv, spreadsheetSafe };
