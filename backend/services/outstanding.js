const { db } = require('../config/firebase');
const { COLLECTION_NAME: EXCEL_MASTER_COLLECTION } = require('../models/excelMaster');
const ledgerRemainderService = require('./ledgerRemainder');
const ledgerLogsService = require('./ledgerLogs');
const counterService = require('./counter');

function parseDateFormat(dateStr) {
  if (!dateStr) return '';

  // If xlsx parses the cell as an actual Date, accept it.
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return '';  
    return dateStr.toISOString().slice(0, 10);
  }

  // If it's an Excel serial date (number), try convert.
  if (typeof dateStr === 'number' && Number.isFinite(dateStr)) {
    // Excel serial dates are typically in the ~40000-60000 range for modern years.
    // If it looks reasonable, convert using the common JS epoch mapping.
    if (dateStr > 1000 && dateStr < 100000) {
      const utc = new Date(Date.UTC(1899, 11, 30) + dateStr * 86400000);
      if (!isNaN(utc.getTime())) return utc.toISOString().slice(0, 10);
    }
    return '';
  }

  if (typeof dateStr !== 'string') return '';

  const s = dateStr.trim();
  if (!s) return '';

  // Accept ISO YYYY-MM-DD directly.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Match only dd/mm/yyyy or dd-mm-yyyy format (4-digit year REQUIRED)
  const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = s.match(dateRegex);

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validate date
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return '';
    }

    // Return ISO format (YYYY-MM-DD)
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Fallback: try JS Date parsing for strings like "2026-03-29T00:00:00Z"
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return '';
}

class OutstandingService {
  /**
   * Process outstanding records from Excel upload.
   *
   * Overall flow (4 steps):
   *  1. BATCH FETCH  — pre-load all matching master docs from Firestore in one go
   *                    (Firestore "in" query is capped at 30 IDs per call)
   *  2. PER-RECORD LOOP — for each Excel row: validate → parse → CREATE or UPDATE
   *     a. Ledger not in master                  → push to notFound, skip
   *     b. Category present but outside 1–6      → push "Invalid Category Found", skip
   *     c. Not yet in Outstanding_Remainder      → CREATE new document (category defaults to 5)
   *     d. Exists, nothing changed               → skip (prevents duplicate audit logs)
   *     e. Exists, something changed             → UPDATE document
   *  3. BATCH LOGS   — flush all collected audit entries to Firestore at once
   *  4. COUNTER UPDATE — refresh global upload stats (totals, last upload date)
   */
  async processOutstandingRecords(validRecords, userId = null, fileName = null) {
    const results = {
      processed: 0,
      found: [],
      notFound: [],
      updated: 0,
      logsCreated: 0,
    };

    if (!validRecords.length) {
      return results;
    }

    // ── STEP 1: BATCH FETCH ──────────────────────────────────────────────────
    // Pre-load all master docs we'll need so the per-record loop doesn't trigger
    // individual Firestore reads. Firestore "in" queries allow max 30 values per call,
    // so we chunk the ledger-ID list and merge results into a Map.
    const allLedgerIds = [...new Set(
      validRecords
        .map(r => String(r.ledger || '').trim().replace(/\s+/g, '').toUpperCase())
        .filter(Boolean)
    )];
    const masterDocs = new Map(); // ledger_id → full master doc data
    for (let i = 0; i < allLedgerIds.length; i += 30) {
      const idBatch = allLedgerIds.slice(i, i + 30);
      const snapshot = await db
        .collection(EXCEL_MASTER_COLLECTION)
        .where('ledger_id', 'in', idBatch)
        .get();
      snapshot.forEach(doc => masterDocs.set(doc.data().ledger_id, doc.data()));
    }

    // Collect log entries here; they are written to Firestore in one batch (Step 3)
    const logsToCreate = [];

    // ── STEP 2: PER-RECORD LOOP ──────────────────────────────────────────────
    for (const record of validRecords) {
      try {
        // Ledger ID = ledger name with all whitespace stripped, forced to uppercase.
        // Ensures "ABC Traders" and "ABCTraders" both resolve to "ABCTRADERS".
        const ledgerId = String(record.ledger || '')
          .trim()
          .replace(/\s+/g, '')
          .toUpperCase();

        if (!ledgerId) {
          results.notFound.push({
            ledger: record.ledger,
            reason: 'Invalid ledger name',
          });
          continue;
        }

        // ── 2a. MASTER VALIDATION ────────────────────────────────────────────
        // Every ledger in the Excel must exist in Excel_Master before we touch
        // Outstanding_Remainder. Prevents orphan records for unknown parties.
        if (!masterDocs.has(ledgerId)) {
          results.notFound.push({
            ledger: record.ledger,
            ledger_id: ledgerId,
            reason: 'Ledger not found in Excel master data',
          });
          continue;
        }

        // ── 2b. PARSE INCOMING VALUES ────────────────────────────────────────
        // Extract and normalise all fields from the Excel row before any DB work.
        const parsedDate = parseDateFormat(record.date);
        const newDebit = parseFloat(record.debit || 0) || 0;
        const newCredit = parseFloat(record.credit || 0) || 0;
        const newComments = String(record.comments || '').trim();

        // CATEGORY column sits next to CREDIT in the Excel template.
        // Three possible states:
        //  • Blank cell        → categoryProvided=false → preserve existing DB value (or default 5 on create)
        //  • Value 1–6         → valid; update DB to this number
        //  • Any other value   → invalid; reject record with "Invalid Category Found"
        const rawCatStr = String(record.category || '').trim();
        const categoryProvided = rawCatStr !== '';       // true when the Excel cell has any content
        const rawCat = parseInt(rawCatStr, 10);
        const newCategory = (rawCat >= 1 && rawCat <= 6) ? rawCat : null;
        // newCategory is null for both blank cells AND out-of-range/non-numeric values

        // ── 2b-i. INVALID CATEGORY GUARD ────────────────────────────────────
        // If a value was written in the CATEGORY cell but it is not 1–6,
        // reject this record and surface the error to the user via Alert.jsx.
        // We do NOT silently fall back to a default — the upload must be corrected.
        if (categoryProvided && newCategory === null) {
          results.notFound.push({
            ledger: record.ledger,
            ledger_id: ledgerId,
            reason: 'Invalid Category Found',
          });
          continue;
        }

        // ── 2c / 2d / 2e. OUTSTANDING_Remainder LOOKUP ──────────────────────
        // Determine whether this ledger already has an outstanding record in DB.
        // Find the ledger in Outstanding_Remainder for updating
        const ledgerSnapshot = await db
          .collection('Outstanding_Remainder')
          .where('ledger_id', '==', ledgerId)
          .limit(1)
          .get();

        if (ledgerSnapshot.empty) {
          // ── 2c. CREATE PATH ────────────────────────────────────────────────
          // Ledger exists in master but has no outstanding record yet.
          // Contact details (city, mobile, email) come from the master doc.
          // Financial fields (debit, credit, date, comments) come from the Excel row.
          // category defaults to 5 when the Excel cell was blank (newCategory is null).
          const masterData = masterDocs.get(ledgerId);
          const now = new Date().toISOString();
          const newRef = db.collection('Outstanding_Remainder').doc();
          const newRecord = {
            ledger_id: ledgerId,
            ledger_name: masterData.ledger || '',
            city: String(masterData.city || '').trim().toLowerCase(),
            group: String(record.group || masterData.group || '').trim(),
            contact: masterData.contact || '',
            mobile: masterData.mobile || '',
            email: masterData.email || '',
            debit: newDebit,
            credit: newCredit,
            category: newCategory ?? 5,
            nextCallDate: '',
            lastComments: newComments || '',
            lastTransactionDate: parsedDate || '',
            createdAt: now,
            createdByUserId: userId || null,
            sourceFileName: fileName || null,
            updatedAt: now,
            lastUpdatedAt: now,
            updatedByUserId: userId || null,
          };
          await newRef.set(newRecord);
          results.updated += 1;

          logsToCreate.push({
            ledger_id: ledgerId,
            ledger_name: newRecord.ledger_name,
            group: newRecord.group,
            category: newRecord.category,
            ldebit: newDebit,
            lcredit: newCredit,
            nextCallDate: '',
            date: parsedDate || String(record.date || '').trim(),
            comments: newComments,
            operation: 'insert',
            updatedFields: ['ldebit', 'lcredit', 'comments'],
            userId,
            city: newRecord.city,
          });

          results.found.push({ ledger: record.ledger, ledger_id: ledgerId, created: true,
            debit: newDebit, credit: newCredit });
          results.processed += 1;
          continue;
        }

        // ── 2d. UPDATE PATH ────────────────────────────────────────────────
        const ledgerDoc = ledgerSnapshot.docs[0];
        const ledgerRef = ledgerDoc.ref;
        const ledgerData = ledgerDoc.data();

        // Snapshot previous values for change detection and audit trail
        const previousDebit = ledgerData.debit || 0;
        const previousCredit = ledgerData.credit || 0;
        const previousDate = ledgerData.lastTransactionDate || '';
        const previousComments = ledgerData.lastComments || '';
        const previousCategory = ledgerData.category ?? null;

        // categoryWillChange is true only when Excel has a valid 1–6 value
        // that differs from what is already stored in the DB.
        const categoryWillChange = newCategory !== null && newCategory !== previousCategory;

        // ── 2d-i. DEDUPLICATION SKIP ─────────────────────────────────────
        // If debit, credit, date, comments AND category are all unchanged, skip
        // the write entirely to prevent duplicate audit log entries on re-upload.
        if (
          previousDebit === newDebit &&
          previousCredit === newCredit &&
          previousDate === (parsedDate || '') &&
          previousComments === newComments &&
          !categoryWillChange
        ) {
           results.found.push({
             ledger: record.ledger,
             ledger_id: ledgerId,
             skipped: true,
             reason: 'Data unchanged from previous upload'
           });
           continue;
        }

        // ── 2e. BUILD UPDATE PAYLOAD ──────────────────────────────────────
        // Debit and credit are REPLACED (not incremented) on every update.
        const updateData = {
          debit: newDebit,
          credit: newCredit,
          group: String(record.group || '').trim() || ledgerData.group,
          lastUpdatedAt: new Date().toISOString(),
          updatedByUserId: userId || null,
          sourceFileName: fileName || null,
        };

        // Store date only when the Excel cell had a parseable value
        if (parsedDate) {
          updateData.lastTransactionDate = parsedDate;
        }

        // Always overwrite comments (empty string is a valid clear-down)
        updateData.lastComments = newComments;

        // CATEGORY update rules:
        //  • blank cell  → newCategory=null → field NOT added → DB value preserved
        //  • valid 1–6 and different from DB → update DB to match Excel
        if (newCategory !== null) {
          updateData.category = newCategory;
        }

        await ledgerRef.update(updateData);

        results.updated += 1;

        // Track which fields actually changed so the UI can highlight them in the log history
        const changedFields = [];
        if (newDebit !== previousDebit) changedFields.push('ldebit');
        if (newCredit !== previousCredit) changedFields.push('lcredit');
        if (newComments !== previousComments) changedFields.push('comments');

        logsToCreate.push({
          ledger_id: ledgerId,
          ledger_name: ledgerData.ledger_name,
          group: String(record.group || '').trim() || ledgerData.group,
          category: newCategory ?? ledgerData.category,
          ldebit: newDebit,
          lcredit: newCredit,
          nextCallDate: '',
          date: parsedDate || String(record.date || '').trim(),
          comments: newComments,
          // Label as 'insert' when the record had zero balances before (first meaningful entry)
          operation: (previousDebit === 0 && previousCredit === 0) ? 'insert' : 'update',
          updatedFields: changedFields,
          userId,
          city: ledgerData.city || '',
        });

        results.found.push({
          ledger: record.ledger,
          ledger_id: ledgerId,
          debit: newDebit,
          credit: newCredit,
          date: parsedDate || record.date,
          comments: record.comments,
        });

        results.processed += 1;
      } catch (error) {
        console.error('Error processing outstanding record:', error);
        results.notFound.push({
          ledger: record.ledger,
          reason: `Error: ${error.message}`,
        });
      }
    }

    // ── STEP 3: BATCH LOGS ───────────────────────────────────────────────────
    // Write all collected audit log entries in a single batch call.
    // Batching avoids N individual Firestore writes; each log captures the
    // before/after snapshot of one ledger for the history/timeline views.
    if (logsToCreate.length) {
      try {
        const logResult = await ledgerLogsService.addLogs(logsToCreate);
        results.logsCreated = logResult.inserted;
      } catch (error) {
        console.error('Error creating logs:', error);
      }
    }

    // ── STEP 4: COUNTER UPDATE ───────────────────────────────────────────────
    // Refresh the global stats document: last upload filename, upload timestamp,
    // and aggregate totals (total ledger count, total debit, total credit).
    try {
      await counterService.updateOutstandingUpload(fileName);
    } catch (e) {
      console.error('[counter] outstanding upload update failed:', e);
    }

    return results;
  }

  /**
   * Get outstanding summary for a ledger
   */
  async getSummary(ledger_id) {
    try {
      const ledgerDoc = await db
        .collection('Outstanding_Remainder')
        .where('ledger_id', '==', ledger_id)
        .limit(1)
        .get();

      if (ledgerDoc.empty) {
        return null;
      }

      const data = ledgerDoc.docs[0].data();
      const logs = await ledgerLogsService.getLogsByLedgerId(ledger_id, { limit: 50 });

      return {
        ledger_id,
        ledger_name: data.ledger_name,
        city: data.city,
        debit: data.debit || 0,
        credit: data.credit || 0,
        logs,
      };
    } catch (error) {
      console.error('Error fetching summary:', error);
      return null;
    }
  }
}

module.exports = new OutstandingService();
