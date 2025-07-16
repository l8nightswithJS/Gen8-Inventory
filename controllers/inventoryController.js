// controllers/inventoryController.js
const supabase = require('../models/db');
const fs        = require('fs');
const path      = require('path');
const csvWriter = require('fast-csv');

// GET /api/items?client_id=&page=&limit=&q=
exports.getAllItems = async (req, res, next) => {
  try {
    const client_id = parseInt(req.query.client_id, 10);
    if (!client_id) {
      return res.status(400).json({ message: 'client_id is required' });
    }

    const q     = req.query.q || '';
    const page  = parseInt(req.query.page, 10)  || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from  = (page - 1) * limit;
    const to    = page * limit - 1;

    // Build base query
    let query = supabase
      .from('items')
      .select('*', { count: 'exact' })
      .eq('client_id', client_id);

    // Add search filter if q is provided
    if (q) {
      query = query.or(
        `name.ilike.*${q}*,part_number.ilike.*${q}*`
      );
    }

    // Run it
    const { data, error, count } = await query
      .order('id', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      items:      data,
      total:      count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/items/:id
exports.getItemById = async (req, res, next) => {
  try {
    const { data: [item], error } = await supabase
      .from('items')
      .select('*')
      .eq('id', req.params.id)
      .limit(1);

    if (error) throw error;
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// POST /api/items
exports.createItem = async (req, res, next) => {
  try {
    const payload = {
      client_id:  parseInt(req.body.client_id, 10),
      name:       req.body.name,
      part_number:req.body.part_number,
      description:req.body.description || '',
      lot_number: req.body.lot_number  || '',
      quantity:   parseInt(req.body.quantity, 10) || 0,
      location:   req.body.location    || '',
    };

    const { data: item, error } = await supabase
      .from('items')
      .insert(payload)
      .single();

    if (error) throw error;
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// PUT /api/items/:id
exports.updateItem = async (req, res, next) => {
  try {
    const updates = {
      name:        req.body.name,
      part_number: req.body.part_number,
      description: req.body.description || '',
      lot_number:  req.body.lot_number  || '',
      quantity:    parseInt(req.body.quantity, 10) || 0,
      location:    req.body.location    || '',
      last_updated:new Date().toISOString(),
    };

    const { data: item, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/items/bulk
exports.bulkImportItems = async (req, res, next) => {
  try {
    const client_id = parseInt(req.body.client_id, 10);
    const items     = req.body.items;
    if (!client_id)            return res.status(400).json({ message: 'client_id is required' });
    if (!Array.isArray(items)) return res.status(400).json({ message: 'items must be an array' });

    let successCount = 0, failCount = 0;
    for (const item of items) {
      try {
        const payload = {
          client_id,
          name:        item.name,
          part_number: item.part_number,
          description: item.description || '',
          lot_number:  item.lot_number  || '',
          quantity:    parseInt(item.quantity, 10) || 0,
          location:    item.location    || '',
        };
        const { error } = await supabase
          .from('items')
          .insert(payload)
          .single();

        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error('Bulk import failed for item:', item, err.message);
        failCount++;
      }
    }

    res.json({ successCount, failCount });
  } catch (err) {
    next(err);
  }
};

// GET /api/items/export
exports.exportCSV = async (req, res, next) => {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('*');

    if (error) throw error;

    const filename = 'items_export.csv';
    const filepath = path.join(__dirname, '..', 'uploads', filename);
    const ws       = fs.createWriteStream(filepath);

    csvWriter.write(items, { headers: true }).pipe(ws).on('finish', () => {
      res.download(filepath, filename, (err) => {
        if (err) return next(err);
        fs.unlinkSync(filepath);
      });
    });
  } catch (err) {
    next(err);
  }
};
