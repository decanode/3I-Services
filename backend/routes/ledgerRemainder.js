const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ledgerRemainderController = require('../controllers/ledgerRemainder');

router.get('/', authenticate, ledgerRemainderController.list);
router.get('/upcoming', authenticate, ledgerRemainderController.upcoming);
router.put('/:ledger_id', authenticate, ledgerRemainderController.update);

module.exports = router;
