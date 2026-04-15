const { db } = require('../config/firebase');
const { LEDGER_LOGS_COLLECTION_NAME, createLedgerLogEntry } = require('../models/ledgerLogs');

const BATCH_MAX = 400;

class LedgerLogsService {
  constructor() {
    this.collection = db.collection(LEDGER_LOGS_COLLECTION_NAME);
  }

  /**
   * Add a single log entry with a sequential LL- document ID.
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
   * Add multiple log entries in batch.
   * All IDs are reserved in a single atomic transaction before any writes,
   * so the counter is only touched once regardless of how many logs are written.
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
   * Get logs for a specific ledger (ordered by timestamp, not sequence_id,
   * because this is a ledger-scoped view — not a global paginated list).
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
   * Get all logs with a simple limit (legacy endpoint — preserved for compatibility).
   */
  async list(opts = {}) {
    try {
      const raw = opts.limit != null ? parseInt(String(opts.limit), 10) : 500;
      const limit = Math.min(Math.max(Number.isNaN(raw) ? 500 : raw, 1), 2000);
      const city = opts.city ? String(opts.city).trim().toLowerCase() : null;

      let query = this.collection;
      if (city) {
        query = query.where('city', '==', city);
      }
      const snapshot = await query
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
   * Cursor-based paginated list — always reads exactly 15 documents.
   * Respects city-based access control when opts.city is provided.
   * Pass opts.after = sequence_id of the last visible row to advance the cursor.
   *
   * @param {{ after?: number, city?: string }} opts
   * @returns {{ rows: object[], nextCursor: number|null }}
   */
  async listPaged(opts = {}) {
    const city = opts.city ? String(opts.city).trim().toLowerCase() : null;
    let query = city
      ? this.collection.where('city', '==', city).orderBy('timestamp', 'desc').limit(15)
      : this.collection.orderBy('timestamp', 'desc').limit(15);
    if (opts.after != null) {
      query = query.startAfter(String(opts.after));
    }
    const snapshot = await query.get();
    const rows = [];
    snapshot.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
    return {
      rows,
      nextCursor: rows.length === 15 ? rows[rows.length - 1].timestamp : null,
    };
  }

  /**
   * Get logs within a date range for export.
   */
  async exportByDateRange(opts = {}) {
    try {
      const now = new Date();
      const defaultFrom = new Date(now);
      defaultFrom.setDate(defaultFrom.getDate() - 60);
      defaultFrom.setHours(0, 0, 0, 0);

      const from = opts.dateFrom ? new Date(opts.dateFrom) : defaultFrom;
      const to = opts.dateTo ? new Date(opts.dateTo) : new Date(now);
      to.setHours(23, 59, 59, 999);

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      const city = opts.city ? String(opts.city).trim().toLowerCase() : null;

      let query = this.collection
        .where('timestamp', '>=', fromISO)
        .where('timestamp', '<=', toISO);

      if (city) {
        query = query.where('city', '==', city);
      }

      const snapshot = await query
        .orderBy('timestamp', 'desc')
        .limit(5000)
        .get();

      const logs = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });

      return logs;
    } catch (error) {
      console.error('Error exporting logs by date range:', error);
      return [];
    }
  }

  /**
   * Update log entry with date and comments.
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
