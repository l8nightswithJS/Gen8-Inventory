const pool = require('../db/pool');

function isCombinedLegacyLocation(code) {
  return /[,;/]/.test(String(code || ''));
}

exports.getMasterInventoryByLocation = async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        location.id AS location_id,
        location.code AS location_code,
        location.description AS location_description,
        location.barcode AS location_barcode,
        location.location_type,
        location.zone,
        location.rack,
        location.shelf,
        location.bin_position,
        location.is_system,
        location.active,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'item_id', item.id,
              'part_number', item.part_number,
              'lot_number', item.lot_number,
              'name', item.name,
              'item_description', item.description,
              'barcode', item.barcode,
              'container_status', item.container_status,
              'review_status', item.review_status,
              'uom', COALESCE(item.uom, settings.default_uom),
              'client_id', client.id,
              'client_name', client.name,
              'quantity', inventory.quantity,
              'attributes', item.attributes
            )
            ORDER BY client.name, item.part_number, item.lot_number, item.id
          ) FILTER (
            WHERE item.id IS NOT NULL
              AND item.archived_at IS NULL
              AND inventory.quantity > 0
          ),
          '[]'::jsonb
        ) AS items
      FROM locations AS location
      LEFT JOIN inventory ON location.id = inventory.location_id
      LEFT JOIN items AS item ON inventory.item_id = item.id
      LEFT JOIN clients AS client ON item.client_id = client.id
      LEFT JOIN client_inventory_settings AS settings
        ON settings.client_id = item.client_id
      WHERE location.active = true
      GROUP BY
        location.id,
        location.code,
        location.description,
        location.barcode,
        location.location_type,
        location.zone,
        location.rack,
        location.shelf,
        location.bin_position,
        location.is_system,
        location.active
      ORDER BY
        CASE WHEN location.location_type = 'staging' THEN 0 ELSE 1 END,
        COALESCE(location.zone, ''),
        COALESCE(location.rack, ''),
        COALESCE(location.shelf, ''),
        COALESCE(location.bin_position, ''),
        location.code;
    `);

    const locations = result.rows.map((location) => {
      const items = (location.items || []).map((item) => ({
        ...item,
        quantity: Number(item.quantity),
      }));
      const uniqueParts = new Set(
        items.map((item) => item.part_number).filter(Boolean),
      ).size;
      const reviewCount = items.filter(
        (item) => item.review_status === 'needs_review',
      ).length;

      return {
        ...location,
        needs_allocation:
          isCombinedLegacyLocation(location.location_code) || reviewCount > 0,
        record_count: items.length,
        unique_part_count: uniqueParts,
        review_count: reviewCount,
        items,
      };
    });

    return res.json(locations);
  } catch (error) {
    return next(error);
  }
};

module.exports._test = { isCombinedLegacyLocation };
