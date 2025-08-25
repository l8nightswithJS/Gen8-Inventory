require('dotenv').config();
const express = require('express');
const cors = require('cors');

// We will create these files in the next step
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`✅ Auth service listening on :${PORT}`);
});
