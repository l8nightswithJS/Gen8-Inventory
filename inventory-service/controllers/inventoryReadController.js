const pool = require('../db/pool');
const { computeLowState } = require('./_stockLogic');

exports.listItems = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const result = await pool.query(
      `SELECT
         i.*,
         COALESCE(SUM(inv.quantity), 0)::numeric AS total_quantity,
         COUNT(inv.id)::int AS inventory_record_count,
         COALESCE(
           string_agg(DISTINCT loc.code, ', ' ORDER BY loc.code),
           ''
         ) AS inventory_location
       FROM items i
       LEFT JOIN inventory inv ON i.id = inv.item_id
       LEFT JOIN locations loc ON loc.id = inv.location_id
       WHERE i.client_id = $1
       GROUP BY i.id
       ORDER BY i.name ASC, i.part_number ASC, i.lot_number ASC, i.id ASC`,
      [clientId],
    );

    const items = result.rows.map((item) => {
      const quantity = Number(item.total_quantity);
      const totalQuantity = Number.isFinite(quantity) ? quantity : 0;
      const { low } = computeLowState(item, totalQuantity);

      let status = 'in_stock';
      if (totalQuantity <= 0) status = 'out_of_stock';
      else if (low) status = 'low_stock';

      return {
        ...item,
        total_quantity: totalQuantity,
        status,
      };
    });

    return res.json(items);
  } catch (error) {
    return next(error);
  }
};
