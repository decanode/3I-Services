const { db } = require('../config/firebase');
const {
  LEDGER_REMAINDER_COLLECTION_NAME,
  extractUniqueLedgerRemainders,
} = require('../models/ledgerRemainder');
const counterService = require('./counter');

const BATCH_MAX = 400;

class LedgerRemainderService {
  constructor() {
    this.collection = db.collection(LEDGER_REMAINDER_COLLECTION_NAME);
  }

  async upsertFromExcelRecords(records, meta = {}) {
    const remainders = extractUniqueLedgerRemainders(records);
    
    if (!remainders.length) {
      return { inserted: 0, updated: 0 };
    }

    const { userId, fileName } = meta;
    const importedAt = new Date().toISOString();
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < remainders.length; i += BATCH_MAX) {
      const batch = db.batch();
      const chunk = remainders.slice(i, i + BATCH_MAX);

      for (const remainder of chunk) {
        // Query existing record by ledger_id
        const snapshot = await this.collection
          .where('ledger_id', '==', remainder.ledger_id)
          .limit(1)
          .get();

        let ref;
        if (snapshot.empty) {
          ref = this.collection.doc(); // auto-generated ID
          const newEntry = {
            ...remainder,
            nextCallDate: remainder.nextCallDate || '',
            createdAt: importedAt,
            createdByUserId: userId || null,
            sourceFileName: fileName || null,
            updatedAt: importedAt,
          };
          batch.set(ref, newEntry);
          inserted += 1;
        } else {
          // Update existing entry - preserve nextCallDate if it was already set
          ref = snapshot.docs[0].ref;
          const existingData = snapshot.docs[0].data();
          const updateData = {
            ...remainder,
            // Preserve existing nextCallDate if user has set it
            nextCallDate: existingData.nextCallDate !== undefined ? existingData.nextCallDate : (remainder.nextCallDate || ''),
            // Preserve existing debit/credit values set by outstanding upload
            debit: (existingData.debit !== undefined && existingData.debit !== null && existingData.debit !== 0)
              ? existingData.debit
              : (remainder.debit || 0),
            credit: (existingData.credit !== undefined && existingData.credit !== null && existingData.credit !== 0)
              ? existingData.credit
              : (remainder.credit || 0),
            updatedAt: importedAt,
            sourceFileName: fileName || null,
          };
          batch.update(ref, updateData);
          updated += 1;
        }
      }

      await batch.commit();
    }

    // Update counter: totaldebit, totalcredit (fire-and-forget)
    counterService.updateLedgerTotals().catch(e =>
      console.error('[counter] totals update failed:', e));

    return { inserted, updated };
  }

  async list(opts = {}) {
    const raw = opts.limit != null ? parseInt(String(opts.limit), 10) : 500;
    const limit = Math.min(Math.max(Number.isNaN(raw) ? 500 : raw, 1), 2000);
    const city = opts.city ? String(opts.city).trim().toLowerCase() : null;

    try {
      let query = this.collection;
      if (city) {
        query = query.where('city', '==', city);
      }
      const snapshot = await query
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .get();

      return this._processLedgerDocs(snapshot.docs);
    } catch (error) {
      let query = this.collection;
      if (city) {
        query = query.where('city', '==', city);
      }
      const snapshot = await query.limit(limit).get();
      return this._processLedgerDocs(snapshot.docs);
    }
  }

  async getUpcomingRemainders(opts = {}) {
    const days = opts.days || 7;
    const resultLimit = opts.limit != null ? Math.min(parseInt(String(opts.limit), 10) || 50, 200) : 50;
    const city = opts.city ? String(opts.city).trim().toLowerCase() : null;

    // YYYY-MM-DD strings sort lexicographically — Firestore can range-filter them directly.
    // Required Firestore indexes:
    //   - Single field: nextCallDate (ASC)
    //   - Composite (city filter): city (ASC), nextCallDate (ASC)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);
    const endDateStr = endDate.toISOString().split('T')[0];

    try {
      let query = this.collection
        .where('nextCallDate', '>=', todayStr)
        .where('nextCallDate', '<=', endDateStr)
        .orderBy('nextCallDate', 'asc')
        .limit(resultLimit);

      if (city) {
        // Composite index required: (city ASC, nextCallDate ASC)
        query = this.collection
          .where('city', '==', city)
          .where('nextCallDate', '>=', todayStr)
          .where('nextCallDate', '<=', endDateStr)
          .orderBy('nextCallDate', 'asc')
          .limit(resultLimit);
      }

      const snapshot = await query.get();

      // Batch user lookups — collect unique updatedByUserId refs, fetch in one shot
      const docs = snapshot.docs;
      const userIds = [...new Set(docs.map(d => d.data().updatedByUserId).filter(Boolean))];
      const userMap = {};
      if (userIds.length > 0) {
        const userRefs = userIds.map(uid => db.collection('users').doc(uid));
        const userDocs = await db.getAll(...userRefs);
        for (const ud of userDocs) {
          if (ud.exists) userMap[ud.id] = ud.data().firstName || '-';
        }
      }

      const seen = new Set();
      const rows = [];
      for (const doc of docs) {
        const data = doc.data();
        const ledgerId = String(data.ledger_id || '').trim();
        if (seen.has(ledgerId)) continue;
        seen.add(ledgerId);

        rows.push({
          id: doc.id,
          ...data,
          firstName: userMap[data.updatedByUserId] || '-',
          debit: data.debit != null ? parseFloat(data.debit) : 0,
          credit: data.credit != null ? parseFloat(data.credit) : 0,
          group: data.group || '-',
          // lastComments is already stored on the record — no cross-collection fetch needed
        });
      }

      return rows;
    } catch (error) {
      console.error('[getUpcomingRemainders] Error:', error.message);
      return [];
    }
  }

  async _processLedgerDocs(docs) {
    const rows = [];
    for (const doc of docs) {
      const data = doc.data();
      const row = {
        id: doc.id,
        ...data,
        firstName: '-',
        debit: data.debit !== undefined && data.debit !== null ? parseFloat(data.debit) : 0,
        credit: data.credit !== undefined && data.credit !== null ? parseFloat(data.credit) : 0,
        group: data.group || '-',
      };

      // Fetch user information if updatedByUserId exists
      if (data.updatedByUserId) {
        try {
          const userDoc = await db.collection('users').doc(data.updatedByUserId).get();
          if (userDoc.exists) {
            row.firstName = userDoc.data().firstName || '-';
          }
        } catch (error) {
          console.error('Error fetching user info for', data.updatedByUserId, ':', error.message);
        }
      }

      rows.push(row);
    }
    return rows;
  }

  async getByLedgerId(ledger_id) {
    const snapshot = await this.collection
      .where('ledger_id', '==', String(ledger_id).trim())
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    const row = {
      id: doc.id,
      ...data,
      firstName: '-',
      debit: data.debit !== undefined && data.debit !== null ? parseFloat(data.debit) : 0,
      credit: data.credit !== undefined && data.credit !== null ? parseFloat(data.credit) : 0,
      group: data.group || '-',
    };
    if (data.updatedByUserId) {
      try {
        const userDoc = await db.collection('users').doc(data.updatedByUserId).get();
        if (userDoc.exists) row.firstName = userDoc.data().firstName || '-';
      } catch (_) { /* non-critical */ }
    }
    return row;
  }


  async listPaged(opts = {}) {
    const city = opts.city ? String(opts.city).trim().toLowerCase() : null;
    // Sort: nextCallDate DESC (records with a date set appear before undated ''), then ledger_id ASC as tiebreaker.
    // Requires composite indexes: [nextCallDate DESC, ledger_id ASC] and [city ASC, nextCallDate DESC, ledger_id ASC].
    let query = city
      ? this.collection.where('city', '==', city).orderBy('nextCallDate', 'desc').orderBy('ledger_id', 'asc').limit(15)
      : this.collection.orderBy('nextCallDate', 'desc').orderBy('ledger_id', 'asc').limit(15);
    if (opts.after != null) {
      // Composite cursor: { nextCallDate, ledger_id } from the last row of the previous page.
      query = query.startAfter(opts.after.nextCallDate ?? '', opts.after.ledger_id);
    }
    const snapshot = await query.get();
    const rows = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      rows.push({
        id: doc.id,
        ...data,
        debit: data.debit != null ? parseFloat(data.debit) : 0,
        credit: data.credit != null ? parseFloat(data.credit) : 0,
        group: data.group || '-',
      });
    });
    const lastRow = rows.length === 15 ? rows[rows.length - 1] : null;
    return {
      rows,
      nextCursor: lastRow ? { nextCallDate: lastRow.nextCallDate ?? '', ledger_id: lastRow.ledger_id } : null,
    };
  }

  async delete(id) {
    try {
      await this.collection.doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting ledger remainder:', error);
      return false;
    }
  }

  async updateByLedgerId(ledger_id, updateData = {}, meta = {}) {
    try {
      const snapshot = await this.collection
        .where('ledger_id', '==', String(ledger_id).trim())
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new Error(`Ledger not found for id: ${ledger_id}`);
      }

      const docRef = snapshot.docs[0].ref;
      const docData = snapshot.docs[0].data();

      const updatePayload = {
        updatedAt: new Date().toISOString(),
      };

      // Handle lastComments if provided — maintain max 5 comments array
      if (updateData.hasOwnProperty('lastComments') && updateData.lastComments !== null && updateData.lastComments !== undefined) {
        const incomingComment = String(updateData.lastComments).trim();

        if (incomingComment) {
          // Get existing comments array
          let commentsArray = Array.isArray(docData.lastComments) ? [...docData.lastComments] : [];

          // Add new comment with timestamp
          const newCommentEntry = {
            text: incomingComment,
            date: new Date().toISOString(),
            userId: meta.userId || null,
          };

          commentsArray.push(newCommentEntry);

          // Keep only last 5 comments (FIFO — remove oldest when 6th is added)
          if (commentsArray.length > 5) {
            commentsArray = commentsArray.slice(-5);
          }

          updatePayload.lastComments = commentsArray;
        } else {
          // If empty comment provided, keep existing comments
          updatePayload.lastComments = Array.isArray(docData.lastComments) ? docData.lastComments : [];
        }
      } else {
        // If lastComments not in updateData, preserve existing
        if (!updateData.hasOwnProperty('lastComments')) {
          updatePayload.lastComments = Array.isArray(docData.lastComments) ? docData.lastComments : [];
        }
      }

      // Copy all other fields from updateData to updatePayload
      Object.keys(updateData).forEach(key => {
        if (key !== 'lastComments') { // Skip lastComments as we've already handled it
          updatePayload[key] = updateData[key];
        }
      });

      await docRef.update(updatePayload);

      // Update counter totals if debit or credit changed
      if ('debit' in updatePayload || 'credit' in updatePayload) {
        counterService.updateLedgerTotals().catch(e =>
          console.error('[counter] totals update failed:', e));
      }

      const updatedDoc = await docRef.get();
      return {
        success: true,
        data: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        },
      };
    } catch (error) {
      console.error('[LedgerRemainderService] Error updating ledger remainder:', error.message);
      throw error;
    }
  }
}

module.exports = new LedgerRemainderService();
