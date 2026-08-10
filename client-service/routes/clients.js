const express = require('express');
const multer = require('multer');
const { body, param } = require('express-validator');
const controller = require('../controllers/clientsController');
const inventorySettingsController = require('../controllers/inventorySettingsController');
const {
  handleValidation,
  requireClientMatch,
  requireRole,
} = require('shared-auth');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/inventory-profiles', inventorySettingsController.listProfiles);
router.get('/', controller.getAllClients);

router.get(
  '/:clientId/inventory-settings',
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  requireClientMatch,
  inventorySettingsController.getSettings,
);

router.put(
  '/:clientId/inventory-settings',
  requireRole('admin'),
  param('clientId').isInt({ min: 1 }).toInt(),
  body('profile_key').optional().isIn(['general', 'resin', 'molded_parts', 'genmark_components']),
  body('display_columns').optional().isArray(),
  body('field_definitions').optional().isArray(),
  body('default_location_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('default_uom').optional({ nullable: true }).isString().isLength({ max: 40 }),
  body('apply_preset').optional().isBoolean(),
  handleValidation,
  inventorySettingsController.updateSettings,
);

router.delete(
  '/:clientId/import-templates/:templateId',
  requireRole('admin'),
  param('clientId').isInt({ min: 1 }).toInt(),
  param('templateId').isInt({ min: 1 }).toInt(),
  handleValidation,
  inventorySettingsController.deleteImportTemplate,
);

router.get(
  '/:clientId',
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  requireClientMatch,
  controller.getClientById,
);

router.post(
  '/add',
  requireRole('admin'),
  upload.single('logo'),
  body('name').isString().trim().notEmpty(),
  body('profile_key').optional().isIn(['general', 'resin', 'molded_parts', 'genmark_components']),
  handleValidation,
  controller.createClient,
);

router.put(
  '/:clientId',
  requireRole('admin'),
  upload.single('logo'),
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  controller.updateClient,
);

router.delete(
  '/:clientId',
  requireRole('admin'),
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  controller.deleteClient,
);

module.exports = router;
