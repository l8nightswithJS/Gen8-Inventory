const fs = require('fs');
const path = require('path');
const supabase = require('../lib/supabaseClient');

// GET /api/clients
exports.getAllClients = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
};

// GET /api/clients/:id
exports.getClientById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Upload helper to Supabase bucket 'client-logos'
async function uploadToBucket(localPath, fileName) {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const { error: upErr } = await supabase.storage
      .from('client-logos')
      .upload(fileName, fileBuffer, { upsert: true, contentType: 'image/png' });
    if (upErr) throw upErr;
    const {
      data: { publicUrl },
    } = supabase.storage.from('client-logos').getPublicUrl(fileName);
    return publicUrl;
  } catch (e) {
    console.warn(
      '⚠️ Upload to bucket failed, will use local file URL',
      e.message,
    );
    return null;
  }
}

// POST /api/clients
exports.createClient = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name is required' });

    let barcode =
      typeof req.body.barcode === 'string' ? req.body.barcode.trim() : null;
    if (barcode === '') barcode = null;

    let logoUrl = req.body.logo_url || null;

    if (req.file) {
      const fileName = `${Date.now()}_${req.file.originalname}`;
      const localPath = req.file.path;
      const publicUrl = await uploadToBucket(localPath, fileName);
      logoUrl = publicUrl || `/uploads/${path.basename(localPath)}`;
      try {
        fs.unlinkSync(localPath);
      } catch {}
    }

    const insertObj = { name, logo_url: logoUrl };
    if (barcode != null) insertObj.barcode = barcode;

    const { data, error } = await supabase
      .from('clients')
      .insert([insertObj])
      .select('*')
      .single();

    if (error) {
      if (
        error.code === '23505' ||
        /duplicate key value/i.test(error.message || '')
      ) {
        return res.status(409).json({ message: 'Barcode already in use' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// PUT /api/clients/:id
exports.updateClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const fields = {};
    if (typeof req.body.name === 'string') fields.name = req.body.name.trim();

    if (Object.prototype.hasOwnProperty.call(req.body, 'barcode')) {
      if (typeof req.body.barcode === 'string') {
        const v = req.body.barcode.trim();
        fields.barcode = v === '' ? null : v;
      } else if (req.body.barcode == null) {
        fields.barcode = null;
      }
    }

    if (req.file) {
      const fileName = `${Date.now()}_${req.file.originalname}`;
      const localPath = req.file.path;
      const publicUrl = await uploadToBucket(localPath, fileName);
      fields.logo_url = publicUrl || `/uploads/${path.basename(localPath)}`;
      try {
        fs.unlinkSync(localPath);
      } catch {}
    } else if (typeof req.body.logo_url === 'string') {
      fields.logo_url = req.body.logo_url;
    }

    const { data, error } = await supabase
      .from('clients')
      .update(fields)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (
        error.code === '23505' ||
        /duplicate key value/i.test(error.message || '')
      ) {
        return res.status(409).json({ message: 'Barcode already in use' });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/clients/:id
exports.deleteClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const { error, count } = await supabase
      .from('clients')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw error;
    if (count === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};
