// inventory-service/routes/labels.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/labelsController');
const { requireRole } = require('shared-auth');
const authorizeLabels = require('../middleware/authorizeLabels');

// === SECURE ALL LABEL ROUTES ===
// 1. User must be logged in.
// 2. User must be an 'admin' or 'staff'.
router.use(requireRole('admin', 'staff'));
router.use(authorizeLabels);

// Print ALL labels for a client { client_id }
router.post('/print/all', ctrl.printAllForClient);

// Print labels for selected items { item_ids: number[] }
router.post('/print/selected', ctrl.printSelected);

module.exports = router;
