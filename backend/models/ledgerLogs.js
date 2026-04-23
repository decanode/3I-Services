const LEDGER_LOGS_FIELDS = [
  'ledger_id',
  'ledger_name',
  'group',
  'category',
  'ldebit',
  'lcredit',
  'nextCallDate',
  'date',
  'comments',
  'operation', // 'insert' or 'update'
  'updatedFields', // array of field names that were changed in this log
  'timestamp',
  'createdByUserId',
  'city',
];

const LEDGER_LOGS_COLLECTION_NAME = 'Ledger_logs';

/**
 * Create a ledger log entry
 */
function createLedgerLogEntry({
  ledger_id,
  ledger_name,
  group,
  category,
  ldebit,
  lcredit,
  nextCallDate,
  date,
  comments,
  operation,
  updatedFields,
  userId,
  city,
}) {
  return {
    ledger_id: String(ledger_id || '').trim(),
    ledger_name: String(ledger_name || '').trim(),
    group: String(group || '').trim(),
    category: category != null ? parseInt(category, 10) || null : null,
    ldebit: parseFloat(ldebit || 0) || 0,
    lcredit: parseFloat(lcredit || 0) || 0,
    nextCallDate: String(nextCallDate || '').trim(),
    date: String(date || '').trim(),
    comments: String(comments || '').trim(),
    operation: String(operation || 'insert').trim(),
    updatedFields: Array.isArray(updatedFields) ? updatedFields : [],
    timestamp: new Date().toISOString(),
    createdByUserId: userId || null,
    city: String(city || '').trim().toLowerCase(),
  };
}

module.exports = {
  LEDGER_LOGS_FIELDS,
  LEDGER_LOGS_COLLECTION_NAME,
  createLedgerLogEntry,
};
