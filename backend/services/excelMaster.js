const { db } = require('../config/firebase');
const { COLLECTION_NAME, pickMasterFields, EXCEL_MASTER_FIELDS } = require('../models/excelMaster');
const ledgerRemainderService = require('./ledgerRemainder');
const counterService = require('./counterService');

const BATCH_MAX = 400;

// Business-data fields to compare when detecting real changes (excludes the key itself)
const DATA_FIELDS = EXCEL_MASTER_FIELDS.filter(f => f !== 'ledger_id');

function hasChanged(existingData, newRow) {
  for (const field of DATA_FIELDS) {
    if (String(existingData[field] ?? '') !== String(newRow[field] ?? '')) return true;
  }
  return false;
}

class ExcelMasterService {
  constructor() {
    this.collection = db.collection(COLLECTION_NAME);
  }

  async bulkInsert(rows, meta) {
    if (!rows.length) return { inserted: 0, updated: 0 };
    const { userId, fileName } = meta;
    const importedAt = new Date().toISOString();
    let inserted = 0;
    let updated = 0;

    // Deduplicate uploaded rows by ledger_id (last entry wins)
    const uniqueRowsMap = new Map();
    for (const row of rows) {
      if (row.ledger_id) {
        uniqueRowsMap.set(row.ledger_id, row);
      }
    }

    // Fetch existing ledger_ids, their refs AND their current data for diffing
    const existingDocs = new Map(); // ledger_id -> { ref, data }
    const ledgerIds = Array.from(uniqueRowsMap.keys());

    for (let i = 0; i < ledgerIds.length; i += 30) {
      const idBatch = ledgerIds.slice(i, i + 30);
      const snapshot = await this.collection.where('ledger_id', 'in', idBatch).get();
      snapshot.forEach(doc => {
        const data = doc.data();
        existingDocs.set(data.ledger_id, { ref: doc.ref, data });
      });
    }

    // Partition: new inserts, changed updates, and truly unchanged records
    const rowsToInsert = [];
    const rowsToUpdate = []; // only records where data actually differs
    const unchangedRows = [];
    for (const [ledgerId, row] of uniqueRowsMap) {
      if (existingDocs.has(ledgerId)) {
        const { ref, data: existingData } = existingDocs.get(ledgerId);
        if (hasChanged(existingData, row)) {
          rowsToUpdate.push({ row, ref });
        } else {
          unchangedRows.push(row);
        }
      } else {
        rowsToInsert.push(row);
      }
    }

    // Reserve sequential IDs for all new records in one atomic transaction,
    // then write them in batches outside the transaction.
    const newLedgerIdMap = new Map(); // ledger_id -> sequence_id (for new docs only)

    if (rowsToInsert.length > 0) {
      const { firstId } = await counterService.reserveMasterIds(rowsToInsert.length);

      for (let i = 0; i < rowsToInsert.length; i += BATCH_MAX) {
        const batch = db.batch();
        const chunk = rowsToInsert.slice(i, i + BATCH_MAX);
        for (let j = 0; j < chunk.length; j++) {
          const n = firstId + (i + j);
          const ref = this.collection.doc(`M${n}`);
          batch.set(ref, {
            ...chunk[j],
            sequence_id: n,
            importedAt,
            importedByUserId: userId || null,
            sourceFileName: fileName || null,
          });
          newLedgerIdMap.set(chunk[j].ledger_id, n);
          inserted += 1;
        }
        await batch.commit();
      }
    }

    // Update only records whose data actually changed (no counter increment)
    for (let i = 0; i < rowsToUpdate.length; i += BATCH_MAX) {
      const batch = db.batch();
      const chunk = rowsToUpdate.slice(i, i + BATCH_MAX);
      for (const { row, ref } of chunk) {
        const { ledger_id, ...fieldsToUpdate } = row;
        batch.update(ref, {
          ...fieldsToUpdate,
          importedAt,
          importedByUserId: userId || null,
          sourceFileName: fileName || null,
        });
        updated += 1;
      }
      await batch.commit();
    }

    // Populate Outstanding_Remainder for all rows (inserted + updated + unchanged).
    // newLedgerIdMap carries the sequence numbers so OR- docs get matching IDs.
    const allRows = [...rowsToInsert, ...rowsToUpdate.map(r => r.row), ...unchangedRows];
    try {
      await ledgerRemainderService.upsertFromExcelRecords(allRows, meta, newLedgerIdMap);
    } catch (error) {
      console.error('Error populating Outstanding_Remainder:', error);
    }

    return { inserted, updated };
  }

  async list(opts = {}) {
    const raw = opts.limit != null ? parseInt(String(opts.limit), 10) : 500;
    const limit = Math.min(Math.max(Number.isNaN(raw) ? 500 : raw, 1), 2000);
    const snapshot = await this.collection.orderBy('importedAt', 'desc').limit(limit).get();
    const rows = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const picked = pickMasterFields(data);
      if (data.ledger_id) picked.ledger_id = data.ledger_id;
      rows.push(picked);
    });
    return rows;
  }

  /**
   * Cursor-based paginated list — always reads exactly 15 documents.
   * Pass opts.after = sequence_id of the last visible row to advance the cursor.
   *
   * @param {{ after?: number }} opts
   * @returns {{ rows: object[], nextCursor: number|null }}
   */
  async listPaged(opts = {}) {
    let query = this.collection.orderBy('sequence_id', 'desc').limit(15);
    if (opts.after != null) {
      const after = parseInt(String(opts.after), 10);
      if (!Number.isNaN(after)) query = query.startAfter(after);
    }
    const snapshot = await query.get();
    const rows = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const picked = pickMasterFields(data);
      if (data.ledger_id) picked.ledger_id = data.ledger_id;
      if (data.sequence_id != null) picked.sequence_id = data.sequence_id;
      rows.push({ id: doc.id, ...picked });
    });
    return {
      rows,
      nextCursor: rows.length === 15 ? rows[rows.length - 1].sequence_id : null,
    };
  }

  async getByLedgerId(ledger_id) {
    const snapshot = await this.collection
      .where('ledger_id', '==', String(ledger_id).trim())
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    const picked = pickMasterFields(data);
    if (data.ledger_id) picked.ledger_id = data.ledger_id;
    return picked;
  }
}

module.exports = new ExcelMasterService();
