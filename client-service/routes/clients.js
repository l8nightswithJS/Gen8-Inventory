const express = require('express');
const multer = require('multer');
const { body, param } = require('express-validator');
const controller = require('../controllers/clientsController');
const { handleValidation } = require('shared-auth');

const router = express.Router();

// ✅ FIX: Configure multer to store files in memory as buffers
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/', controller.getAllClients);

router.get(
  '/:id',
  param('id').isInt(),
  handleValidation,
  controller.getClientById,
);

router.post(
  '/add',
  upload.single('logo'),
  body('name').isString().trim().notEmpty(),
  handleValidation,
  controller.createClient,
);

router.put(
  '/:id',
  upload.single('logo'),
  param('id').isInt(),
  handleValidation,
  controller.updateClient,
);

router.delete(
  '/:id',
  param('id').isInt(),
  handleValidation,
  controller.deleteClient,
);

module.exports = router;
