const crypto = require('crypto');
const pool = require('../db/pool');
const { movementActor, recordMovement } = require('./_movementLedger');
const {
  cleanText,
  extractReceivingDocument,
  integerOrNull,
  normalizeDate,
  numberOrNull,
} = require('./_receivingDocument');
const { storeReceivingDocument } = require('./_receivingStorage');
const { matchProducts, resolveProduct, saveAliases } = require('./_receivingProducts');

function normalizeQuality(value) {
  const normalized = String(value || 'pending_inspection').trim().toLowerCase();
  return ['pending_inspection', 'released', 'hold', 'quarantine', 'rejected'].includes(normalized)
    ? normalized
    : 'pending_inspection';
}

function normalizeContainers(line, totalQuantity) {
  const supplied = Array.isArray(line?.containers) ? line.containers : [];
  if (supplied.length) {
    const containers = supplied.map((container, index) => {
      const quantity = numberOrNull(container?.quantity);
      if (quantity === null) {
        const error = new Error(`Container ${index + 1} requires a valid quantity.`);
        error.status = 400;
        throw error;
      }
      return {
        quantity,
        package_type: cleanText(container?.package_type || line?.package_type),
        vendor_barcode: cleanText(container?.vendor_barcode),
      };
    });
    const sum = containers.reduce((acc, container) => acc + container.quantity, 0);
    if (totalQuantity !== null && Math.abs(sum - totalQuantity) > 0.0005) {
      const error = new Error(`Container quantities total ${sum}, but the received line total is ${totalQuantity}.`);
      error.status = 400;
      throw error;
    }
    return containers;
  }

  const count = integerOrNull(line?.container_count) || 1;
  const each = numberOrNull(line?.quantity_per_container);
  if (count > 1 && each !== null) {
    const computed = Math.round(count * each * 1000) / 1000;
    if (totalQuantity !== null && Math.abs(computed - totalQuantity) > 0.0005) {
      const error = new Error(`Packaging calculates to ${computed}, but the received line total is ${totalQuantity}.`);
      error.status = 400;
      throw error;
    }
    return Array.from({ length: count }, () => ({
      quantity: each,
      package_type: cleanText(line?.package_type),
      vendor_barcode: null,
    }));
  }

  if (count === 1 && totalQuantity !== null) {
    return [{ quantity: totalQuantity, package_type: cleanText(line?.package_type), vendor_barcode: null }];
  }

  const error = new Error('Confirm the quantity for each physical container before receiving.');
  error.status = 400;
  throw error;
}

exports.extractDocument = async (req, res, next) => {
  const clientId = Number(req.body?.client_id);
  if (!Number.isSafeInteger(clientId) || clientId < 1) {
    return res.status(400).json({ message: 'client_id must be a positive integer.' });
  }
  if (!req.file) return res.status(400).json({ message: 'A document image or PDF is required.' });

  let db;
  try {
    db = await pool.connect();
    const extraction = await extractReceivingDocument(req.file);
    const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const documentResult = await db.query(
      `INSERT INTO receipt_documents (
         client_id, document_type, original_filename, mime_type, sha256,
         extracted_data, extraction_model
       ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
       RETURNING id`,
      [
        clientId,
        extraction.data.document_type,
        req.file.originalname || null,
        req.file.mimetype,
        sha256,
        JSON.stringify(extraction.data),
        extraction.model,
      ],
    );
    const documentId = documentResult.rows[0].id;
    const storage = await storeReceivingDocument(req.file, clientId, documentId);
    if (storage.bucket && storage.path) {
      await db.query(
        `UPDATE receipt_documents SET storage_bucket = $2, storage_path = $3 WHERE id = $1`,
        [documentId, storage.bucket, storage.path],
      );
    }

    const lines = [];
    for (const line of extraction.data.lines) {
      lines.push({ ...line, matches: await matchProducts(db, clientId, line) });
    }

    return res.json({
      document_id: documentId,
      extraction_model: extraction.model,
      storage_warning: storage.warning,
      ...extraction.data,
      lines,
    });
  } catch (error) {
    if (error?.response?.data) {
      const wrapped = new Error(
        `Document extraction failed: ${error.response.data?.error?.message || error.message}`,
      );
      wrapped.status = 502;
      return next(wrapped);
    }
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  } finally {
    db?.release();
  }
};

exports.searchProducts = async (req, res, next) => {
  const clientId = Number(req.query?.client_id);
  const q = cleanText(req.query?.q) || '';
  if (!Number.isSafeInteger(clientId) || clientId < 1) {
    return res.status(400).json({ message: 'client_id must be a positive integer.' });
  }
  try {
    const result = await pool.query(
      `SELECT product.*
       FROM products AS product
       WHERE product.client_id = $1 AND product.active = true
         AND (
           lower(product.part_number) LIKE $2
           OR lower(coalesce(product.name, '')) LIKE $2
           OR lower(coalesce(product.description, '')) LIKE $2
           OR lower(coalesce(product.manufacturer_part_number, '')) LIKE $2
           OR lower(coalesce(product.vendor_item_number, '')) LIKE $2
         )
       ORDER BY product.part_number
       LIMIT 50`,
      [clientId, `%${q.toLowerCase()}%`],
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
};

exports.createReceipt = async (req, res, next) => {
  const clientId = Number(req.body?.client_id);
  const lines = req.body?.lines;
  if (!Number.isSafeInteger(clientId) || clientId < 1) {
    return res.status(400).json({ message: 'client_id must be a positive integer.' });
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ message: 'At least one confirmed receiving line is required.' });
  }

  const receivedDateInput = cleanText(req.body?.received_date);
  const receivedDate = receivedDateInput ? normalizeDate(receivedDateInput) : null;
  if (receivedDateInput && !receivedDate) {
    return res.status(400).json({
      message: 'Received Date must be an unambiguous valid date in YYYY-MM-DD format.',
    });
  }

  let db;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const locationCode = cleanText(req.body?.receiving_location_code) || 'RECEIVING-QC';
    const locationResult = await db.query(
      `SELECT id, code, barcode FROM locations WHERE upper(code) = upper($1) AND active = true LIMIT 1`,
      [locationCode],
    );
    const receivingLocation = locationResult.rows[0];
    if (!receivingLocation) {
      const error = new Error(`${locationCode} is not configured as an active receiving location.`);
      error.status = 400;
      throw error;
    }

    const actor = movementActor(req.user);
    const receiptResult = await db.query(
      `INSERT INTO receipts (
         receipt_number, client_id, supplier_name, po_number, packing_slip_number,
         coc_number, received_date, received_by_user_id, received_by_email,
         status, notes, extraction_metadata
       ) VALUES (NULL,$1,$2,$3,$4,$5,coalesce($6::date,current_date),$7,$8,'received',$9,$10::jsonb)
       RETURNING *`,
      [
        clientId,
        cleanText(req.body?.supplier_name),
        cleanText(req.body?.po_number),
        cleanText(req.body?.packing_slip_number),
        cleanText(req.body?.coc_number),
        receivedDate,
        actor.actorUserId,
        actor.actorEmail,
        cleanText(req.body?.notes),
        JSON.stringify(req.body?.extraction_metadata || {}),
      ],
    );
    const receipt = receiptResult.rows[0];
    const createdContainers = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] || {};
      const product = await resolveProduct(db, clientId, line);
      const totalQuantity = numberOrNull(line.quantity);
      const containers = normalizeContainers(line, totalQuantity);
      const computedTotal = containers.reduce((sum, container) => sum + container.quantity, 0);
      const qualityStatus = normalizeQuality(line.quality_status || 'pending_inspection');
      const uom = cleanText(line.uom || product.default_uom);
      if (!uom) {
        const error = new Error(`Line ${index + 1} requires a confirmed unit of measure.`);
        error.status = 400;
        throw error;
      }

      const attributes = {
        ...(product.attributes || {}),
        ...(line.attributes && typeof line.attributes === 'object' ? line.attributes : {}),
      };
      if (cleanText(line.manufacturer || product.manufacturer)) attributes.manufacturer = cleanText(line.manufacturer || product.manufacturer);
      if (cleanText(line.batch_number)) attributes.batch_number = cleanText(line.batch_number);
      if (cleanText(line.color)) attributes.color = cleanText(line.color);
      if (cleanText(line.additive)) attributes.additive = cleanText(line.additive);
      if (normalizeDate(line.manufacture_date)) attributes.manufacture_date = normalizeDate(line.manufacture_date);
      if (normalizeDate(line.expiration_date)) attributes.expiration_date = normalizeDate(line.expiration_date);

      const receiptLineResult = await db.query(
        `INSERT INTO receipt_lines (
           receipt_id, product_id, lot_number, batch_number, quantity, uom,
           container_count, package_type, quality_status, line_metadata
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
         RETURNING *`,
        [
          receipt.id,
          product.id,
          cleanText(line.lot_number),
          cleanText(line.batch_number),
          computedTotal,
          uom,
          containers.length,
          cleanText(line.package_type),
          qualityStatus,
          JSON.stringify({ source_text: cleanText(line.source_text), confidence: line.confidence || {} }),
        ],
      );
      const receiptLine = receiptLineResult.rows[0];

      for (const container of containers) {
        const itemResult = await db.query(
          `INSERT INTO items (
             client_id, product_id, receipt_line_id, part_number, lot_number,
             name, description, vendor_barcode, uom, initial_quantity,
             attributes, review_status, review_issues, container_status,
             quality_status, quality_updated_at, package_type
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,
             'clear','[]'::jsonb,'available',$12,now(),$13
           )
           RETURNING id, barcode, part_number, lot_number, name, uom,
                     initial_quantity, quality_status, package_type`,
          [
            clientId,
            product.id,
            receiptLine.id,
            product.part_number,
            cleanText(line.lot_number),
            product.name || cleanText(line.name),
            product.description || cleanText(line.description),
            container.vendor_barcode,
            uom,
            container.quantity,
            JSON.stringify(attributes),
            qualityStatus,
            container.package_type,
          ],
        );
        const item = itemResult.rows[0];
        await db.query(
          `INSERT INTO inventory (item_id, location_id, quantity) VALUES ($1,$2,$3)`,
          [item.id, receivingLocation.id, container.quantity],
        );
        await recordMovement(db, {
          itemId: item.id,
          movementType: 'receipt',
          toLocationId: receivingLocation.id,
          quantity: container.quantity,
          destinationBefore: 0,
          destinationAfter: container.quantity,
          uom,
          reason: `Received on ${receipt.receipt_number}`,
          metadata: {
            receipt_id: receipt.id,
            receipt_number: receipt.receipt_number,
            receipt_line_id: receiptLine.id,
            product_id: product.id,
          },
          ...actor,
        });
        createdContainers.push({ ...item, location: receivingLocation.code, product_id: product.id });
      }

      await saveAliases(db, clientId, product.id, req.body?.supplier_name, line.aliases);
    }

    const documentIds = Array.isArray(req.body?.document_ids)
      ? req.body.document_ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)
      : [];
    if (documentIds.length) {
      await db.query(
        `UPDATE receipt_documents SET receipt_id = $1
         WHERE client_id = $2 AND id = ANY($3::bigint[])`,
        [receipt.id, clientId, documentIds],
      );
    }

    await db.query('COMMIT');
    return res.status(201).json({
      message: 'Receipt created and physical containers generated.',
      receipt,
      receiving_location: receivingLocation,
      container_count: createdContainers.length,
      containers: createdContainers,
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => undefined);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  } finally {
    db?.release();
  }
};

exports.listReceipts = async (req, res, next) => {
  const clientId = Number(req.query?.client_id);
  if (!Number.isSafeInteger(clientId) || clientId < 1) {
    return res.status(400).json({ message: 'client_id must be a positive integer.' });
  }
  try {
    const result = await pool.query(
      `SELECT receipt.*,
              count(distinct receipt_line.id)::int AS line_count,
              count(item.id)::int AS container_count,
              coalesce(sum(item.initial_quantity),0)::numeric AS received_quantity
       FROM receipts AS receipt
       LEFT JOIN receipt_lines AS receipt_line ON receipt_line.receipt_id = receipt.id
       LEFT JOIN items AS item ON item.receipt_line_id = receipt_line.id
       WHERE receipt.client_id = $1
       GROUP BY receipt.id
       ORDER BY receipt.created_at DESC
       LIMIT 100`,
      [clientId],
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
};

module.exports._test = { normalizeContainers, normalizeQuality };
