const LEDGER_LOGS_FIELDS = [
  'ledger_id',
  'ledger_name',
  'group',
  'debit',
  'credit',
  'date',
  'comments',
  'previous_debit',
  'previous_credit',
  'operation', // 'insert' or 'update'
  'timestamp',
  'createdByUserId',
];

const LEDGER_LOGS_COLLECTION_NAME = 'Ledger_logs';

/**
 * Create a ledger log entry
 */
function createLedgerLogEntry({
  ledger_id,
  ledger_name,
  group,
  debit,
  credit,
  date,
  comments,
  previous_debit,
  previous_credit,
  operation,
  userId,
}) {
  return {
    ledger_id: String(ledger_id || '').trim(),
    ledger_name: String(ledger_name || '').trim(),
    group: String(group || '').trim(),
    debit: parseFloat(debit || 0) || 0,
    credit: parseFloat(credit || 0) || 0,
    date: String(date || '').trim(),
    comments: String(comments || '').trim(),
    previous_debit: parseFloat(previous_debit || 0) || 0,
    previous_credit: parseFloat(previous_credit || 0) || 0,
    operation: String(operation || 'insert').trim(),
    timestamp: new Date().toISOString(),
    createdByUserId: userId || null,
  };
}

module.exports = {
  LEDGER_LOGS_FIELDS,
  LEDGER_LOGS_COLLECTION_NAME,
  createLedgerLogEntry,
};
