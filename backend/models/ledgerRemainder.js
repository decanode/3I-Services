const LEDGER_REMAINDER_FIELDS = [
  'ledger_id',
  'ledger_name',
  'city',
  'debit',
  'credit',
  'nextCallDate',
  'lastComments',
  'lastUpdatedAt',
  'updatedByUserId',
  'sourceFileName',
  'group',
  'contact',
  'mobile',
  'email',
  'cname1',
  'cmob1',
  'cemail1',
  'cname2',
  'cmob2',
  'cemail2',
  'cname3',
  'cmob3',
  'cemail3',
];

const LEDGER_REMAINDER_COLLECTION_NAME = 'Ledger_Remainder';

function createLedgerRemainderEntry(ledger_id, ledger_name, city, debit = 0, credit = 0, nextCallDate = null, comments = null, group = null, contact = null, mobile = null, email = null) {
  const entry = {
    ledger_id: String(ledger_id || '').trim(),
    ledger_name: String(ledger_name || '').trim(),
    city: String(city || '').trim(),
    debit: parseFloat(debit || 0) || 0,
    credit: parseFloat(credit || 0) || 0,
  };
  
  // Add group if provided
  if (group && String(group).trim()) {
    entry.group = String(group).trim();
  }

  // Add contact if provided
  if (contact && String(contact).trim()) {
    entry.contact = String(contact).trim();
  }

  // Add mobile if provided
  if (mobile && String(mobile).trim()) {
    entry.mobile = String(mobile).trim();
  }

  // Add email if provided
  if (email && String(email).trim()) {
    entry.email = String(email).trim();
  }
  
  // Initialize nextCallDate as empty for user to fill in
  entry.nextCallDate = nextCallDate && String(nextCallDate).trim() ? String(nextCallDate).trim() : '';
  
  // Add optional comments if provided
  if (comments && String(comments).trim()) {
    entry.lastComments = String(comments).trim();
  }
  
  return entry;
}

function extractUniqueLedgerRemainders(records) {
  const seen = new Set();
  const remainders = [];

  for (const record of records) {
    const ledger_id = String(record.ledger_id || '').trim();
    
    // Skip if no ledger_id
    if (!ledger_id) continue;
    
    // Skip if we've already seen this ledger_id
    if (seen.has(ledger_id)) continue;
    
    seen.add(ledger_id);
    
    const entry = createLedgerRemainderEntry(
      record.ledger_id,
      record.ledger,
      record.city,
      0,  // debit - initialize to 0
      0,  // credit - initialize to 0
      null,  // nextCallDate - initialize as empty for user to populate
      null,  // comments
      record.group,  // group
      record.contact,  // contact
      record.mobile,  // mobile
      record.email  // email
    );
    
    // Only add if ledger_name exists
    if (entry.ledger_name) {
      remainders.push(entry);
    }
  }

  return remainders;
}

module.exports = {
  LEDGER_REMAINDER_FIELDS,
  LEDGER_REMAINDER_COLLECTION_NAME,
  createLedgerRemainderEntry,
  extractUniqueLedgerRemainders,
};
