/** Firestore collection: Excel_master — one document per spreadsheet row */

const EXCEL_MASTER_FIELDS = [
  'ledger_id',
  'code',
  'type',
  'ledger',
  'city',
  'group',
  'name',
  'address1',
  'address2',
  'address3',
  'pin',
  'email',
  'site',
  'contact',
  'phone1',
  'phone2',
  'mobile',
  'resi',
  'fax',
  'licence',
  'tin',
  'stno',
  'panno',
  'mr',
  'area',
  'rout',
  'tpt',
  'tptdlv',
  'bank',
  'bankadd1',
  'bankadd2',
  'branch',
  'crdays',
  'cramount',
  'limitbill',
  'limitday',
  'limittype',
  'freez',
  'sourcefilename-master'
];

const ALLOWED_FIELD_SET = new Set(EXCEL_MASTER_FIELDS);

/** Normalize Excel header text to match field keys (e.g. "Address 1" → address1) */
function normalizeHeaderName(header) {
  if (header == null || header === '') return '';
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '');
}

function emptyRecord() {
  return Object.fromEntries(EXCEL_MASTER_FIELDS.map((k) => [k, '']));
}

/** Keep only allowed keys; coerce values to trimmed strings */
function pickMasterFields(row) {
  const out = emptyRecord();
  for (const k of EXCEL_MASTER_FIELDS) {
    if (row[k] == null || row[k] === '') continue;
    const v = row[k];
    let fieldValue = '';
    if (typeof v === 'number' && !Number.isNaN(v)) {
      fieldValue = String(v);
    } else if (v instanceof Date) {
      fieldValue = v.toISOString().slice(0, 10);
    } else {
      fieldValue = String(v).trim();
    }
    
    // Convert ledger field to uppercase to act as primary key
    if (k === 'ledger') {
      out[k] = fieldValue.toUpperCase();
    } else if (k === 'city') {
      out[k] = fieldValue.toLowerCase();
    } else {
      out[k] = fieldValue;
    }
  }
  return out;
}

function isRowEmpty(record) {
  return EXCEL_MASTER_FIELDS.every((k) => !record[k]);
}

/** Generate ledger_id from ledger field by removing spaces and converting to uppercase */
function generateLedgerId(ledger) {
  if (!ledger || typeof ledger !== 'string') return '';
  return ledger.trim().replace(/\s+/g, '').toUpperCase();
}

module.exports = {
  EXCEL_MASTER_FIELDS,
  ALLOWED_FIELD_SET,
  normalizeHeaderName,
  emptyRecord,
  pickMasterFields,
  isRowEmpty,
  generateLedgerId,
  COLLECTION_NAME: 'Excel_master',
};
