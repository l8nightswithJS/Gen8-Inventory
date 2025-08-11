// backend/routes/clients.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const clientsController = require('../controllers/clientsController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

// Multer temp storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// All client routes require authentication
router.use(authenticate);

// CRUD
router.get('/', clientsController.getAllClients);
router.get('/:id', clientsController.getClientById);
router.post(
  '/',
  requireRole('admin'),
  upload.single('logo'),
  clientsController.createClient,
);
router.put(
  '/:id',
  requireRole('admin'),
  upload.single('logo'),
  clientsController.updateClient,
);
router.delete('/:id', requireRole('admin'), clientsController.deleteClient);

// Alerts by client
router.get('/:id/alerts', clientsController.getClientAlerts);

module.exports = router;
