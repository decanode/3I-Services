import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, TrendingDown, TrendingUp, Calendar, MessageSquare, Phone, Mail } from 'lucide-react';
import DatePicker from '../components/datepicker';
import { SaveButton, CancelButton } from '../components/Button';
import Alert from '../components/Alert';
import PageLoader from '../components/loading';
import { apiUrl } from '../utils/api';
import '../styles/pagestyles/view-notify-detail.css';

export default function NotifyDetailPage() {
  const location = useLocation();
  const { row } = location.state || {};
  const [ledgerData, setLedgerData] = useState(row || null);
  const [customerData, setCustomerData] = useState(null);
  const [additionalCustomers, setAdditionalCustomers] = useState([]);
  const [editableDate, setEditableDate] = useState('');
  const [editableComments, setEditableComments] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [alert, setAlert] = useState(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', email: '' });
  const [hasCustomerChanges, setHasCustomerChanges] = useState(false);
  const [editingCustomerIndex, setEditingCustomerIndex] = useState(null);
  const [editingCustomerData, setEditingCustomerData] = useState({ name: '', mobile: '', email: '' });

  // Fetch ledger remainder data from database
  useEffect(() => {
    const fetchLedgerData = async () => {
      if (!row?.ledger_id) {
        setInitialDataLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');

        const response = await fetch(apiUrl(`/api/ledger-remainder?limit=500`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Invalid response format from server');
        }

        // Find the matching ledger by ledger_id
        const matchedLedger = data.rows?.find(r => r.ledger_id === row.ledger_id);

        if (matchedLedger) {
          setLedgerData(matchedLedger);
          setEditableDate(matchedLedger.nextCallDate || '');
          setEditableComments(matchedLedger.lastComments || '');

          // Load additional customers (up to 3)
          const additionals = [];
          for (let i = 1; i <= 3; i++) {
            const cname = matchedLedger[`cname${i}`];
            const mob = matchedLedger[`cmob${i}`];
            const cemail = matchedLedger[`cemail${i}`];
            if (cname || mob || cemail) {
              additionals.push({ name: cname || '', mobile: mob || '', email: cemail || '' });
              console.log(`Loaded customer ${i}:`, { name: cname, mobile: mob, email: cemail });
            }
          }
          console.log('Total loaded additional customers:', additionals.length);
          setAdditionalCustomers(additionals);
          console.log('Fetched ledger data from database:', matchedLedger);
        }
      } catch (error) {
        console.error('Error fetching ledger data:', error);
        // Fallback to row data if fetch fails
        setEditableDate(row?.date || '');
        setEditableComments(row?.lastComments || row?.comments || '');
      } finally {
        // Data loading complete
        setInitialDataLoading(false);
      }
    };

    fetchLedgerData();
  }, [row?.ledger_id]);

  // Fetch customer data from Ledger_Remainder based on ledger_id
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!ledgerData?.ledger_id) return;
      
      try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(apiUrl(`/api/ledger-remainder?limit=500`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch customer data: ${response.status}`);
        }

        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Invalid response format from server');
        }
        
        // Find the matching customer from ledger remainder (it already has the data)
        const matchedCustomer = data.rows?.find(r => r.ledger_id === ledgerData.ledger_id);
        
        if (matchedCustomer) {
          setCustomerData(matchedCustomer);
          console.log('Fetched customer data from Ledger_Remainder:', matchedCustomer);
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        // Silently fail if customer data is not found
      }
    };

    fetchCustomerData();
  }, [ledgerData?.ledger_id]);

  const formatCurrency = (value) => {
    if (value == null || value === 0 || value === '0') return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    return '₹ ' + num.toLocaleString('en-IN');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleAddCustomer = () => {
    if (additionalCustomers.length < 2) {
      setNewCustomer({ name: '', mobile: '', email: '' });
      setIsAddingCustomer(true);
    }
  };

  const handleSaveNewCustomer = async () => {
    const name = newCustomer.name.trim();
    const mobile = newCustomer.mobile.trim();
    const email = newCustomer.email.trim();

    if (!name && !mobile && !email) {
      setAlert({ type: 'error', title: 'Validation Error', message: 'Enter at least one field.' });
      return;
    }
    if (name && name.length < 2) {
      setAlert({ type: 'error', title: 'Validation Error', message: 'Name must be at least 2 characters.' });
      return;
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
      setAlert({ type: 'error', title: 'Validation Error', message: 'Mobile must be exactly 10 digits.' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAlert({ type: 'error', title: 'Validation Error', message: 'Enter a valid email address.' });
      return;
    }

    const updatedCustomers = [...additionalCustomers, { name, mobile, email }];
    setAdditionalCustomers(updatedCustomers);
    setIsAddingCustomer(false);
    setNewCustomer({ name: '', mobile: '', email: '' });
    // Immediately save to DB with the updated customers list
    await handleSave(updatedCustomers);
  };

  const handleCancelAddCustomer = () => {
    setIsAddingCustomer(false);
    setNewCustomer({ name: '', mobile: '', email: '' });
  };

  const handleEditCustomer = (index) => {
    setEditingCustomerIndex(index);
    setEditingCustomerData({ ...additionalCustomers[index] });
  };

  const handleSaveEditedCustomer = async () => {
    const name = editingCustomerData.name.trim();
    const mobile = editingCustomerData.mobile.trim();
    const email = editingCustomerData.email.trim();

    if (name && name.length < 2) {
      setAlert({ type: 'error', title: 'Validation Error', message: 'Name must be at least 2 characters.' });
      return;
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
      setAlert({ type: 'error', title: 'Validation Error', message: 'Mobile must be exactly 10 digits.' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAlert({ type: 'error', title: 'Validation Error', message: 'Enter a valid email address.' });
      return;
    }

    const updated = additionalCustomers.map((c, i) =>
      i === editingCustomerIndex ? { name, mobile, email } : c
    );
    setAdditionalCustomers(updated);
    setEditingCustomerIndex(null);
    await handleSave(updated);
  };

  const handleCancelEditCustomer = () => {
    setEditingCustomerIndex(null);
    setEditingCustomerData({ name: '', mobile: '', email: '' });
  };

  const handleSave = async (customersOverride) => {
    try {
      setIsLoading(true);
      setAlert(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setAlert({ type: 'error', title: 'Not Logged In', message: 'Please log in to save changes.' });
        return;
      }

      const customers = customersOverride ?? additionalCustomers;

      // Build update body with main fields and additional customers
      const updateBody = {
        nextCallDate: editableDate || null,
        lastComments: editableComments || null,
      };

      // Add additional customers (cname1, cmob1, cemail1, etc.) - always send all 3 slots
      for (let i = 1; i <= 3; i++) {
        const customer = customers[i - 1];
        if (customer) {
          updateBody[`cname${i}`] = customer.name && customer.name.trim() ? customer.name.trim() : null;
          updateBody[`cmob${i}`] = customer.mobile && customer.mobile.trim() ? customer.mobile.trim() : null;
          updateBody[`cemail${i}`] = customer.email && customer.email.trim() ? customer.email.trim() : null;
        } else {
          // Explicitly set to null if no customer at this index
          updateBody[`cname${i}`] = null;
          updateBody[`cmob${i}`] = null;
          updateBody[`cemail${i}`] = null;
        }
      }

      console.log('handleSave - complete updateBody:', updateBody);

      const response = await fetch(apiUrl(`/api/ledger-remainder/${encodeURIComponent(ledgerData.ledger_id)}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      });

      console.log('handleSave - response status:', response.status);

      // Check if response is ok first
      if (!response.ok) {
        const errorText = await response.text();
        console.error('handleSave - error response:', errorText);
        let errorMessage = 'Failed to save';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If error response is not JSON, use generic message
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      let data;
      const responseText = await response.text();
      console.log('handleSave - response text:', responseText);

      if (!responseText) {
        throw new Error('Empty response from server');
      }

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('handleSave - JSON parse error:', parseError);
        throw new Error('Invalid response format from server');
      }

      console.log('handleSave - response data:', data);

      // Update local ledger data with the saved values
      const updatedLedgerData = {
        ...ledgerData,
        nextCallDate: editableDate || null,
        lastComments: editableComments || null,
      };

      // Also update customer data in local state
      for (let i = 1; i <= 3; i++) {
        const cnameKey = `cname${i}`;
        const cmobKey = `cmob${i}`;
        const cemailKey = `cemail${i}`;
        const customer = customers[i - 1];

        if (customer) {
          updatedLedgerData[cnameKey] = customer.name || null;
          updatedLedgerData[cmobKey] = customer.mobile || null;
          updatedLedgerData[cemailKey] = customer.email || null;
        } else {
          updatedLedgerData[cnameKey] = null;
          updatedLedgerData[cmobKey] = null;
          updatedLedgerData[cemailKey] = null;
        }
      }

      setLedgerData(updatedLedgerData);

      // Re-derive additionalCustomers from saved data to keep UI in sync with DB
      const savedAdditionals = [];
      for (let i = 1; i <= 3; i++) {
        const cname = updatedLedgerData[`cname${i}`];
        const mob = updatedLedgerData[`cmob${i}`];
        const cemail = updatedLedgerData[`cemail${i}`];
        if (cname || mob || cemail) {
          savedAdditionals.push({ name: cname || '', mobile: mob || '', email: cemail || '' });
        }
      }
      setAdditionalCustomers(savedAdditionals);

      const customerCount = savedAdditionals.filter(c => c.name || c.mobile).length;
      const successMsg = customerCount > 0
        ? `Updated successfully with ${customerCount} additional customer(s)!`
        : 'Updated successfully!';

      setAlert({ type: 'success', title: 'Saved!', message: successMsg });
      setHasCustomerChanges(false);
      setIsEditingDate(false);
      setIsEditingComment(false);
    } catch (error) {
      console.error('handleSave - error:', error);
      setAlert({ type: 'error', title: 'Save Failed', message: error.message || 'Failed to save' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="notify-detail-container">
      {showLoader && (
        <PageLoader
          pageName="Notification Detail"
          isDataLoading={initialDataLoading}
          onComplete={() => setShowLoader(false)}
        />
      )}

      <div className="ledger-card">
          <div className="ledger-title-wrapper">
            <User className="ledger-icon" size={24} />
            <h2>{ledgerData ? ledgerData.ledger_name : 'No ledger selected'}</h2>
            {ledgerData && ledgerData.group && (
              <span className="ledger-group-badge">{ledgerData.group}</span>
            )}
          </div>

          {alert && (
            <Alert
              type={alert.type}
              title={alert.title}
              message={alert.message}
              onConfirm={() => setAlert(null)}
              onCancel={() => setAlert(null)}
            />
          )}

          {ledgerData && (
            <div className="outstandings-section">
              <h3 className="outstandings-heading">Outstandings Details :</h3>
              <div className="outstandings-cards">
                <div className="amount-card debit-card">
                  <div className="amount-header">
                    <span className="amount-title">Debit</span>
                    <TrendingDown className="amount-icon" size={20} />
                  </div>
                  <div className="amount-value">
                    {formatCurrency(ledgerData.debit)}
                  </div>
                </div>

                <div className="amount-card credit-card">
                  <div className="amount-header">
                    <span className="amount-title">Credit</span>
                    <TrendingUp className="amount-icon" size={20} />
                  </div>
                  <div className="amount-value">
                    {formatCurrency(ledgerData.credit)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {ledgerData && (
            <div className="interaction-section">
              <div className="interaction-heading-wrapper">
                <h3 className="interaction-heading">Interaction Details :</h3>
                {(isEditingComment || isEditingDate || hasCustomerChanges) && (
                  <div className="interaction-edit-actions">
                    <SaveButton
                      onClick={handleSave}
                      disabled={isLoading}
                      size="medium"
                      title="Save changes"
                      showLabel={true}
                    />
                    <CancelButton
                      onClick={() => {
                        setIsEditingDate(false);
                        setIsEditingComment(false);
                        setHasCustomerChanges(false);
                        setEditableDate(ledgerData?.nextCallDate || '');
                        setEditableComments(ledgerData?.lastComments || '');
                        // Reload customers from ledger data
                        const additionals = [];
                        for (let i = 1; i <= 3; i++) {
                          const cname = ledgerData?.[`cname${i}`];
                          const mob = ledgerData?.[`cmob${i}`];
                          const cemail = ledgerData?.[`cemail${i}`];
                          if (cname || mob || cemail) {
                            additionals.push({ name: cname || '', mobile: mob || '', email: cemail || '' });
                          }
                        }
                        setAdditionalCustomers(additionals);
                      }}
                      disabled={isLoading}
                      size="medium"
                      title="Cancel editing"
                      showLabel={true}
                    />
                  </div>
                )}
              </div>
              
              <div className={`interaction-cards read-only ${!isEditingComment && !isEditingDate ? 'clickable' : ''}`}>
                {!isEditingDate ? (
                  <div
                    className="detail-card date-card"
                    onClick={() => setIsEditingDate(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingDate(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="detail-header">
                      <span className="detail-title">Next Call Date</span>
                      <Calendar className="detail-icon" size={20} />
                    </div>
                    <div className="detail-value">
                      {editableDate ? formatDate(editableDate) : '—'}
                    </div>
                  </div>
                ) : (
                  <div className="detail-card date-card date-edit-inline">
                    <div className="detail-header">
                      <span className="detail-title">Next Call Date</span>
                      <Calendar className="detail-icon" size={20} />
                    </div>
                    <div className="editable-field">
                      <DatePicker 
                        value={editableDate}
                        onChange={setEditableDate}
                      />
                    </div>
                  </div>
                )}

                {!isEditingComment ? (
                  <div
                    className="detail-card comment-card"
                    onClick={() => {
                      setIsEditingComment(true);
                      setEditableComments('');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingComment(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="detail-header">
                      <span className="detail-title">Comments</span>
                      <MessageSquare className="detail-icon" size={20} />
                    </div>
                    <div className="comment-text">
                      {editableComments || '—'}
                    </div>
                  </div>
                ) : (
                  <div className="detail-card comment-card comment-edit-inline">
                    <div className="comment-edit-header">
                      <span className="detail-title">Comments</span>
                      <MessageSquare className="detail-icon" size={20} />
                    </div>
                    <textarea
                      value={editableComments}
                      onChange={(e) => setEditableComments(e.target.value)}
                      placeholder="Enter comments here..."
                      className="comment-textarea"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {customerData && (
                <>
                  <h4 className="customer-details-heading">Customer Details :</h4>
                  <div className="customer-details-row">
                    <div className="detail-card customer-detail-name-card">
                      <div className="detail-header">
                        <span className="detail-title">Customer Name</span>
                        <User className="detail-icon" size={20} />
                      </div>
                      <div className="detail-value">
                        {customerData.contact || '—'}
                      </div>
                    </div>

                    <div className="detail-card customer-detail-phone-card">
                      <div className="detail-header">
                        <span className="detail-title">Mobile</span>
                        <Phone className="detail-icon" size={20} />
                      </div>
                      <div className="detail-value">
                        {customerData.mobile || '—'}
                      </div>
                    </div>

                    <div className="detail-card customer-detail-email-card">
                      <div className="detail-header">
                        <span className="detail-title">Email</span>
                        <Mail className="detail-icon" size={20} />
                      </div>
                      <div className="detail-value">
                        {customerData.email || '—'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {additionalCustomers.length > 0 && (
                <>
                  {additionalCustomers.map((customer, index) => (
                    <div key={index}>
                      {editingCustomerIndex === index ? (
                        <>
                          <div className="customer-details-row">
                            <div className="detail-card customer-detail-name-card">
                              <div className="detail-header">
                                <span className="detail-title">Customer Name</span>
                                <User className="detail-icon" size={20} />
                              </div>
                              <input
                                type="text"
                                value={editingCustomerData.name}
                                onChange={(e) => setEditingCustomerData({ ...editingCustomerData, name: e.target.value })}
                                placeholder="Enter name"
                                className="customer-input"
                                autoFocus
                              />
                            </div>
                            <div className="detail-card customer-detail-phone-card">
                              <div className="detail-header">
                                <span className="detail-title">Mobile</span>
                                <Phone className="detail-icon" size={20} />
                              </div>
                              <input
                                type="text"
                                value={editingCustomerData.mobile}
                                onChange={(e) => setEditingCustomerData({ ...editingCustomerData, mobile: e.target.value })}
                                placeholder="Enter mobile"
                                className="customer-input"
                              />
                            </div>
                            <div className="detail-card customer-detail-email-card">
                              <div className="detail-header">
                                <span className="detail-title">Email</span>
                                <Mail className="detail-icon" size={20} />
                              </div>
                              <input
                                type="email"
                                value={editingCustomerData.email}
                                onChange={(e) => setEditingCustomerData({ ...editingCustomerData, email: e.target.value })}
                                placeholder="Enter email (optional)"
                                className="customer-input"
                              />
                            </div>
                          </div>
                          <div className="form-action-buttons-center">
                            <SaveButton onClick={handleSaveEditedCustomer} disabled={isLoading} size="medium" title="Save customer" showLabel={true} />
                            <CancelButton onClick={handleCancelEditCustomer} disabled={isLoading} size="medium" title="Cancel" showLabel={true} />
                          </div>
                        </>
                      ) : (
                        <div
                          className="customer-details-row customer-details-row--clickable"
                          onClick={() => handleEditCustomer(index)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleEditCustomer(index)}
                        >
                          <div className="detail-card customer-detail-name-card">
                            <div className="detail-header">
                              <span className="detail-title">Customer Name</span>
                              <User className="detail-icon" size={20} />
                            </div>
                            <div className="detail-value">{customer.name || '—'}</div>
                          </div>
                          <div className="detail-card customer-detail-phone-card">
                            <div className="detail-header">
                              <span className="detail-title">Mobile</span>
                              <Phone className="detail-icon" size={20} />
                            </div>
                            <div className="detail-value">{customer.mobile || '—'}</div>
                          </div>
                          <div className="detail-card customer-detail-email-card">
                            <div className="detail-header">
                              <span className="detail-title">Email</span>
                              <Mail className="detail-icon" size={20} />
                            </div>
                            <div className="detail-value">{customer.email || '—'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {isAddingCustomer ? (
                <>
                  <div className="customer-details-row">
                    <div className="detail-card customer-detail-name-card">
                      <div className="detail-header">
                        <span className="detail-title">Customer Name</span>
                        <User className="detail-icon" size={20} />
                      </div>
                      <input
                        type="text"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        placeholder="Enter name"
                        className="customer-input"
                        autoFocus
                      />
                    </div>

                    <div className="detail-card customer-detail-phone-card">
                      <div className="detail-header">
                        <span className="detail-title">Mobile</span>
                        <Phone className="detail-icon" size={20} />
                      </div>
                      <input
                        type="text"
                        value={newCustomer.mobile}
                        onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                        placeholder="Enter mobile"
                        className="customer-input"
                      />
                    </div>

                    <div className="detail-card customer-detail-email-card">
                      <div className="detail-header">
                        <span className="detail-title">Email</span>
                        <Mail className="detail-icon" size={20} />
                      </div>
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        placeholder="Enter email (optional)"
                        className="customer-input"
                      />
                    </div>
                  </div>
                  <div className="form-action-buttons-center">
                    <SaveButton
                      onClick={handleSaveNewCustomer}
                      disabled={isLoading}
                      size="medium"
                      title="Save customer"
                      showLabel={true}
                    />
                    <CancelButton
                      onClick={handleCancelAddCustomer}
                      disabled={isLoading}
                      size="medium"
                      title="Cancel adding"
                      showLabel={true}
                    />
                  </div>
                </>
              ) : (
                <>
                  {additionalCustomers.length < 2 && (
                    <button
                      className="add-customer-btn"
                      onClick={handleAddCustomer}
                      title="Add another customer"
                    >
                      + Add Customer
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
