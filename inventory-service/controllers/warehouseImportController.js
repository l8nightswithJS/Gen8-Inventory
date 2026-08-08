const pool = require('../db/pool');
const { ItemContractError, normalizeUpdateItemPayload } = require('./_itemContract');
const { loadClientSettings, validateProfileAttributes } = require('./_profileSettings');
const {
  getStagingLocation,
  movementActor,
  recordMovement,
} = require('./_movementLedger');
const legacyImport = require('./bulkImportController')._test;

const LOCATION_STRATEGIES = new Set(['staging', 'file', 'selected']);

function normalizeStrategy(value) {
  const strategy = String(value || 'staging').trim().toLowerCase();
  if (!LOCATION_STRATEGIES.has(strategy)) {
    throw new ItemContractError(
      'location_strategy must be staging, file, or selected.',
    );
  }
  return strategy;
}

function blankOrNa(value) {
  return legacyImport.isBlankOrNa
    ? legacyImport.isBlankOrNa(value)
    : value == null ||
        !String(value).trim() ||
        /^n\/?a$/i.test(String(value).trim());
}

async function activeLocationById(db, id) {
  if (!id) return null;
  const result = await db.query(
    `SELECT id, code, barcode
     FROM locations
     WHERE id = $1 AND active = true
     LIMIT 1`,
    [id],
  );
  if (!result.rows[0]) {
    throw new ItemContractError(
      'The selected inventory location does not exist or is inactive.',
    );
  }
  return result.rows[0];
}

async function findOrCreateFileLocation(db, cache, rawCode) {
  const code = String(rawCode || '').trim();
  if (!code) return null;
  const cacheKey = code.toLowerCase();
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let result = await db.query(
    `SELECT id, code, barcode
     FROM locations
     WHERE lower(code) = lower($1)
     LIMIT 1`,
    [code],
  );

  if (!result.rows[0]) {
    result = await db.query(
      `INSERT INTO locations (code, description, location_type)
       VALUES ($1, $2, 'other')
       ON CONFLICT (code) DO UPDATE SET active = true
       RETURNING id, code, barcode`,
      [code, 'Created automatically during inventory import'],
    );
  }

  cache.set(cacheKey, result.rows[0]);
  return result.rows[0];
}

async function saveTemplate(
  db,
  clientId,
  template,
  strategy,
  selectedLocationId,
) {
  if (!template || template.save !== true) return null;
  const name = String(template.name || '').trim();
  if (!name) throw new ItemContractError('An import template name is required.');

  const isDefault = template.is_default !== false;
  if (isDefault) {
    await db.query(
      `UPDATE client_import_templates
       SET is_default = false
       WHERE client_id = $1`,
      [clientId],
    );
  }

  const result = await db.query(
    `INSERT INTO client_import_templates (
       client_id, name, sheet_name, header_row, column_mapping,
       default_location_id, location_strategy, is_default
     )
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
     ON CONFLICT (client_id, name)
     DO UPDATE SET
       sheet_name = EXCLUDED.sheet_name,
       header_row = EXCLUDED.header_row,
       column_mapping = EXCLUDED.column_mapping,
       default_location_id = EXCLUDED.default_location_id,
       location_strategy = EXCLUDED.location_strategy,
       is_default = EXCLUDED.is_default,
       updated_at = NOW()
     RETURNING *`,
    [
      clientId,
      name,
      String(template.sheet_name || '').trim() || null,
      Number.isFinite(Number(template.header_row))
        ? Number(template.header_row)
        : null,
      JSON.stringify(template.column_mapping || {}),
      template.default_location_id || selectedLocationId || null,
      strategy,
      isDefault,
    ],
  );
  return result.rows[0];
}

function buildInsert(clientId, coreData, attributes, quantity, reviewIssues) {
  const reviewStatus = reviewIssues.length ? 'needs_review' : 'clear';
  const columns = [
    'client_id',
    ...Object.keys(coreData),
    'initial_quantity',
    'attributes',
    'review_status',
    'review_issues',
  ];
  const values = [
    clientId,
    ...Object.values(coreData),
    quantity,
    JSON.stringify(attributes),
    reviewStatus,
    JSON.stringify(reviewIssues),
  ];
  const placeholders = values.map((_, index) => `$${index + 1}`);
  placeholders[placeholders.length - 3] += '::jsonb';
  placeholders[placeholders.length - 1] += '::jsonb';
  const quoted = columns.map(
    (column) => `"${String(column).replace(/"/g, '""')}"`,
  );

  return {
    text: `INSERT INTO items (${quoted.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id, barcode, part_number, lot_number, uom`,
    values,
  };
}

function issue(type, field, sourceValue, message) {
  return {
    type,
    field,
    source_value: sourceValue == null ? null : String(sourceValue),
    message,
  };
}

exports.bulkImportItems = async (req, res, next) => {
  const clientId = Number(req.body?.client_id);
  const rows = req.body?.items;
  const mapping = req.body?.column_mapping || {};

  if (!Number.isSafeInteger(clientId) || clientId < 1) {
    return res
      .status(400)
      .json({ message: 'client_id must be a positive integer.' });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return res
      .status(400)
      .json({ message: 'items must be a non-empty array.' });
  }

  let db = null;
  try {
    db = await pool.connect();
    await db.query('BEGIN');

    const settings = await loadClientSettings(clientId, db);
    const strategy = normalizeStrategy(req.body?.location_strategy);
    const staging = await getStagingLocation(db);
    const requestedLocationId = Number(req.body?.default_location_id);
    const selected =
      strategy === 'selected'
        ? await activeLocationById(
            db,
            Number.isSafeInteger(requestedLocationId) && requestedLocationId > 0
              ? requestedLocationId
              : settings.default_location_id,
          )
        : null;

    if (strategy === 'selected' && !selected) {
      throw new ItemContractError(
        'Select a destination location before importing.',
      );
    }

    const warnings = [];
    const createdItems = [];
    const locationCache = new Map();
    let needsReviewCount = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const spreadsheetRow = Number(req.body?.header_row || 1) + index + 1;
      const mapped = legacyImport.mapImportedRow(rows[index], mapping, settings);

      if (
        blankOrNa(mapped.part_number) &&
        !blankOrNa(mapped.vendor_item_number)
      ) {
        mapped.part_number = mapped.vendor_item_number;
        warnings.push({
          row: spreadsheetRow,
          field: 'Part Number',
          message:
            'Vendor Item Number was used because Part Number was blank or N/A.',
        });
      }

      if (!mapped.uom && settings.default_uom) mapped.uom = settings.default_uom;
      if (blankOrNa(mapped.lot_number)) mapped.lot_number = null;
      if (blankOrNa(mapped.batch_number)) mapped.batch_number = null;

      const rawQuantity = mapped.total_quantity;
      const rawLocation = mapped.location;
      delete mapped.total_quantity;
      delete mapped.location;
      delete mapped.barcode;

      const parsedQuantity = legacyImport.parseImportedQuantity(rawQuantity);
      const parsedLocation = legacyImport.parseImportedLocation(rawLocation);
      const reviewIssues = [];

      if (parsedQuantity.warning) {
        warnings.push({
          row: spreadsheetRow,
          field: 'On Hand',
          value: rawQuantity,
          message: parsedQuantity.warning,
        });
        reviewIssues.push(
          issue(
            parsedQuantity.issueType || 'quantity_review',
            'quantity',
            rawQuantity,
            parsedQuantity.warning,
          ),
        );
      }

      if (strategy === 'file' && parsedLocation.requiresAllocation) {
        reviewIssues.push(
          issue(
            'location_allocation',
            'location',
            rawLocation,
            'Multiple file locations were supplied. Allocate the quantity to individual locations.',
          ),
        );
      }

      let normalized;
      try {
        normalized = normalizeUpdateItemPayload(mapped);
      } catch (error) {
        if (error instanceof ItemContractError) {
          throw new ItemContractError(
            `Row ${spreadsheetRow}: ${error.message}`,
          );
        }
        throw error;
      }

      const { coreData } = normalized;
      if (!coreData.part_number) {
        throw new ItemContractError(
          `Row ${spreadsheetRow}: no mappable part number was found.`,
        );
      }

      let attributes;
      try {
        attributes = validateProfileAttributes(
          normalized.attributes,
          settings,
        );
      } catch (error) {
        throw new ItemContractError(
          `Row ${spreadsheetRow}: ${error.message}`,
        );
      }

      const insert = buildInsert(
        clientId,
        coreData,
        attributes,
        parsedQuantity.quantity,
        reviewIssues,
      );
      const itemResult = await db.query(insert.text, insert.values);
      const item = itemResult.rows[0];

      let destination = null;
      if (parsedQuantity.quantity !== null && reviewIssues.length === 0) {
        if (strategy === 'staging') {
          destination = staging;
        } else if (strategy === 'selected') {
          destination = selected;
        } else if (parsedLocation.codes.length === 1) {
          destination = await findOrCreateFileLocation(
            db,
            locationCache,
            parsedLocation.codes[0],
          );
        } else if (parsedLocation.codes.length === 0) {
          destination = staging;
          warnings.push({
            row: spreadsheetRow,
            field: 'Location',
            message:
              'No file location was supplied; inventory was placed in STAGING.',
          });
        }
      }

      if (destination) {
        await db.query(
          `INSERT INTO inventory (item_id, location_id, quantity)
           VALUES ($1,$2,$3)`,
          [item.id, destination.id, parsedQuantity.quantity],
        );
        await recordMovement(db, {
          itemId: item.id,
          movementType: 'import',
          toLocationId: destination.id,
          quantity: parsedQuantity.quantity,
          destinationBefore: 0,
          destinationAfter: parsedQuantity.quantity,
          uom: item.uom,
          reason: 'Bulk inventory import',
          metadata: {
            sheet_name: req.body?.sheet_name || null,
            spreadsheet_row: spreadsheetRow,
            location_strategy: strategy,
          },
          ...movementActor(req.user),
        });
      }

      if (reviewIssues.length) needsReviewCount += 1;
      createdItems.push({
        id: item.id,
        barcode: item.barcode,
        part_number: item.part_number,
        lot_number: item.lot_number,
        initial_quantity: parsedQuantity.quantity,
        uom: item.uom,
        location: destination?.code || null,
      });
    }

    const savedTemplate = await saveTemplate(
      db,
      clientId,
      req.body?.template,
      strategy,
      selected?.id || null,
    );

    if (selected?.id && req.body?.save_default_location === true) {
      await db.query(
        `UPDATE client_inventory_settings
         SET default_location_id = $2, updated_at = NOW()
         WHERE client_id = $1`,
        [clientId, selected.id],
      );
    }

    await db.query('COMMIT');

    return res.status(201).json({
      message: 'Bulk import successful',
      successCount: rows.length,
      barcodeCount: createdItems.length,
      needsReviewCount,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 50),
      createdItems,
      savedTemplate,
      locationStrategy: strategy,
      stagingLocation:
        strategy === 'staging'
          ? { id: staging.id, code: staging.code, barcode: staging.barcode }
          : null,
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => undefined);
    if (error instanceof ItemContractError || error.status === 400) {
      return res.status(error.status || 400).json({ message: error.message });
    }
    if (error?.code === '23505') {
      return res.status(409).json({
        code: 'UNIQUE_CONFLICT',
        constraint: error.constraint || null,
        message:
          'Import encountered a unique-value conflict. Retry after confirming the database migration is applied.',
      });
    }
    return next(error);
  } finally {
    db?.release();
  }
};

module.exports._test = { normalizeStrategy };
