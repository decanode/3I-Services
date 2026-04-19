/**
 * Outstanding Data Model
 * Stores outstanding ledger transactions with debit/credit values
 */

const OUTSTANDING_FIELDS = [
  'ledger',
  'group',
  'debit',
  'credit',
];

const OUTSTANDING_COLLECTION_NAME = 'Outstanding';

/**
 * Normalize header to match outstanding fields
 * Maps various header formats to standard field names
 */
function normalizeOutstandingHeader(header) {
  if (header == null || header === '') return '';
  
  const normalized = String(header)
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '');
  
  // Map common variations
  const headerMap = {
    'ledger': 'ledger',
    'ledgerid': 'ledger',
    'ledgername': 'ledger',
    'party': 'ledger',
    'partyname': 'ledger',
    'group': 'group',
    'groupname': 'group',
    'debit': 'debit',
    'dr': 'debit',
    'debitamt': 'debit',
    'credit': 'credit',
    'cr': 'credit',
    'creditamt': 'credit',
    'category': 'category',
    'seri': null, // Ignore serial column
    'serial': null,
    'sr': null,
    'slno': null,
  };
  
  const result = headerMap[normalized];
  return result === null ? '' : (result || '');
}

/**
 * Create an outstanding entry
 */
function createOutstandingEntry(ledger, group, debit, credit) {
  return {
    ledger: String(ledger || '').trim().toUpperCase(),
    group: String(group || '').trim(),
    debit: parseFloat(debit || 0) || 0,
    credit: parseFloat(credit || 0) || 0,
  };
}

/**
 * Parse outstanding Excel records from raw data
 */
function parseOutstandingRecords(headerMap, rows) {
  const records = [];
  
  for (const row of rows) {
    const entry = {
      ledger: '',
      group: '',
      debit: 0,
      credit: 0,
    };
    
    // Map columns using header map
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const field = headerMap[colIndex];
      if (!field) continue;
      
      const value = row[colIndex];
      if (value == null || value === '') continue;
      
      const stringValue = String(value).trim();
      
      if (field === 'debit' || field === 'credit') {
        entry[field] = parseFloat(stringValue) || 0;
      } else if (field === 'ledger') {
        entry[field] = stringValue.toUpperCase();
      } else {
        entry[field] = stringValue;
      }
    }
    
    // Only include if ledger exists
    if (entry.ledger) {
      records.push(entry);
    }
  }
  
  return records;
}

/**
 * Validate outstanding entry has required fields
 * Only requires ledger name to be present
 */
function isValidOutstandingEntry(entry) {
  return entry.ledger && entry.ledger.trim() !== '';
}

module.exports = {
  OUTSTANDING_FIELDS,
  OUTSTANDING_COLLECTION_NAME,
  normalizeOutstandingHeader,
  createOutstandingEntry,
  parseOutstandingRecords,
  isValidOutstandingEntry,
};
