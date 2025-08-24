// backend/routes/clients.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const clientsController = require('../controllers/clientsController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.use(authenticate);

// This route remains admin-only for a global view.
router.get('/', requireRole('admin'), clientsController.getAllClients);

// Specific routes for a user's own clients don't need an admin check.
// Note: I'm assuming you have a getUserClients function; if not, we can add it.
// router.get('/my-clients', clientsController.getUserClients);

// This allows any authenticated user to get a client by ID (RLS will check ownership).
router.get('/:id', clientsController.getClientById);

// Any authenticated user can create a client (RLS will enforce ownership).
router.post('/', upload.single('logo'), clientsController.createClient);

// Any authenticated user can attempt an update (RLS will check ownership).
router.put('/:id', upload.single('logo'), clientsController.updateClient);

// Any authenticated user can attempt a delete (RLS will check ownership).
router.delete('/:id', clientsController.deleteClient);

// This should likely remain admin-only as it's a high-level overview.
router.get(
  '/:id/alerts',
  requireRole('admin'),
  clientsController.getClientAlerts,
);

module.exports = router;
