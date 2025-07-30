// controllers/clientsController.js
const fs = require('fs');
const path = require('path');
const supabase = require('../lib/supabaseClient');
// your service‑role Supabase client

// GET /api/clients
exports.getAllClients = async (req, res, next) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    res.json(clients);
  } catch (err) {
    next(err);
  }
};

// GET /api/clients/:id
exports.getClientById = async (req, res, next) => {
  try {
    const {
      data: [client],
      error,
    } = await supabase
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .limit(1);
    if (error) throw error;
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    next(err);
  }
};

// POST /api/clients
exports.createClient = async (req, res, next) => {
  try {
    const { name, logo_url: logoUrlFromBody } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Client name is required' });
    }

    let finalLogoUrl = logoUrlFromBody || '';

    // If file was uploaded, push it into your Supabase bucket
    if (req.file) {
      const uploadPath = req.file.path;
      const fileBuffer = fs.readFileSync(uploadPath);
      const fileName = path.basename(uploadPath);

      const { error: upErr } = await supabase.storage
        .from('client-logos')
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
        error: urlErr,
      } = supabase.storage.from('client-logos').getPublicUrl(fileName);
      if (urlErr) throw urlErr;

      finalLogoUrl = publicUrl;
      fs.unlinkSync(uploadPath);
    }

    const { data, error: insertErr } = await supabase
      .from('clients')
      .insert([{ name: name.trim(), logo_url: finalLogoUrl }])
      .single();
    if (insertErr) throw insertErr;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// PUT /api/clients/:id
exports.updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, logo_url: logoUrlFromBody } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Client name is required' });
    }

    let finalLogoUrl = logoUrlFromBody || '';

    if (req.file) {
      const uploadPath = req.file.path;
      const fileBuffer = fs.readFileSync(uploadPath);
      const fileName = path.basename(uploadPath);

      const { error: upErr } = await supabase.storage
        .from('client-logos')
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
        error: urlErr,
      } = supabase.storage.from('client-logos').getPublicUrl(fileName);
      if (urlErr) throw urlErr;

      finalLogoUrl = publicUrl;
      fs.unlinkSync(uploadPath);
    }

    const { data, error: updateErr } = await supabase
      .from('clients')
      .update({ name: name.trim(), logo_url: finalLogoUrl })
      .eq('id', id)
      .single();
    if (updateErr) throw updateErr;

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/clients/:id
exports.deleteClient = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
};

// ─── NEW ───
// GET /api/clients/:id/alerts
exports.getClientAlerts = async (req, res, next) => {
  const clientId = parseInt(req.params.id, 10);
  if (isNaN(clientId)) {
    return res.status(400).json({ message: 'Invalid client id' });
  }

  try {
    // 1) fetch all items for this client
    const { data: items, error: itemErr } = await supabase
      .from('items')
      .select('id, name, quantity, low_stock_threshold')
      .eq('client_id', clientId);
    if (itemErr) throw itemErr;
    if (!items.length) return res.json({ alerts: [] });

    // 2) fetch all alerts for those items
    const itemIds = items.map((i) => i.id);
    const { data: stockAlerts, error: alertErr } = await supabase
      .from('stock_alerts')
      .select('id, item_id, triggered_at')
      .in('item_id', itemIds);
    if (alertErr) throw alertErr;

    // 3) merge each alert with its item
    const alerts = stockAlerts.map((a) => {
      const item = items.find((i) => i.id === a.item_id);
      return {
        id: a.id,
        triggered_at: a.triggered_at,
        item, // { id, name, quantity, low_stock_threshold }
      };
    });

    res.json({ alerts });
  } catch (err) {
    next(err);
  }
};
