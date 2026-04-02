const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const signupController = require('../controllers/signup');
const { sendEmailToAdmin } = require('../utils/mailer');

// Public
router.post('/register', signupController.register);

// Test endpoint - send test email to admin
router.get('/test-admin-email', async (req, res) => {
  try {
    console.log('[TEST] Sending test email to admin...');
    console.log(`[TEST] ADMIN_EMAIL env: ${process.env.ADMIN_EMAIL}`);
    console.log(`[TEST] EMAIL_USER env: ${process.env.EMAIL_USER}`);
    
    await sendEmailToAdmin({
      requestId: 'TEST-' + Date.now(),
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      phone: '9999999999',
      dob: '2000-01-01'
    });
    
    res.status(200).json({ 
      message: 'Test email sent successfully',
      adminEmail: process.env.ADMIN_EMAIL,
      fromEmail: process.env.EMAIL_USER
    });
  } catch (error) {
    console.error('[TEST] Error:', error);
    res.status(500).json({ 
      error: error.message,
      adminEmail: process.env.ADMIN_EMAIL,
      fromEmail: process.env.EMAIL_USER
    });
  }
});

// Admin
router.get('/pending', authenticate, adminOnly, signupController.getPending);
router.get('/requests', authenticate, adminOnly, signupController.getAll);
router.put('/approve/:id', authenticate, adminOnly, signupController.approve);
router.put('/reject/:id', authenticate, adminOnly, signupController.reject);

module.exports = router;
