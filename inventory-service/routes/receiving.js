const express = require('express');
const multer = require('multer');
const { body, query } = require('express-validator');
const {
  handleValidation,
  requireClientMatch,
  requireRole,
} = require('shared-auth');
const controller = require('../controllers/smartReceivingController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(requireRole('admin'));

router.post(
  '/extract',
  // Multipart fields are not available until Multer parses the request, so
  // client-scope enforcement intentionally follows upload.single().
  upload.single('document'),
  body('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  handleValidation,
  requireClientMatch,
  controller.extractDocument,
);

router.get(
  '/products',
  query('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  query('q').optional().isString().isLength({ max: 200 }),
  handleValidation,
  requireClientMatch,
  controller.searchProducts,
);

router.get(
  '/receipts',
  query('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  handleValidation,
  requireClientMatch,
  controller.listReceipts,
);

router.post(
  '/receipts',
  body('client_id').isInt({ min: 1 }).withMessage('client_id is required').toInt(),
  body('lines').isArray({ min: 1 }).withMessage('At least one receiving line is required'),
  body('supplier_name').optional({ nullable: true }).isString().isLength({ max: 250 }),
  body('po_number').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('packing_slip_number').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('coc_number').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('receiving_location_code').optional().isString().isLength({ max: 120 }),
  handleValidation,
  requireClientMatch,
  controller.createReceipt,
);

module.exports = router;
