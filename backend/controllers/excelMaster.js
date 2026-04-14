const multer = require('multer');
const { parseExcelMasterBuffer } = require('../utils/excelParser');
const { parseOutstandingBuffer } = require('../utils/outstandingParser');
const { EXCEL_MASTER_FIELDS, generateLedgerId } = require('../models/excelMaster');
const excelMasterService = require('../services/excelMaster');
const outstandingService = require('../services/outstanding');

/** Listed API columns = master fields only (no doc id / import metadata). */
const LIST_COLUMNS = EXCEL_MASTER_FIELDS.filter(f => f !== 'ledger_id');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    if (/\.(xlsx|xls|csv)$/.test(name)) cb(null, true);
    else cb(new Error('Only .xlsx, .xls, or .csv files are allowed'));
  },
});

exports.runUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large (max 15 MB)' });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
};

exports.uploadMaster = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No file uploaded (use field name "file")' });
    }

    const { records, error } = parseExcelMasterBuffer(req.file.buffer);
    if (error) {
      return res.status(400).json({ message: error });
    }
    if (!records.length) {
      return res.status(400).json({
        message:
          'No data rows imported. Add at least one data row with at least one value under a recognized header, or check the header row matches the master columns.',
      });
    }

    // Generate ledger_id from ledger field (remove spaces)
    const enrichedRecords = records.map((record) => ({
      ...record,
      ledger_id: generateLedgerId(record.ledger),
    }));

    const result = await excelMasterService.bulkInsert(enrichedRecords, {
      userId: req.user.userId,
      fileName: req.file.originalname,
    });

    res.status(201).json({
      message: 'Excel master data imported',
      inserted: result.inserted,
      updated: result.updated,
      fileName: req.file.originalname,
    });
  } catch (e) {
    console.error('excelMaster upload:', e);
    res.status(500).json({ message: 'Import failed', error: e.message });
  }
};

exports.listMaster = async (req, res) => {
  try {
    const rows = await excelMasterService.list({ limit: req.query.limit });
    res.status(200).json({
      count: rows.length,
      columns: LIST_COLUMNS,
      rows,
    });
  } catch (e) {
    console.error('excelMaster list:', e);
    res.status(500).json({ message: 'Failed to load data', error: e.message });
  }
};

/**
 * Upload Outstanding data
 * Validates against Ledger_Remainder and updates with new debit/credit values
 */
exports.uploadOutstanding = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No file uploaded (use field name "file")' });
    }

    const { validRecords, invalidRecords, error } = parseOutstandingBuffer(req.file.buffer);

    if (error) {
      return res.status(400).json({ 
        message: error,
        debug: `Valid: ${validRecords?.length || 0}, Invalid: ${invalidRecords?.length || 0}`
      });
    }

    if (!validRecords.length && !invalidRecords.length) {
      return res.status(400).json({
        message:
          'No records found in Excel. Ensure LEDGER column exists and has data rows.',
        invalidCount: invalidRecords.length,
        validCount: validRecords.length,
      });
    }

    // If some records are valid, process them
    // If records are only invalid but exist, show the errors
    if (!validRecords.length && invalidRecords.length > 0) {
      return res.status(400).json({
        message: 'All records are invalid or have no ledger values.',
        invalidCount: invalidRecords.length,
        invalidRecords: invalidRecords.slice(0, 20),
      });
    }

    // Process outstanding records
    const results = await outstandingService.processOutstandingRecords(
      validRecords,
      req.user.userId,
      req.file.originalname
    );

    res.status(201).json({
      message: 'Outstanding data processed',
      processed: results.processed,
      updated: results.updated,
      logsCreated: results.logsCreated,
      found: results.found,
      notFound: results.notFound,
      fileName: req.file.originalname,
    });
  } catch (e) {
    console.error('Outstanding upload:', e);
    res.status(500).json({ message: 'Upload failed', error: e.message });
  }
};

/**
 * GET /api/excel/master/paged?after={sequence_id}
 * Cursor-based pagination — always reads exactly 15 Firestore documents.
 */
exports.listMasterPaged = async (req, res) => {
  try {
    const after = req.query.after != null ? parseInt(req.query.after, 10) : undefined;
    const result = await excelMasterService.listPaged({ after });
    res.json({ count: result.rows.length, columns: LIST_COLUMNS, rows: result.rows, nextCursor: result.nextCursor });
  } catch (e) {
    console.error('excelMaster listPaged:', e);
    res.status(500).json({ message: 'Failed to load data', error: e.message });
  }
};

exports.getMasterById = async (req, res) => {
  try {
    const { ledger_id } = req.params;
    if (!ledger_id) {
      return res.status(400).json({ message: 'ledger_id is required' });
    }

    const record = await excelMasterService.getByLedgerId(ledger_id);
    if (!record) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ data: record });
  } catch (e) {
    console.error('getMasterById:', e);
    res.status(500).json({ message: 'Failed to fetch master record', error: e.message });
  }
};
