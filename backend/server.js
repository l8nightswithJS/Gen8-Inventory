require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const fs      = require('fs')

const clientsRouter   = require('./routes/clients')
const inventoryRouter = require('./routes/inventory')
const usersRouter     = require('./routes/users')
const authRouter      = require('./routes/authRoutes')
const { PORT }        = require('./config')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploads
const uploadPath = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true })
}
app.use('/uploads', express.static(uploadPath))

// API routes
app.use('/api/auth',   authRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/items',  inventoryRouter)
app.use('/api/users',  usersRouter)

// Error handler
const errorHandler = require('./middleware/errorHandler')
app.use(errorHandler)

// Start
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})
