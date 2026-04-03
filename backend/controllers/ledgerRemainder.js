const ledgerRemainderService = require('../services/ledgerRemainder');
const ledgerLogsService = require('../services/ledgerLogs');
const { processCustomerData } = require('../utils/customerValidator');

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
    const { nextCallDate, lastComments, cname1, cmob1, cemail1, cname2, cmob2, cemail2, cname3, cmob3, cemail3 } = req.body;

    console.log('Update request - ledger_id:', ledger_id);
    console.log('Update request - body:', { nextCallDate, lastComments, cname1, cmob1, cemail1, cname2, cmob2, cemail2, cname3, cmob3, cemail3 });

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

    // Add and validate additional customer data
    const validationErrors = [];
    for (let i = 1; i <= 3; i++) {
      const customerProcessResult = processCustomerData(i, req.body);
      const { sanitized, validation, keys, isEmpty } = customerProcessResult;

      if (!isEmpty) {
        // Validate customer data
        if (!validation.isValid) {
          validationErrors.push(...validation.errors.map(err => `Customer ${i}: ${err}`));
        }

        // Add sanitized data to update payload
        updateData[keys.cnameKey] = sanitized.name;
        updateData[keys.cmobKey] = sanitized.mobile;
        updateData[keys.cemailKey] = sanitized.email;

        console.log(`Processed customer ${i}:`, {
          [keys.cnameKey]: sanitized.name,
          [keys.cmobKey]: sanitized.mobile,
          [keys.cemailKey]: sanitized.email,
          isValid: validation.isValid,
        });
      }
    }

    console.log('Final updateData to be sent to service:', updateData);

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    const result = await ledgerRemainderService.updateByLedgerId(ledger_id, updateData);

    console.log('Update result:', result);

    // Create a log entry for this update
    if (result.success && result.data) {
      const ledgerData = result.data;
      const userId = req.user?.userId;

      // Build customer info for logging
      const customerInfo = {};
      for (let i = 1; i <= 3; i++) {
        const cnameKey = `cname${i}`;
        const cmobKey = `cmob${i}`;
        const cemailKey = `cemail${i}`;

        if (ledgerData[cnameKey] || ledgerData[cmobKey]) {
          customerInfo[`operator${i}`] = {
            name: ledgerData[cnameKey] || '-',
            mobile: ledgerData[cmobKey] || '-',
            email: ledgerData[cemailKey] || '-',
          };
        }
      }

      // Create log entry with the updated fields
      const logData = {
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
      };

      // Add customer info to log if available
      if (Object.keys(customerInfo).length > 0) {
        logData.additionalCustomers = customerInfo;
        console.log('Customer data added to log:', customerInfo);
      }

      await ledgerLogsService.addLog(logData);

      console.log('Log entry created for ledger update with customer data');
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

    console.log('Sending success response with updated fields:', successResponse.updatedFields);
    res.json(successResponse);
  } catch (error) {
    console.error('Error updating ledger remainder:', error.message);
    res.status(error.message === 'Ledger not found' ? 404 : 500).json({
      message: 'Failed to update ledger remainder',
      error: error.message,
    });
  }
};

