// controllers/clientsController.js
const fs       = require('fs');
const path     = require('path');
const supabase = require('../models/db'); // your service‑role client

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
    const { data: [client], error } = await supabase
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
      const uploadPath = req.file.path;                   // local disk path
      const fileBuffer = fs.readFileSync(uploadPath);     // read it
      const fileName   = path.basename(uploadPath);       // e.g. "1680000000000-logo.png"

      // upload via service role key
      const { error: upErr } = await supabase
        .storage
        .from('client-logos')
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: false
        });
      if (upErr) throw upErr;

      // get its public URL
      const { data: { publicUrl }, error: urlErr } = supabase
        .storage
        .from('client-logos')
        .getPublicUrl(fileName);
      if (urlErr) throw urlErr;

      finalLogoUrl = publicUrl;

      // clean up local copy
      fs.unlinkSync(uploadPath);
    }

    // insert the row
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

    // handle file upload the same way
    if (req.file) {
      const uploadPath = req.file.path;
      const fileBuffer = fs.readFileSync(uploadPath);
      const fileName   = path.basename(uploadPath);

      const { error: upErr } = await supabase
        .storage
        .from('client-logos')
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: true
        });
      if (upErr) throw upErr;

      const { data: { publicUrl }, error: urlErr } = supabase
        .storage
        .from('client-logos')
        .getPublicUrl(fileName);
      if (urlErr) throw urlErr;

      finalLogoUrl = publicUrl;
      fs.unlinkSync(uploadPath);
    }

    // update the DB row
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
