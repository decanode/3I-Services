const ledgerRemainderService = require('../services/ledgerRemainder');
const ledgerLogsService = require('../services/ledgerLogs');
const { processCustomerData } = require('../utils/customerValidator');

/**
 * GET /api/ledger-remainder/paged?after={sequence_id}
 * Cursor-based pagination — always reads exactly 15 Firestore documents.
 * City access control applied automatically for non-admin users.
 */
exports.listPaged = async (req, res) => {
  try {
    const cityFilter = req.user.role === 'admin' ? null : (req.user.city || null);
    let after;
    if (req.query.after != null) {
      try { after = JSON.parse(req.query.after); } catch { after = undefined; }
    }
    const result = await ledgerRemainderService.listPaged({ after, city: cityFilter });
    res.json({ count: result.rows.length, rows: result.rows, nextCursor: result.nextCursor });
  } catch (error) {
    console.error('Error listing ledger remainders (paged):', error);
    res.status(500).json({ message: 'Failed to fetch ledger remainders', error: error.message });
  }
};

exports.list = async (req, res) => {
  try {
    const cityFilter = req.user.role === 'admin' ? null : (req.user.city || null);
    const rows = await ledgerRemainderService.list({ limit: req.query.limit, city: cityFilter });
    res.json({
      rows,
      count: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : ['ledger_id', 'ledger_name', 'city', 'group', 'debit', 'credit'],
    });
  } catch (error) {
    console.error('Error listing ledger remainders:', error);
    res.status(500).json({
      message: 'Failed to fetch ledger remainders',
      error: error.message,
    });
  }
};

exports.upcoming = async (req, res) => {
  try {
    const days = parseInt(req.query.days || '7', 10);
    const cityFilter = req.user.role === 'admin' ? null : (req.user.city || null);
    const rows = await ledgerRemainderService.getUpcomingRemainders({ days, limit: req.query.limit, city: cityFilter });
    res.json({
      rows,
      count: rows.length,
      days,
      todayDate: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Error listing upcoming ledger remainders:', error);
    res.status(500).json({
      message: 'Failed to fetch upcoming ledger remainders',
      error: error.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { ledger_id } = req.params;
    if (!ledger_id) return res.status(400).json({ error: 'Ledger ID is required' });
    const row = await ledgerRemainderService.getByLedgerId(ledger_id);
    if (!row) return res.status(404).json({ error: 'Ledger not found' });
    res.json({ row });
  } catch (error) {
    console.error('Error fetching ledger remainder by id:', error);
    res.status(500).json({ message: 'Failed to fetch ledger remainder', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { ledger_id } = req.params;
    const { nextCallDate, lastComments, cname1, cmob1, cemail1, cname2, cmob2, cemail2, cname3, cmob3, cemail3 } = req.body;

    if (!ledger_id) {
      return res.status(400).json({
        error: 'Ledger ID is required',
      });
    }

    // Prepare update data with validation
    const updateData = {
      nextCallDate: nextCallDate || null,
      lastComments: lastComments || null,
    };

    // Initialize all customer fields to null by default
    for (let i = 1; i <= 3; i++) {
      updateData[`cname${i}`] = null;
      updateData[`cmob${i}`] = null;
      updateData[`cemail${i}`] = null;
    }

    // Role enforcement: non-admins cannot modify already-occupied customer slots
    if (req.user.role !== 'admin') {
      const existing = (await ledgerRemainderService.getByLedgerId(ledger_id)) || {};

      for (let i = 1; i <= 3; i++) {
        const incomingName  = req.body[`cname${i}`]  ? String(req.body[`cname${i}`]).trim()  : null;
        const incomingMob   = req.body[`cmob${i}`]   ? String(req.body[`cmob${i}`]).trim()   : null;
        const incomingEmail = req.body[`cemail${i}`] ? String(req.body[`cemail${i}`]).trim() : null;

        const existingName  = existing[`cname${i}`]  || null;
        const existingMob   = existing[`cmob${i}`]   || null;
        const existingEmail = existing[`cemail${i}`] || null;

        const slotOccupied = !!(existingName || existingMob || existingEmail);
        const slotChanging = (
          incomingName  !== existingName  ||
          incomingMob   !== existingMob   ||
          incomingEmail !== existingEmail
        );

        if (slotOccupied && slotChanging) {
          return res.status(403).json({
            error: 'Permission denied',
            message: `Only admins can edit or delete existing customer data (slot ${i}).`,
          });
        }
      }
    }

    // Add and validate additional customer data
    const validationErrors = [];
    for (let i = 1; i <= 3; i++) {
      const customerProcessResult = processCustomerData(i, req.body);
      const { sanitized, validation, keys, isEmpty } = customerProcessResult;

      if (!isEmpty) {
        if (!validation.isValid) {
          validationErrors.push(...validation.errors.map(err => `Customer ${i}: ${err}`));
        }

        updateData[keys.cnameKey] = sanitized.name;
        updateData[keys.cmobKey] = sanitized.mobile;
        updateData[keys.cemailKey] = sanitized.email;
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    // Fetch previous data BEFORE update for comparison
    const previousData = (await ledgerRemainderService.getByLedgerId(ledger_id)) || {};

    const result = await ledgerRemainderService.updateByLedgerId(ledger_id, updateData, { userId: req.user?.userId });

    // Create a log entry ONLY if nextCallDate or lastComments actually changed
    if (result.success && result.data) {
      const ledgerData = result.data;
      const userId = req.user?.userId;

      const dateChanged = String(nextCallDate || '') !== String(previousData.nextCallDate || '');
      const commentsChanged = String(lastComments || '') !== '';

      if (dateChanged || commentsChanged) {
        const changedFields = [];
        if (dateChanged) changedFields.push('nextCallDate');
        if (commentsChanged) changedFields.push('comments');

        const logData = {
          ledger_id: ledgerData.ledger_id,
          ledger_name: ledgerData.ledger_name,
          group: ledgerData.group,
          category: ledgerData.category,
          ldebit: ledgerData.debit || 0,
          lcredit: ledgerData.credit || 0,
          nextCallDate: nextCallDate || '',
          date: nextCallDate || '',
          comments: lastComments || '',
          operation: 'update',
          updatedFields: changedFields,
          userId,
          city: ledgerData.city || '',
        };

        await ledgerLogsService.addLog(logData);
      }
    }

    // Enhance response with what was updated
    const successResponse = {
      ...result,
      updatedFields: {
        nextCallDate: updateData.nextCallDate,
        lastComments: updateData.lastComments,
        customers: {}
      }
    };

    for (let i = 1; i <= 3; i++) {
      if (updateData[`cname${i}`] || updateData[`cmob${i}`] || updateData[`cemail${i}`]) {
        successResponse.updatedFields.customers[`operator${i}`] = {
          name: updateData[`cname${i}`],
          mobile: updateData[`cmob${i}`],
          email: updateData[`cemail${i}`]
        };
      }
    }

    res.json(successResponse);
  } catch (error) {
    console.error('Error updating ledger remainder:', error.message);
    res.status(error.message === 'Ledger not found' ? 404 : 500).json({
      message: 'Failed to update ledger remainder',
      error: error.message,
    });
  }
};

exports.deleteCustomerSlot = async (req, res) => {
  try {
    const { ledger_id, slot } = req.params;
    const slotNum = parseInt(slot, 10);

    if (!ledger_id) {
      return res.status(400).json({ error: 'Ledger ID is required' });
    }

    if (isNaN(slotNum) || slotNum < 1 || slotNum > 3) {
      return res.status(400).json({ error: 'Slot must be 1, 2, or 3' });
    }

    const updateData = {
      [`cname${slotNum}`]: null,
      [`cmob${slotNum}`]: null,
      [`cemail${slotNum}`]: null,
    };

    const result = await ledgerRemainderService.updateByLedgerId(ledger_id, updateData);

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to delete customer slot' });
    }

    res.json({ success: true, message: `Customer slot ${slotNum} deleted` });
  } catch (error) {
    console.error('Error deleting customer slot:', error.message);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      message: 'Failed to delete customer slot',
      error: error.message,
    });
  }
};

