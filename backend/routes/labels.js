// backend/routes/labels.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/labelsController');

// Print ALL labels for a client  { client_id }
router.post('/print/all', ctrl.printAllForClient);

// Print labels for selected items  { item_ids: number[] }
router.post('/print/selected', ctrl.printSelected);

module.exports = router;
