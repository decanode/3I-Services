const { db } = require('../config/firebase');
const {
  LEDGER_REMAINDER_COLLECTION_NAME,
  extractUniqueLedgerRemainders,
} = require('../models/ledgerRemainder');

const BATCH_MAX = 400;

class LedgerRemainderService {
  constructor() {
    this.collection = db.collection(LEDGER_REMAINDER_COLLECTION_NAME);
  }

  async upsertFromExcelRecords(records, meta = {}) {
    const remainders = extractUniqueLedgerRemainders(records);
    
    if (!remainders.length) {
      console.log('[upsertFromExcelRecords] No remainders to upsert');
      return { inserted: 0, updated: 0 };
    }

    const { userId, fileName } = meta;
    const importedAt = new Date().toISOString();
    let inserted = 0;
    let updated = 0;

    console.log('[upsertFromExcelRecords] Processing', remainders.length, 'ledger remainder records');

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
          // Create new entry with empty nextCallDate for user to populate
          ref = this.collection.doc();
          const newEntry = {
            ...remainder,
            // Ensure nextCallDate is initialized as empty
            nextCallDate: remainder.nextCallDate || '',
            createdAt: importedAt,
            createdByUserId: userId || null,
            sourceFileName: fileName || null,
            updatedAt: importedAt,
          };
          console.log('[upsertFromExcelRecords] Creating new record:', remainder.ledger_id, 'with empty nextCallDate');
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
            updatedAt: importedAt,
            sourceFileName: fileName || null,
          };
          console.log('[upsertFromExcelRecords] Updating record:', remainder.ledger_id, 'preserving nextCallDate:', updateData.nextCallDate);
          batch.update(ref, updateData);
          updated += 1;
        }
      }

      await batch.commit();
    }

    console.log('[upsertFromExcelRecords] Complete - Inserted:', inserted, 'Updated:', updated);
    return { inserted, updated };
  }

  async list(opts = {}) {
    const raw = opts.limit != null ? parseInt(String(opts.limit), 10) : 500;
    const limit = Math.min(Math.max(Number.isNaN(raw) ? 500 : raw, 1), 2000);
    
    try {
      // Try to order by updatedAt if available
      const snapshot = await this.collection
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .get();
      
      console.log('Ledger Remainder list - found', snapshot.docs.length, 'documents with updatedAt');
      return this._processLedgerDocs(snapshot.docs);
    } catch (error) {
      // Fallback: if updatedAt ordering fails, just fetch without ordering
      console.warn('updatedAt ordering failed, using fallback:', error.message);
      const snapshot = await this.collection.limit(limit).get();
      
      console.log('Ledger Remainder list (fallback) - found', snapshot.docs.length, 'documents');
      return this._processLedgerDocs(snapshot.docs);
    }
  }

  async getUpcomingRemainders(opts = {}) {
    const days = opts.days || 7;
    // resultLimit is applied AFTER filtering, not on the Firestore query
    const resultLimit = opts.limit != null ? parseInt(String(opts.limit), 10) : 500;
    // Fetch more records from Firestore to ensure we find enough matches
    const fetchLimit = 2000;

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);

      console.log('[getUpcomingRemainders] TODAY:', today.toISOString().split('T')[0], 'END_DATE:', endDate.toISOString().split('T')[0]);

      // Get all remainders - we'll filter by date in the application
      const snapshot = await this.collection
        .limit(fetchLimit)
        .get();

      console.log('[getUpcomingRemainders] Total records fetched:', snapshot.size);

      const rows = [];
      const seen = new Set();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const nextCallDate = data.nextCallDate;
        const ledgerId = String(data.ledger_id || '').trim();

        console.log('[getUpcomingRemainders] Processing doc:', {
          id: doc.id,
          ledger_id: ledgerId,
          ledger_name: data.ledger_name,
          hasDate: !!nextCallDate,
          dateValue: nextCallDate,
        });

        // Avoid duplicates
        if (seen.has(ledgerId)) {
          console.log('[getUpcomingRemainders] Skipping duplicate:', ledgerId);
          continue;
        }
        seen.add(ledgerId);

        try {
          let transactionDate;

          // Skip records without nextCallDate - don't show them at all
          if (!nextCallDate) {
            console.log('[getUpcomingRemainders] Skipping record without date:', ledgerId);
            continue;
          }

          const dateStr = String(nextCallDate).trim();
          // Handle various date formats (YYYY-MM-DD, ISO string, etc.)
          let parsedDate;
          
          // Try parsing as ISO string first
          if (dateStr.includes('T')) {
            parsedDate = new Date(dateStr);
          } else if (dateStr.includes('-')) {
            // Parse YYYY-MM-DD format
            const [year, month, day] = dateStr.split('-').map(Number);
            parsedDate = new Date(year, month - 1, day);
          } else {
            // Try native Date parsing as fallback
            parsedDate = new Date(dateStr);
          }
          
          // Validate the parsed date
          if (isNaN(parsedDate.getTime())) {
            console.log('[getUpcomingRemainders] Invalid date format, skipping:', ledgerId, '-> raw:', dateStr);
            continue;
          }
          
          transactionDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
          console.log('[getUpcomingRemainders] Record with date:', ledgerId, '-> raw:', dateStr, '-> parsed:', transactionDate.toISOString().split('T')[0]);

          // Check if date is within next 7 days
          if (transactionDate >= today && transactionDate <= endDate) {
            const row = {
              id: doc.id,
              ...data,
              // Keep the nextCallDate as is (it has a value)
              nextCallDate: nextCallDate,
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
                console.error('Error fetching user info:', error.message);
              }
            }

            console.log('[getUpcomingRemainders] ✓ Adding row:', { ledger_name: row.ledger_name, date: row.nextCallDate });
            rows.push(row);
          } else {
            console.log('[getUpcomingRemainders] ✗ Date out of range:', ledgerId, '-> date:', transactionDate.toISOString().split('T')[0]);
          }
        } catch (error) {
          console.error('Error parsing date:', nextCallDate, error.message);
        }
      }

      // Sort by date
      rows.sort((a, b) => {
        const dateA = new Date(a.nextCallDate);
        const dateB = new Date(b.nextCallDate);
        return dateA - dateB;
      });

      // Apply result limit AFTER filtering
      const limitedRows = rows.slice(0, resultLimit);
      
      console.log('[getUpcomingRemainders] ✓ FINAL - found', rows.length, 'items in next', days, 'days, returning', limitedRows.length);
      return limitedRows;
    } catch (error) {
      console.error('Error fetching upcoming remainders:', error);
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
        // Ensure debit and credit are always present with defaults
        debit: data.debit !== undefined && data.debit !== null ? parseFloat(data.debit) : 0,
        credit: data.credit !== undefined && data.credit !== null ? parseFloat(data.credit) : 0,
        // Ensure group is present
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
    
    console.log('Ledger Remainder list - returning', rows.length, 'rows');
    if (rows.length > 0) {
      console.log('Sample row:', rows[0]);
    }
    return rows;
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

  async updateByLedgerId(ledger_id, updateData = {}) {
    try {
      console.log('[LedgerRemainderService] updateByLedgerId called with:', { ledger_id, updateData });
      
      // Find the document by ledger_id
      const snapshot = await this.collection
        .where('ledger_id', '==', String(ledger_id).trim())
        .limit(1)
        .get();

      console.log('[LedgerRemainderService] Query snapshot - found', snapshot.size, 'documents');
      
      if (snapshot.empty) {
        console.log('[LedgerRemainderService] No documents found for ledger_id:', ledger_id);
        throw new Error(`Ledger not found for id: ${ledger_id}`);
      }

      const docRef = snapshot.docs[0].ref;
      const docData = snapshot.docs[0].data();
      console.log('[LedgerRemainderService] Found document:', { docId: snapshot.docs[0].id, ledger_id: docData.ledger_id });

      const updatePayload = {
        updatedAt: new Date().toISOString(),
      };

      // Update allowed fields
      if (updateData.nextCallDate !== undefined) {
        updatePayload.nextCallDate = updateData.nextCallDate || null;
      }
      if (updateData.lastComments !== undefined) {
        updatePayload.lastComments = updateData.lastComments || null;
      }

      console.log('[LedgerRemainderService] Updating with payload:', updatePayload);
      await docRef.update(updatePayload);
      console.log('[LedgerRemainderService] Update successful');

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
