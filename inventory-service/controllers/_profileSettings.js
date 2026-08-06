const pool = require('../db/pool');
const {
  coerceAttributes,
  getProfilePreset,
  normalizeSettings,
} = require('../../packages/inventory-profiles');
const { deriveStockStatus } = require('./_stockLogic');

async function loadClientSettings(clientId, db = pool) {
  const result = await db.query(
    `SELECT
       settings.*,
       location.code AS default_location_code
     FROM client_inventory_settings AS settings
     LEFT JOIN locations AS location
       ON location.id = settings.default_location_id
     WHERE settings.client_id = $1`,
    [clientId],
  );

  if (result.rows.length === 0) {
    const preset = getProfilePreset('general');
    return normalizeSettings({
      profile_key: preset.key,
      default_uom: preset.defaultUom,
      display_columns: preset.displayColumns,
      field_definitions: preset.fieldDefinitions,
      import_aliases: preset.importAliases,
    });
  }

  return {
    ...normalizeSettings(result.rows[0]),
    default_location_code: result.rows[0].default_location_code || null,
  };
}

function finiteNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateProfileAttributes(attributes, settings) {
  return coerceAttributes(attributes, settings.field_definitions);
}

function deriveProfileMetrics(item, totalQuantity) {
  const quantity = finiteNumber(totalQuantity) || 0;
  const attributes = item.attributes || {};
  const minimumQuantity = finiteNumber(attributes.minimum_quantity);
  const weeklyDemand = finiteNumber(attributes.weekly_demand);
  const reorderQuantity = finiteNumber(attributes.reorder_quantity);
  const targetQuantity = finiteNumber(attributes.target_quantity);

  let status;
  if (item.review_status === 'needs_review') {
    status = 'needs_review';
  } else if (quantity <= 0) {
    status = 'out_of_stock';
  } else if (minimumQuantity !== null && quantity <= minimumQuantity) {
    status = 'critical';
  } else {
    status = deriveStockStatus(item, quantity);
  }

  const weeksOnHand =
    weeklyDemand !== null && weeklyDemand > 0
      ? Math.round((quantity / weeklyDemand) * 1000) / 1000
      : null;

  let suggestedReorder = 0;
  if (['low_stock', 'critical', 'out_of_stock'].includes(status)) {
    const targetGap =
      targetQuantity === null ? 0 : Math.max(targetQuantity - quantity, 0);
    suggestedReorder = Math.max(targetGap, reorderQuantity || 0);
  }

  const priority =
    status === 'needs_review'
      ? 'Review'
      : status === 'out_of_stock' || status === 'critical'
        ? 'High'
        : status === 'low_stock'
          ? 'Medium'
          : 'Normal';

  return {
    status,
    priority,
    weeks_on_hand: weeksOnHand,
    suggested_reorder: suggestedReorder,
    minimum_quantity: minimumQuantity,
    weekly_demand: weeklyDemand,
    reorder_quantity: reorderQuantity,
    target_quantity: targetQuantity,
  };
}

function applyProfileToItem(item, totalQuantity, settings) {
  const metrics = deriveProfileMetrics(item, totalQuantity);
  return {
    ...item,
    uom: item.uom || settings.default_uom || null,
    total_quantity: Number(totalQuantity) || 0,
    ...metrics,
  };
}

module.exports = {
  applyProfileToItem,
  deriveProfileMetrics,
  finiteNumber,
  loadClientSettings,
  validateProfileAttributes,
};
