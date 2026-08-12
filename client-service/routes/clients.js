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
const allowedLogoTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedLogoTypes.has(file.mimetype)) {
      const error = new Error('Logo must be a PNG, JPEG, or WebP image.');
      error.status = 415;
      return callback(error);
    }
    return callback(null, true);
  },
});

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
  body('name').isString().trim().notEmpty().isLength({ max: 160 }),
  body('profile_key').optional().isIn(['general', 'resin', 'molded_parts', 'genmark_components']),
  handleValidation,
  controller.createClient,
);

router.put(
  '/:clientId',
  requireRole('admin'),
  upload.single('logo'),
  param('clientId').isInt({ min: 1 }).toInt(),
  body('name').optional().isString().trim().notEmpty().isLength({ max: 160 }),
  body('barcode').optional({ nullable: true }).isString().trim().isLength({ max: 160 }),
  handleValidation,
  controller.updateClient,
);

router.post(
  '/:clientId/restore',
  requireRole('admin'),
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  controller.restoreClient,
);

router.delete(
  '/:clientId/permanent',
  requireRole('admin'),
  param('clientId').isInt({ min: 1 }).toInt(),
  body('confirm_name').isString().trim().notEmpty(),
  handleValidation,
  controller.permanentlyDeleteClient,
);

router.delete(
  '/:clientId',
  requireRole('admin'),
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  controller.deleteClient,
);

module.exports = router;
