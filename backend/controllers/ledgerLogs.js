const ledgerLogsService = require('../services/ledgerLogs');
const ExcelJS = require('exceljs');

/**
 * GET /api/ledger-logs/paged?after={sequence_id}
 * Cursor-based pagination — always reads exactly 15 Firestore documents.
 * City access control applied automatically for non-admin users.
 */
exports.listPaged = async (req, res) => {
  try {
    const cityFilter = req.user.role === 'admin' ? null : (req.user.city || null);
    const after = req.query.after != null ? String(req.query.after) : undefined;
    const result = await ledgerLogsService.listPaged({ after, city: cityFilter });
    res.json({ count: result.rows.length, rows: result.rows, nextCursor: result.nextCursor });
  } catch (error) {
    console.error('Error listing logs (paged):', error);
    res.status(500).json({ message: 'Failed to fetch logs', error: error.message });
  }
};

/**
 * Export logs as Excel file for a given date range
 */
exports.exportLogs = async (req, res) => {
  try {
    const cityFilter = req.user.role === 'admin' ? null : (req.user.city || null);
    const { dateFrom, dateTo } = req.query;

    const logs = await ledgerLogsService.exportByDateRange({
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      city: cityFilter,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ledger Logs');

    // Column definitions
    sheet.columns = [
      { header: 'Created At',     key: 'createdAt',    width: 22 },
      { header: 'Ledger Name',    key: 'ledgerName',   width: 24 },
      { header: 'User ID',        key: 'userId',       width: 16 },
      { header: 'Type',           key: 'type',         width: 10 },
      { header: 'Debit',          key: 'debit',        width: 12 },
      { header: 'Credit',         key: 'credit',       width: 12 },
      { header: 'Next Call Date', key: 'nextCallDate', width: 18 },
      { header: 'Comments',       key: 'comments',     width: 40 },
    ];

    // Bold header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    const isFieldUpdated = (item, fieldName) => {
      if (!item.updatedFields) return false;
      if (item.operation === 'insert') {
        if (fieldName === 'ldebit') return item.ldebit > 0;
        if (fieldName === 'lcredit') return item.lcredit > 0;
        if (fieldName === 'nextCallDate') return !!item.nextCallDate;
        if (fieldName === 'comments') return !!item.comments;
        return false;
      }
      return Array.isArray(item.updatedFields) && item.updatedFields.includes(fieldName);
    };

    for (const item of logs) {
      const row = sheet.addRow({
        createdAt: item.timestamp
          ? new Date(item.timestamp).toLocaleString('en-IN', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          : '',
        ledgerName: item.ledger_name || '',
        userId: item.createdByUserId || '',
        type: item.operation === 'insert' ? 'New' : 'Update',
        debit: item.ldebit > 0 ? item.ldebit : '',
        credit: item.lcredit > 0 ? item.lcredit : '',
        nextCallDate: item.nextCallDate
          ? new Date(item.nextCallDate).toLocaleDateString('en-IN', {
              year: 'numeric', month: 'short', day: 'numeric',
            })
          : '',
        comments: item.comments || '',
      });

      // Cell highlight: debit → green
      if (item.ldebit > 0) {
        row.getCell('debit').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      }
      // Cell highlight: credit → red
      if (item.lcredit > 0) {
        row.getCell('credit').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      }
      // Cell highlight: nextCallDate → blue
      if (isFieldUpdated(item, 'nextCallDate')) {
        row.getCell('nextCallDate').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      }
      // Cell highlight: comments → amber
      if (isFieldUpdated(item, 'comments')) {
        row.getCell('comments').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const filename = `ledger-logs-${today}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({ message: 'Failed to export logs', error: error.message });
  }
};

/**
 * Get all logs
 */
exports.list = async (req, res) => {
  try {
    const cityFilter = req.user.role === 'admin' ? null : (req.user.city || null);
    const logs = await ledgerLogsService.list({ limit: req.query.limit, city: cityFilter });

    res.json({
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error listing logs:', error);
    res.status(500).json({
      message: 'Failed to fetch logs',
      error: error.message,
    });
  }
};

/**
 * Get logs for a specific ledger
 */
exports.getByLedgerId = async (req, res) => {
  try {
    const { ledger_id } = req.params;

    if (!ledger_id) {
      return res.status(400).json({ message: 'ledger_id is required' });
    }

    const logs = await ledgerLogsService.getLogsByLedgerId(ledger_id, {
      limit: req.query.limit,
    });

    res.json({
      ledger_id,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error fetching logs for ledger:', error);
    res.status(500).json({
      message: 'Failed to fetch logs',
      error: error.message,
    });
  }
};

/**
 * Update log entry with date and comments
 */
exports.update = async (req, res) => {
  try {
    const { logId } = req.params;
    const { dateCalls, lastComments } = req.body;

    if (!logId) {
      return res.status(400).json({ message: 'logId is required' });
    }

    const result = await ledgerLogsService.updateLog(logId, {
      dateCalls,
      lastComments,
    });

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to update log',
        error: result.error,
      });
    }

    res.json({
      message: 'Log updated successfully',
      data: result.data,
    });
  } catch (error) {
    console.error('Error updating log:', error);
    res.status(500).json({
      message: 'Failed to update log',
      error: error.message,
    });
  }
};
