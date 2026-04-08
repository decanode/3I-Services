const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const passwordController = require('./controllers/password');
dotenv.config();

// Routes
const authRoutes = require('./routes/auth');
const signupRoutes = require('./routes/signup');
const passwordRoutes = require('./routes/password');
const userRoutes = require('./routes/user');
const excelMasterRoutes = require('./routes/excelMaster');
const ledgerRemainderRoutes = require('./routes/ledgerRemainder');
const ledgerLogsRoutes = require('./routes/ledgerLogs');
const adminDashboardRoutes = require('./routes/adminDashboard');
const seederRoutes = require('./routes/seeder');

const app = express();
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cookie parsing
app.use(cookieParser());

// JSON parsing
app.use('/api', express.json());

// Static files
app.use(express.static(frontendPath, {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/signup', signupRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/user', userRoutes);
app.use('/api/excel', excelMasterRoutes);
app.use('/api/ledger-remainder', ledgerRemainderRoutes);
app.use('/api/ledger-logs', ledgerLogsRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/seed', seederRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT ;
// OTP cleanup runs once per OTP validity period
const OTP_VALID_TIME = (parseInt(process.env.OTP_VALID_TIME) || 120) * 1000;
setInterval(async () => {
  try {
    await passwordController.cleanupExpired();
  } catch (error) {
    console.error('OTP cleanup error:', error);
  }
}, OTP_VALID_TIME);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
