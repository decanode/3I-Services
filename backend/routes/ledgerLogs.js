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
 * GET /api/ledger-logs/export
 * Export logs as Excel file (date range, defaults to last 60 days)
 * MUST be before /:ledger_id to avoid param collision
 */
router.get('/export', authenticate, ledgerLogsController.exportLogs);

/**
 * GET /api/ledger-logs/paged?after={sequence_id}
 * Cursor-based pagination — exactly 15 reads per page.
 * MUST be before /:ledger_id to avoid param collision.
 */
router.get('/paged', authenticate, ledgerLogsController.listPaged);

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
