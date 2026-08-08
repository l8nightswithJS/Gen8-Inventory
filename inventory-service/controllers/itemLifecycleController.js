const pool = require('../db/pool');
const { computeLowState, deriveStockStatus } = require('./_stockLogic');

exports.getItemById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `SELECT
         item.*,
         COALESCE(SUM(inventory.quantity), 0)::numeric AS total_quantity,
         COALESCE(
           jsonb_agg(
             DISTINCT jsonb_build_object(
               'location_id', location.id,
               'location_code', location.code,
               'location_barcode', location.barcode,
               'location_type', location.location_type,
               'quantity', inventory.quantity
             )
           ) FILTER (WHERE inventory.id IS NOT NULL AND inventory.quantity > 0),
           '[]'::jsonb
         ) AS inventory_levels
       FROM items AS item
       LEFT JOIN inventory ON inventory.item_id = item.id
       LEFT JOIN locations AS location ON location.id = inventory.location_id
       WHERE item.id = $1 AND item.archived_at IS NULL
       GROUP BY item.id`,
      [id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Inventory container not found.' });
    }

    const item = result.rows[0];
    const totalQuantity = Number(item.total_quantity);
    const lowState = computeLowState(item, totalQuantity);

    return res.json({
      ...item,
      total_quantity: totalQuantity,
      initial_quantity:
        item.initial_quantity == null ? null : Number(item.initial_quantity),
      reorder_level:
        item.reorder_level == null ? null : Number(item.reorder_level),
      low_stock_threshold:
        item.low_stock_threshold == null
          ? null
          : Number(item.low_stock_threshold),
      threshold_configured: lowState.thresholdConfigured,
      status: deriveStockStatus(item, totalQuantity),
      inventory_levels: (item.inventory_levels || []).map((level) => ({
        ...level,
        quantity: Number(level.quantity),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

exports.archiveItem = async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    const balance = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0)::numeric AS total_quantity
       FROM inventory
       WHERE item_id = $1`,
      [id],
    );
    const quantity = Number(balance.rows[0]?.total_quantity || 0);
    if (quantity > 0) {
      return res.status(409).json({
        code: 'CONTAINER_HAS_STOCK',
        message:
          'This container still has inventory. Move the stock or mark the container empty before archiving it.',
      });
    }

    const result = await pool.query(
      `UPDATE items
       SET archived_at = NOW(), last_updated = NOW()
       WHERE id = $1 AND archived_at IS NULL
       RETURNING id, barcode, part_number`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Inventory container not found.' });
    }
    return res.json({
      message: 'Inventory container archived. Movement history was preserved.',
      item: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};
