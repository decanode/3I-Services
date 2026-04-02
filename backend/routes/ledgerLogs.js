const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ledgerLogsController = require('../controllers/ledgerLogs');

/**
 * GET /api/ledger-logs
 * List all ledger logs
 */
router.get('/', authenticate, ledgerLogsController.list);

/**
 * GET /api/ledger-logs/:ledger_id
 * Get logs for a specific ledger
 */
router.get('/:ledger_id', authenticate, ledgerLogsController.getByLedgerId);

/**
 * PUT /api/ledger-logs/:logId
 * Update log entry with date and comments
 */
router.put('/:logId', authenticate, ledgerLogsController.update);

module.exports = router;
