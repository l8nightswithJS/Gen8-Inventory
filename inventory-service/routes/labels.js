const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/labelsController');
const { requireRole, requireClientPermission } = require('shared-auth');
const { requireItemListAccess } = require('../middleware/requireItemAccess');

router.use(requireRole('admin', 'inventory_staff', 'project_user'));

router.post(
  '/print/all',
  ...requireClientPermission('edit'),
  ctrl.printAllForClient,
);

router.post(
  '/print/selected',
  requireItemListAccess({ permission: 'edit' }),
  ctrl.printSelected,
);

module.exports = router;
