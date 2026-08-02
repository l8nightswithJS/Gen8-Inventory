// inventory-service/routes/labels.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/labelsController');
const { requireRole } = require('shared-auth');
const { requireItemListAccess } = require('../middleware/requireItemAccess');

router.use(requireRole('admin', 'staff'));

// The enclosing /api/labels mount validates the explicit client_id.
router.post('/print/all', ctrl.printAllForClient);

// Selected labels do not carry a client_id, so resolve every item and ensure
// all of them belong to a client assigned to the authenticated user.
router.post(
  '/print/selected',
  requireItemListAccess(),
  ctrl.printSelected,
);

module.exports = router;
