/**
 * Database Collection Clearing Controller
 *
 * TEMPORARY DEVELOPMENT FEATURE - FOR TESTING PURPOSES ONLY
 *
 * This controller provides endpoints to clear entire database collections.
 * It should be removed before production deployment for security reasons.
 *
 * Collections that can be cleared:
 * - Excel_master: Master ledger data imported from Excel
 * - Ledger_Remainder: Current outstanding balances for ledgers
 * - Ledger_logs: Historical transaction logs
 *
 * ============================================================================
 * HOW TO REMOVE THIS FEATURE (Before Production):
 * ============================================================================
 *
 * BACKEND CLEANUP:
 * ----------------
 * 1. Delete this file: /backend/controllers/clearData.js
 *
 * 2. Update /backend/routes/excelMaster.js:
 *    - Remove line: const clearDataController = require('../controllers/clearData');
 *    - Remove all DELETE routes:
 *      router.delete('/clear/master', authenticate, clearDataController.clearMaster);
 *      router.delete('/clear/remainder', authenticate, clearDataController.clearRemainder);
 *      router.delete('/clear/logs', authenticate, clearDataController.clearLogs);
 *      router.delete('/clear/all', authenticate, clearDataController.clearAll);
 *
 * FRONTEND CLEANUP:
 * -----------------
 * 1. Update /frontend/src/pages/excel.jsx:
 *    - Remove imports: Settings, Trash2, ChevronDown from lucide-react
 *    - Remove from imports: useEffect
 *    - Remove state: const [showDropdown, setShowDropdown] = useState(false);
 *    - Remove ref: const dropdownRef = useRef(null);
 *    - Remove the entire useEffect hook for handleClickOutside (lines ~18-32)
 *    - Remove the handleClearData function (lines ~208-262)
 *    - Remove the entire db-management-container div block (lines ~267-315)
 *
 * 2. Update /frontend/src/styles/pagestyles/excel.css:
 *    - Remove all styles under "Database Management Dropdown" section
 *    - Delete classes: .db-management-container, .db-management-btn, .db-dropdown,
 *                      .dropdown-header, .dropdown-item, .dropdown-divider
 *
 * 3. Update /frontend/src/components/Alert.jsx (if no other features use 'confirm' type):
 *    - Remove the 'confirm' type alert block (lines ~60-80)
 *    - Update useEffect to remove 'confirm' from the condition (line ~36)
 *    - Update handleOverlayClick to remove 'confirm' from the condition (line ~50)
 *
 * ============================================================================
 */

const { db } = require('../config/firebase');

const COLLECTIONS = {
  EXCEL_MASTER: 'Excel_master',
  LEDGER_REMAINDER: 'Ledger_Remainder',
  LEDGER_LOGS: 'Ledger_logs',
};

/**
 * Delete all documents from a collection
 */
async function clearCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    return { deleted: 0, message: `${collectionName} is already empty` };
  }

  const batchSize = 500;
  let deletedCount = 0;

  // Delete in batches
  const deleteBatch = async (docs) => {
    const batch = db.batch();
    docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return docs.length;
  };

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batchDocs = docs.slice(i, Math.min(i + batchSize, docs.length));
    deletedCount += await deleteBatch(batchDocs);
  }

  return { deleted: deletedCount, message: `Deleted ${deletedCount} documents from ${collectionName}` };
}

/**
 * Clear Excel Master collection
 */
exports.clearMaster = async (req, res) => {
  try {
    const result = await clearCollection(COLLECTIONS.EXCEL_MASTER);
    res.status(200).json({
      success: true,
      message: `Excel Master data cleared successfully`,
      deleted: result.deleted,
    });
  } catch (error) {
    console.error('Error clearing Excel Master:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear Excel Master data',
      error: error.message,
    });
  }
};

/**
 * Clear Ledger Remainder collection
 */
exports.clearRemainder = async (req, res) => {
  try {
    const result = await clearCollection(COLLECTIONS.LEDGER_REMAINDER);
    res.status(200).json({
      success: true,
      message: `Ledger Remainder data cleared successfully`,
      deleted: result.deleted,
    });
  } catch (error) {
    console.error('Error clearing Ledger Remainder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear Ledger Remainder data',
      error: error.message,
    });
  }
};

/**
 * Clear Ledger Logs collection
 */
exports.clearLogs = async (req, res) => {
  try {
    const result = await clearCollection(COLLECTIONS.LEDGER_LOGS);
    res.status(200).json({
      success: true,
      message: `Ledger Logs data cleared successfully`,
      deleted: result.deleted,
    });
  } catch (error) {
    console.error('Error clearing Ledger Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear Ledger Logs data',
      error: error.message,
    });
  }
};

/**
 * Clear all collections (Master, Remainder, and Logs)
 */
exports.clearAll = async (req, res) => {
  try {
    const masterResult = await clearCollection(COLLECTIONS.EXCEL_MASTER);
    const remainderResult = await clearCollection(COLLECTIONS.LEDGER_REMAINDER);
    const logsResult = await clearCollection(COLLECTIONS.LEDGER_LOGS);

    const totalDeleted =
      masterResult.deleted + remainderResult.deleted + logsResult.deleted;

    res.status(200).json({
      success: true,
      message: 'All data cleared successfully',
      deleted: totalDeleted,
      details: {
        master: masterResult.deleted,
        remainder: remainderResult.deleted,
        logs: logsResult.deleted,
      },
    });
  } catch (error) {
    console.error('Error clearing all data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all data',
      error: error.message,
    });
  }
};
