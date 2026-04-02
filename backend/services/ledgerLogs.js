const { db } = require('../config/firebase');
const { LEDGER_LOGS_COLLECTION_NAME, createLedgerLogEntry } = require('../models/ledgerLogs');

const BATCH_MAX = 400;

class LedgerLogsService {
  constructor() {
    this.collection = db.collection(LEDGER_LOGS_COLLECTION_NAME);
  }

  /**
   * Add a log entry for ledger updates
   */
  async addLog(logData) {
    try {
      const logEntry = createLedgerLogEntry(logData);
      const ref = this.collection.doc();
      await ref.set(logEntry);
      return { success: true, id: ref.id };
    } catch (error) {
      console.error('Error adding ledger log:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add multiple log entries in batch
   */
  async addLogs(logs) {
    if (!logs.length) return { inserted: 0 };

    let inserted = 0;
    for (let i = 0; i < logs.length; i += BATCH_MAX) {
      const batch = db.batch();
      const chunk = logs.slice(i, i + BATCH_MAX);

      for (const logData of chunk) {
        const logEntry = createLedgerLogEntry(logData);
        const ref = this.collection.doc();
        batch.set(ref, logEntry);
        inserted += 1;
      }

      await batch.commit();
    }

    return { inserted };
  }

  /**
   * Get logs for a specific ledger
   */
  async getLogsByLedgerId(ledger_id, opts = {}) {
    try {
      const raw = opts.limit != null ? parseInt(String(opts.limit), 10) : 100;
      const limit = Math.min(Math.max(Number.isNaN(raw) ? 100 : raw, 1), 1000);

      const snapshot = await this.collection
        .where('ledger_id', '==', ledger_id)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const logs = [];
      snapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return logs;
    } catch (error) {
      console.error('Error fetching logs for ledger:', error);
      return [];
    }
  }

  /**
   * Get all logs with pagination
   */
  async list(opts = {}) {
    try {
      const raw = opts.limit != null ? parseInt(String(opts.limit), 10) : 500;
      const limit = Math.min(Math.max(Number.isNaN(raw) ? 500 : raw, 1), 2000);

      const snapshot = await this.collection
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const logs = [];
      snapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return logs;
    } catch (error) {
      console.error('Error listing logs:', error);
      return [];
    }
  }

  /**
   * Update log entry with date and comments
   */
  async updateLog(logId, updateData) {
    try {
      const { dateCalls, lastComments } = updateData;
      const updates = {};
      
      if (dateCalls) updates.date = dateCalls;
      if (lastComments) updates.lastComments = lastComments;
      updates.updatedAt = new Date().toISOString();
      
      await this.collection.doc(logId).update(updates);
      
      const updatedDoc = await this.collection.doc(logId).get();
      return {
        success: true,
        data: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        },
      };
    } catch (error) {
      console.error('Error updating log:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new LedgerLogsService();
