const { db } = require('../config/firebase');
const { COLLECTION_NAME, pickMasterFields } = require('../models/excelMaster');
const ledgerRemainderService = require('./ledgerRemainder');

const BATCH_MAX = 400;

class ExcelMasterService {
  constructor() {
    this.collection = db.collection(COLLECTION_NAME);
  }
  async bulkInsert(rows, meta) {
    if (!rows.length) return 0;
    const { userId, fileName } = meta;
    const importedAt = new Date().toISOString();
    let inserted = 0;

    // Filter out duplicates based on ledger_id before inserting
    const uniqueRowsMap = new Map();
    
    // First, keep only the latest entry from the uploaded rows for each ledger_id
    for (const row of rows) {
      if (row.ledger_id) {
        uniqueRowsMap.set(row.ledger_id, row);
      }
    }

    // Now, fetch existing ledger_ids from the database to avoid re-inserting them
    const existingLedgerIds = new Set();
    const ledgerIdsToInsert = Array.from(uniqueRowsMap.keys());
    
    // We have to batch the 'in' query since Firestore limits it to 30 items
    for (let i = 0; i < ledgerIdsToInsert.length; i += 30) {
      const idBatch = ledgerIdsToInsert.slice(i, i + 30);
      const snapshot = await this.collection.where('ledger_id', 'in', idBatch).get();
      snapshot.forEach(doc => {
        existingLedgerIds.add(doc.data().ledger_id);
      });
    }

    // Filter out rows that already exist in the database
    const rowsToInsert = Array.from(uniqueRowsMap.values()).filter(
      row => !existingLedgerIds.has(row.ledger_id)
    );

    if (rowsToInsert.length === 0) {
       return 0; // Nothing new to insert
    }

    for (let i = 0; i < rowsToInsert.length; i += BATCH_MAX) {
      const batch = db.batch();
      const chunk = rowsToInsert.slice(i, i + BATCH_MAX);
      for (const row of chunk) {
        const ref = this.collection.doc();
        batch.set(ref, {
          ...row,
          importedAt,
          importedByUserId: userId || null,
          sourceFileName: fileName || null,
        });
        inserted += 1;
      }
      await batch.commit();
    }

    // After inserting Excel master records, populate Ledger_Remainder collection
    // We pass rowsToInsert so we only update remainders for the newly inserted ones 
    // or we can pass rows to update everyone. We pass rowsToInsert to be safe.
    try {
      await ledgerRemainderService.upsertFromExcelRecords(rowsToInsert, meta);
    } catch (error) {
      console.error('Error populating Ledger_Remainder:', error);
      // Continue even if ledger remainder fails to not break the upload
    }

    return inserted;
  }

  async list(opts = {}) {
    const raw = opts.limit != null ? parseInt(String(opts.limit), 10) : 500;
    const limit = Math.min(Math.max(Number.isNaN(raw) ? 500 : raw, 1), 2000);
    const snapshot = await this.collection.orderBy('importedAt', 'desc').limit(limit).get();
    const rows = [];
    snapshot.forEach((doc) => {
      rows.push(pickMasterFields(doc.data()));
    });
    return rows;
  }
}

module.exports = new ExcelMasterService();
