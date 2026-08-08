const pool = require('../db/pool');
const {
  applyProfileToItem,
  loadClientSettings,
} = require('./_profileSettings');

exports.getActiveAlerts = async (req, res, next) => {
  try {
    const clientId = Number(req.query.client_id);
    const [settings, result] = await Promise.all([
      loadClientSettings(clientId),
      pool.query(
        `SELECT
           item.*,
           COALESCE(SUM(inventory.quantity), 0)::numeric AS total_quantity
         FROM items AS item
         LEFT JOIN inventory ON item.id = inventory.item_id
         WHERE item.client_id = $1
           AND item.alert_acknowledged_at IS NULL
           AND item.archived_at IS NULL
         GROUP BY item.id`,
        [clientId],
      ),
    ]);

    const alerts = result.rows.flatMap((item) => {
      const profiled = applyProfileToItem(
        item,
        Number(item.total_quantity),
        settings,
      );
      if (
        profiled.status === 'needs_review' ||
        !['low_stock', 'critical', 'out_of_stock'].includes(profiled.status)
      ) {
        return [];
      }

      const threshold =
        profiled.status === 'critical'
          ? profiled.minimum_quantity
          : profiled.reorder_level ?? profiled.low_stock_threshold;

      return [
        {
          item: profiled,
          reason:
            profiled.status === 'critical'
              ? 'minimum_quantity'
              : profiled.status === 'out_of_stock'
                ? 'out_of_stock'
                : profiled.reorder_level != null
                  ? 'reorder_level'
                  : 'low_stock_threshold',
          threshold,
          qty: profiled.total_quantity,
          status: profiled.status,
          priority: profiled.priority,
        },
      ];
    });

    return res.json(alerts);
  } catch (error) {
    return next(error);
  }
};
