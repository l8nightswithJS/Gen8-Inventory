const express = require('express');
const multer = require('multer');
const { body, param } = require('express-validator');
const controller = require('../controllers/clientsController');
const { handleValidation, requireClientMatch } = require('shared-auth');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', controller.getAllClients);

router.get(
  '/:clientId',
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  requireClientMatch,
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
  '/:clientId',
  upload.single('logo'),
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  requireClientMatch,
  controller.updateClient,
);

router.delete(
  '/:clientId',
  param('clientId').isInt({ min: 1 }).toInt(),
  handleValidation,
  requireClientMatch,
  controller.deleteClient,
);

module.exports = router;
