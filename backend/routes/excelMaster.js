const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const excelMasterController = require('../controllers/excelMaster');
const clearDataController = require('../controllers/clearData');

router.get('/master', authenticate, excelMasterController.listMaster);

router.post(
  '/master/upload',
  authenticate,
  excelMasterController.runUpload,
  excelMasterController.uploadMaster
);

router.post(
  '/outstanding/upload',
  authenticate,
  excelMasterController.runUpload,
  excelMasterController.uploadOutstanding
);

// Clear data endpoints
router.delete('/clear/master', authenticate, clearDataController.clearMaster);
router.delete('/clear/remainder', authenticate, clearDataController.clearRemainder);
router.delete('/clear/logs', authenticate, clearDataController.clearLogs);
router.delete('/clear/all', authenticate, clearDataController.clearAll);

module.exports = router;
