const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ledgerRemainderController = require('../controllers/ledgerRemainder');

router.get('/', authenticate, ledgerRemainderController.list);
router.get('/upcoming', authenticate, ledgerRemainderController.upcoming);
router.put('/:ledger_id', authenticate, ledgerRemainderController.update);

// Debug endpoint to test customer data
router.post('/debug/test', authenticate, (req, res) => {
  console.log('[DEBUG] Received request body:', JSON.stringify(req.body, null, 2));
  res.json({
    message: 'Debug data received',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
