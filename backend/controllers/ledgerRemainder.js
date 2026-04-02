const ledgerRemainderService = require('../services/ledgerRemainder');
const ledgerLogsService = require('../services/ledgerLogs');

exports.list = async (req, res) => {
  try {
    const rows = await ledgerRemainderService.list({ limit: req.query.limit });
    
    // Log first row to see what fields are being returned
    if (rows.length > 0) {
      console.log('Sample row from Ledger_Remainder:', {
        keys: Object.keys(rows[0]),
        sample: rows[0]
      });
    }
    
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
    const rows = await ledgerRemainderService.getUpcomingRemainders({ days, limit: req.query.limit });
    
    console.log('[UPCOMING] Returning', rows.length, 'records');
    if (rows.length > 0) {
      console.log('[UPCOMING] Sample row:', {
        ledger_name: rows[0].ledger_name,
        nextCallDate: rows[0].nextCallDate,
        city: rows[0].city,
      });
    }
    
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

exports.update = async (req, res) => {
  try {
    const { ledger_id } = req.params;
    const { nextCallDate, lastComments } = req.body;

    console.log('Update request - ledger_id:', ledger_id);
    console.log('Update request - body:', { nextCallDate, lastComments });

    if (!ledger_id) {
      return res.status(400).json({
        error: 'Ledger ID is required',
      });
    }

    const result = await ledgerRemainderService.updateByLedgerId(ledger_id, {
      nextCallDate,
      lastComments,
    });

    console.log('Update result:', result);

    // Create a log entry for this update
    if (result.success && result.data) {
      const ledgerData = result.data;
      const userId = req.user?.userId;

      // Create log entry with the updated fields
      await ledgerLogsService.addLog({
        ledger_id: ledgerData.ledger_id,
        ledger_name: ledgerData.ledger_name,
        group: ledgerData.group,
        debit: ledgerData.debit || 0,
        credit: ledgerData.credit || 0,
        date: nextCallDate || '', // Updated date
        comments: lastComments || '', // Updated comments
        previous_debit: ledgerData.debit || 0,
        previous_credit: ledgerData.credit || 0,
        operation: 'update',
        userId,
      });

      console.log('Log entry created for ledger update');
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating ledger remainder:', error.message);
    res.status(error.message === 'Ledger not found' ? 404 : 500).json({
      message: 'Failed to update ledger remainder',
      error: error.message,
    });
  }
};

