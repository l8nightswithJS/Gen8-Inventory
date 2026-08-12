// inventory-service/routes/labels.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/labelsController');
const { requireRole } = require('shared-auth');

// === SECURE ALL LABEL ROUTES ===
// 1. User must be logged in.
// 2. User must be an 'admin' or 'staff'.
router.use(requireRole('admin', 'staff'));

// Build ZPL for local Browser Print without contacting a printer from the server.
router.post('/zpl/all', ctrl.getAllZplForClient);
router.post('/zpl/selected', ctrl.getSelectedZpl);

// Legacy/network printing retained as a fallback.
router.post('/print/all', ctrl.printAllForClient);
router.post('/print/selected', ctrl.printSelected);

module.exports = router;
