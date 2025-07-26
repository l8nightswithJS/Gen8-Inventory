// routes/clients.js
const express           = require('express')
const clientsController = require('../controllers/clientsController')
const multer            = require('multer')
const path              = require('path')

const router  = express.Router()

// ── Multer upload config ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'))
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})
const upload = multer({ storage })

// ── CLIENT CRUD ────────────────────────────────────────────────────────────────
router.get('/',             clientsController.getAllClients)
router.get('/:id',          clientsController.getClientById)
router.post('/',   upload.single('logo'), clientsController.createClient)
router.put('/:id', upload.single('logo'), clientsController.updateClient)
router.delete('/:id',       clientsController.deleteClient)

// ── NEW: Alerts for a client ──────────────────────────────────────────────────
// GET /api/clients/:id/alerts
router.get('/:id/alerts', clientsController.getClientAlerts)

module.exports = router
