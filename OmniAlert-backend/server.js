require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

// Route Imports
const aiRoutes = require('./routes/aiRoutes');
const evacuationRoutes = require('./routes/evacuationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sosRoutes = require('./routes/sosRoutes');
const cors = require('cors');

// Cron Jobs
const startWeatherCron = require('./cron/weatherCron');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/omnialert', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected correctly to OmniAlert Database'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Mount Routes
app.use('/api/ai', aiRoutes);
app.use('/api/evacuate', evacuationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/users', require('./routes/userRoutes'));

// Root route
app.get('/', (req, res) => res.send('OmniAlert API is Running'));

// Start Cron Jobs
startWeatherCron();

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT} and listening on 0.0.0.0`);
});
