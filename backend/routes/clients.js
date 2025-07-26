// routes/clients.js
const express           = require('express')
const clientsController = require('../controllers/clientsController')
const multer            = require('multer')
const path              = require('path')

const router = express.Router()

// … your upload setup and existing routes …
router.get('/',    clientsController.getAllClients)
router.get('/:id', clientsController.getClientById)

// ← NEW: list all alerts for a client
router.get('/:id/alerts', clientsController.getClientAlerts)

router.post('/',           upload.single('logo'), clientsController.createClient)
router.put('/:id',         upload.single('logo'), clientsController.updateClient)
router.delete('/:id',      clientsController.deleteClient)

module.exports = router
