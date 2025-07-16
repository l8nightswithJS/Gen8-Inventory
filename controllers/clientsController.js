// controllers/clientsController.js
const supabase = require('../models/db');

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

exports.createClient = async (req, res, next) => {
  try {
    let logo_url = req.body.logo_url;
    if (req.file) {
      logo_url = `/uploads/${req.file.filename}`;
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({ name: req.body.name, logo_url })
      .single();

    if (error) throw error;
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
};

exports.updateClient = async (req, res, next) => {
  try {
    let logo_url = req.body.logo_url;
    if (req.file) {
      logo_url = `/uploads/${req.file.filename}`;
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update({ name: req.body.name, logo_url })
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    next(err);
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};
