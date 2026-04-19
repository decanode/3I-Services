const XLSX = require('xlsx');
const {
  normalizeOutstandingHeader,
  parseOutstandingRecords,
  isValidOutstandingEntry,
} = require('../models/outstanding');

/**
 * Parse Outstanding Excel buffer
 * Identifies LEDGER, GROUP, DEBIT, CREDIT, DATE, COMMENTS columns
 * Handles various header formats and extra columns
 */
function parseOutstandingBuffer(buffer) {
  try {
    const workbook = XLSX.read(buffer, { 
      type: 'buffer', 
      cellDates: true, 
      raw: false 
    });

    if (!workbook.SheetNames.length) {
      return { 
        records: [], 
        validRecords: [],
        invalidRecords: [],
        error: 'Workbook has no sheets' 
      };
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (!matrix.length) {
      return { 
        records: [], 
        validRecords: [],
        invalidRecords: [],
        error: 'Sheet is empty' 
      };
    }

    // Auto-detect header fields in a template-robust way:
    // - Scan the first ~30 rows
    // - For each column index, pick the best recognized field name from any scanned header row
    // This handles merged/split headers like "SERIAL LEDGER" appearing across rows.
    const maxScanRows = Math.min(matrix.length, 30);
    const maxCols = matrix.slice(0, maxScanRows).reduce((m, row) => {
      const len = (row || []).length;
      return len > m ? len : m;
    }, 0);

    const fieldPriority = {
      ledger: 0,
      group: 1,
      debit: 2,
      credit: 3,
      date: 4,
      comments: 5,
      category: 6,
    };

    let lastRecognizedRow = -1;
    for (let row = 0; row < maxScanRows; row++) {
      const headerRow = matrix[row] || [];
      const recognizedCount = headerRow.reduce((count, cell) => {
        const normalized = normalizeOutstandingHeader(cell);
        return normalized !== '' ? count + 1 : count;
      }, 0);
      if (recognizedCount > 0) lastRecognizedRow = row;
    }

    if (lastRecognizedRow < 0 || maxCols === 0) {
      return {
        records: [],
        validRecords: [],
        invalidRecords: [],
        error:
          'Required columns not found. Excel must contain: SERIAL, LEDGER, GROUP, DEBIT, CREDIT',
      };
    }

    const dataStartIndex = lastRecognizedRow + 1;

    const isProbablyNumericString = (value) => {
      if (value == null) return false;
      const s = String(value).trim();
      if (!s) return false;
      // Numbers in excel parse as number; but we also support numeric strings.
      return /^-?\d+(\.\d+)?$/.test(s);
    };

    const guessLedgerColumnIndex = (rows, dataRowStart, dataRowEnd, candidateIndices) => {
      let bestIndex = null;
      let bestScore = -1;

      for (const c of candidateIndices) {
        let nonEmpty = 0;
        let nonNumeric = 0;
        let hasLetters = 0;

        for (let r = dataRowStart; r < dataRowEnd; r++) {
          const row = rows[r] || [];
          const v = row[c];
          if (v == null || v === '') continue;

          const s = String(v).trim();
          if (!s) continue;

          nonEmpty += 1;
          if (!isProbablyNumericString(s)) {
            nonNumeric += 1;
            if (/[a-zA-Z]/.test(s)) hasLetters += 1;
          }
        }

        if (nonEmpty === 0) continue;

        // Prefer columns that look like ledger names (non-numeric and usually containing letters).
        const score = nonNumeric + hasLetters * 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = c;
        }
      }

      return bestIndex;
    };

    const columnToField = Array.from({ length: maxCols }, () => null);
    const foundFields = new Set();

    for (let c = 0; c < maxCols; c++) {
      let bestField = null;
      let bestPriority = Infinity;

      for (let r = 0; r < maxScanRows; r++) {
        const cell = matrix[r]?.[c];
        const normalized = normalizeOutstandingHeader(cell);
        if (!normalized) continue;
        const p = fieldPriority[normalized] ?? 999;
        if (p < bestPriority) {
          bestPriority = p;
          bestField = normalized;
        }
      }

      if (bestField) {
        columnToField[c] = bestField;
        foundFields.add(bestField);
      }
    }

    // Check if required fields are found
    const requiredFields = ['ledger'];
    const hasAllRequired = requiredFields.every(field => foundFields.has(field));

    const looksLikeLedgerName = (value) => {
      if (value == null) return false;
      const s = String(value).trim();
      if (!s) return false;

      // Exclude obvious header junk
      const lower = s.toLowerCase();
      if (
        lower === 'serial' ||
        lower === 'ledger' ||
        lower === 'debit' ||
        lower === 'credit' ||
        lower === 'date' ||
        lower === 'comments' ||
        lower === 'category' ||
        lower.includes('serialledger') ||
        lower.includes('ledgeraccounts')
      ) {
        return false;
      }

      // Real ledger names should contain letters and not be purely numeric.
      if (!/[a-zA-Z]/.test(s)) return false;
      if (/^-?\d+(\.\d+)?$/.test(s)) return false;

      // Usually ledger names are at least a few characters.
      if (s.length < 3) return false;

      return true;
    };

    // If LEDGER wasn't recognized from the header (common with merged templates like "SERIAL LEDGER"),
    // try to guess the ledger-name column by sampling the first data rows.
    if (!hasAllRequired) {
      const dataStart = dataStartIndex;
      const dataEnd = Math.min(matrix.length, dataStart + 25);
      const candidateIndices = Array.from({ length: maxCols }, (_, i) => i);
      const guessedLedgerIndex = guessLedgerColumnIndex(
        matrix,
        dataStart,
        dataEnd,
        candidateIndices
      );

      if (guessedLedgerIndex == null) {
        return {
          records: [],
          validRecords: [],
          invalidRecords: [],
          error: `Required column "LEDGER" not found in headers. Found: ${Array.from(foundFields).join(', ') || 'none'}`,
        };
      }

      columnToField[guessedLedgerIndex] = 'ledger';
      foundFields.add('ledger');
    } else {
      // If a "ledger" header was detected but it mostly contains numeric values (likely the serial column),
      // remap ledger to the best non-numeric candidate column.
      const ledgerIndices = [];
      for (let c = 0; c < columnToField.length; c++) {
        if (columnToField[c] === 'ledger') ledgerIndices.push(c);
      }

      if (ledgerIndices.length) {
        const dataStart = dataStartIndex;
        const dataEnd = Math.min(matrix.length, dataStart + 25);

        const firstLedgerIndex = ledgerIndices[0];
        let nonEmpty = 0;
        let nonNumeric = 0;

        for (let r = dataStart; r < dataEnd; r++) {
          const row = matrix[r] || [];
          const v = row[firstLedgerIndex];
          if (v == null || v === '') continue;
          const s = String(v).trim();
          if (!s) continue;
          nonEmpty += 1;
          if (!isProbablyNumericString(s)) nonNumeric += 1;
        }

        const nonNumericRatio = nonEmpty ? nonNumeric / nonEmpty : 1;
        if (nonNumericRatio < 0.2) {
          const candidateIndices = Array.from({ length: maxCols }, (_, i) => i).filter(
            (i) => i !== firstLedgerIndex
          );
          const guessedLedgerIndex = guessLedgerColumnIndex(
            matrix,
            dataStart,
            dataEnd,
            candidateIndices
          );

          if (guessedLedgerIndex != null) {
            // Clear previous inferred ledger indices and set the guessed one.
            for (const idx of ledgerIndices) columnToField[idx] = null;
            columnToField[guessedLedgerIndex] = 'ledger';
          }
        }
      }
    }

    // Adjust where data parsing starts:
    // find the first row after header area that contains a "real" ledger name.
    const ledgerColumnIndexes = [];
    for (let c = 0; c < columnToField.length; c++) {
      if (columnToField[c] === 'ledger') ledgerColumnIndexes.push(c);
    }

    let effectiveDataStart = dataStartIndex;
    if (ledgerColumnIndexes.length) {
      const scanEnd = Math.min(matrix.length, dataStartIndex + 40);
      for (let r = dataStartIndex; r < scanEnd; r++) {
        const row = matrix[r] || [];
        const candidate = ledgerColumnIndexes
          .map((c) => row[c])
          .find((v) => looksLikeLedgerName(v));
        if (candidate != null) {
          effectiveDataStart = r;
          break;
        }
      }
    }

    // Parse data rows (start from row after headers)
    const allRecords = [];
    for (let r = effectiveDataStart; r < matrix.length; r++) {
      const row = matrix[r];
      
      // Skip completely empty rows
      if (!row || row.every(val => val == null || val === '')) {
        continue;
      }
      
      const entry = {
        ledger: '',
        group: '',
        debit: 0,
        credit: 0,
        date: '',
        comments: '',
        category: '',
      };

      for (let c = 0; c < row.length; c++) {
        const field = columnToField[c];
        if (!field) continue;

        const value = row[c];
        if (value == null || value === '') continue;

        const stringValue = String(value).trim();
        if (stringValue === '') continue;

        if (field === 'debit' || field === 'credit') {
          const numValue = parseFloat(stringValue);
          entry[field] = isNaN(numValue) ? 0 : numValue;
        } else if (field === 'category') {
          entry[field] = stringValue; // kept raw; service validates 1–6
        } else {
          entry[field] = stringValue;
        }
      }

      // If COMMENTS didn't map correctly (e.g., template header variation),
      // try to infer a likely comment from the right side of the row.
      if (!entry.comments) {
        const isDateLikeString = (s) => {
          if (!s) return false;
          return (
            /^\d{4}-\d{2}-\d{2}$/.test(s) ||
            /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)
          );
        };

        for (let c = row.length - 1; c >= 0; c--) {
          // Only consider columns we didn't map to a known field
          // (so we don't steal ledger/group/debit/credit/date values).
          if (columnToField[c]) continue;

          const v = row[c];
          if (v == null || v === '') continue;
          const s = String(v).trim();
          if (!s) continue;
          if (isDateLikeString(s)) continue;
          if (/^-?\d+(\.\d+)?$/.test(s)) continue; // numeric

          entry.comments = s;
          break;
        }
      }

      if (entry.ledger) {
        if (looksLikeLedgerName(entry.ledger)) {
          allRecords.push(entry);
        }
      }
    }

    if (!allRecords.length) {
      return {
        records: [],
        validRecords: [],
        invalidRecords: [],
        error: 'No data rows with ledger values found',
      };
    }

    // Separate valid and invalid records
    const validRecords = [];
    const invalidRecords = [];

    for (const record of allRecords) {
      if (isValidOutstandingEntry(record)) {
        validRecords.push(record);
      } else {
        invalidRecords.push({
          ...record,
          error: 'Missing ledger name',
        });
      }
    }

    return {
      records: allRecords,
      validRecords,
      invalidRecords,
      error: null,
    };
  } catch (error) {
    console.error('Error parsing outstanding buffer:', error);
    return {
      records: [],
      validRecords: [],
      invalidRecords: [],
      error: `Parsing error: ${error.message}`,
    };
  }
}

module.exports = { parseOutstandingBuffer };
