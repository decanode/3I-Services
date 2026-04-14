const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const ledgerRemainderController = require('../controllers/ledgerRemainder');

router.get('/', authenticate, ledgerRemainderController.list);
router.get('/upcoming', authenticate, ledgerRemainderController.upcoming);
// /paged MUST come before /:ledger_id to avoid Express treating "paged" as a param
router.get('/paged', authenticate, ledgerRemainderController.listPaged);
router.get('/:ledger_id', authenticate, ledgerRemainderController.getById);
router.put('/:ledger_id', authenticate, ledgerRemainderController.update);
router.delete('/:ledger_id/customer/:slot', authenticate, adminOnly, ledgerRemainderController.deleteCustomerSlot);

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
