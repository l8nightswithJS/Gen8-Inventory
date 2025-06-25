const express = require('express');
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/clientsController');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const upload = multer({ storage });

// -- DO NOT add expressApp here --
// Serve /uploads in server.js/app.js (see above)

// Upload logo endpoint
router.post('/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  // Build accessible URL for client frontend
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

router.get('/', controller.getAllClients);
router.get('/:id', controller.getClientById);
router.post('/', controller.createClient);
router.put('/:id', controller.updateClient);

module.exports = router;
