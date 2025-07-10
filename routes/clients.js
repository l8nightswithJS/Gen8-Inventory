const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clientsController');
const multer = require('multer');
const path = require('path');

// Upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Routes
router.get('/', clientsController.getAllClients);
router.get('/:id', clientsController.getClientById);
router.post('/', upload.single('logo'), clientsController.createClient);
router.put('/:id', upload.single('logo'), clientsController.updateClient); // ✅ ADD THIS
router.delete('/:id', clientsController.deleteClient);

module.exports = router;
