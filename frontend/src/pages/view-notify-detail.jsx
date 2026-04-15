import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Landmark, TrendingDown, TrendingUp, Calendar, MessageSquare, Phone, Mail, Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import DatePicker from '../components/datepicker';
import { SaveButton, CancelButton, AddCustomerButton, BackButton } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import PageLoader from '../components/loading';
import { apiFetch } from '../utils/api';
import '../styles/pagestyles/view-notify-detail.css';

export default function NotifyDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { row } = location.state || {};
  const [ledgerData, setLedgerData] = useState(row || null);
  const [bankData, setBankData] = useState(null);
  const [additionalCustomers, setAdditionalCustomers] = useState([]);
  const [editableDate, setEditableDate] = useState('');
  const [editableComments, setEditableComments] = useState('');
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ledgerDataLoading, setLedgerDataLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [alert, setAlert] = useState(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', email: '' });
  const [editingCustomerIndex, setEditingCustomerIndex] = useState(null);
  const [editingCustomerData, setEditingCustomerData] = useState({ name: '', mobile: '', email: '' });

  // Fetch ledger remainder data — single-record lookup via getById (1 Firestore read)
  useEffect(() => {
    const fetchLedgerData = async () => {
      if (!row?.ledger_id) {
        setLedgerDataLoading(false);
        return;
      }
      try {
        const response = await apiFetch(`/api/ledger-remainder/${encodeURIComponent(row.ledger_id)}`);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const data = await response.json();
        const record = data.row;
        if (record) {
          setLedgerData(record);
          setEditableDate(record.nextCallDate || '');
          setEditableComments('');
          const additionals = [];
          for (let i = 1; i <= 3; i++) {
            const cname = record[`cname${i}`];
            const mob = record[`cmob${i}`];
            const cemail = record[`cemail${i}`];
            if (cname || mob || cemail) {
              additionals.push({ name: cname || '', mobile: mob || '', email: cemail || '' });
            }
          }
          setAdditionalCustomers(additionals);
        }
      } catch (error) {
        console.error('Error fetching ledger data:', error);
        setEditableDate(row?.date || '');
        setEditableComments('');
      } finally {
        setLedgerDataLoading(false);
      }
    };
    fetchLedgerData();
  }, [row?.ledger_id]);

  // Fetch bank data from Excel_master
  useEffect(() => {
    const fetchBankData = async () => {
      if (!ledgerData?.ledger_id) return;
      try {
        const response = await apiFetch(`/api/excel/master/${encodeURIComponent(ledgerData.ledger_id)}`);
        if (!response.ok) return;
        const json = await response.json();
        if (json?.data) setBankData(json.data);
      } catch (error) {
        console.error('Error fetching bank data:', error);
      }
    };
    fetchBankData();
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
      return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleAddCustomer = () => {
    if (additionalCustomers.length < 3) {
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

  const handleDeleteCustomer = async (index) => {
    const ledger = ledgerData;
    let matchCount = 0;
    let slot = null;
    for (let i = 1; i <= 3; i++) {
      const hasData = !!(ledger?.[`cname${i}`] || ledger?.[`cmob${i}`] || ledger?.[`cemail${i}`]);
      if (hasData) {
        if (matchCount === index) { slot = i; break; }
        matchCount++;
      }
    }

    if (!slot) {
      setAlert({ type: 'error', title: 'Error', message: 'Could not determine customer slot.' });
      return;
    }

    try {
      setIsLoading(true);
      setAlert(null);
      const response = await apiFetch(
        `/api/ledger-remainder/${encodeURIComponent(ledgerData.ledger_id)}/customer/${slot}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete customer');
      }

      const updatedLedgerData = { ...ledgerData };
      updatedLedgerData[`cname${slot}`] = null;
      updatedLedgerData[`cmob${slot}`] = null;
      updatedLedgerData[`cemail${slot}`] = null;
      setLedgerData(updatedLedgerData);

      const remaining = [];
      for (let i = 1; i <= 3; i++) {
        const cn = updatedLedgerData[`cname${i}`];
        const cm = updatedLedgerData[`cmob${i}`];
        const ce = updatedLedgerData[`cemail${i}`];
        if (cn || cm || ce) remaining.push({ name: cn || '', mobile: cm || '', email: ce || '' });
      }
      setAdditionalCustomers(remaining);
      setAlert({ type: 'success', title: 'Deleted', message: 'Customer removed successfully.' });
    } catch (error) {
      setAlert({ type: 'error', title: 'Delete Failed', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (customersOverride) => {
    try {
      setIsLoading(true);
      setAlert(null);

      const customers = customersOverride ?? additionalCustomers;

      const updateBody = {
        nextCallDate: editableDate || null,
        lastComments: editableComments.trim() || null,
      };

      for (let i = 1; i <= 3; i++) {
        const customer = customers[i - 1];
        if (customer) {
          updateBody[`cname${i}`] = customer.name?.trim() || null;
          updateBody[`cmob${i}`] = customer.mobile?.trim() || null;
          updateBody[`cemail${i}`] = customer.email?.trim() || null;
        } else {
          updateBody[`cname${i}`] = null;
          updateBody[`cmob${i}`] = null;
          updateBody[`cemail${i}`] = null;
        }
      }

      const response = await apiFetch(`/api/ledger-remainder/${encodeURIComponent(ledgerData.ledger_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error (${response.status})`;
        try { errorMessage = JSON.parse(errorText).error || errorMessage; } catch { /* ignore */ }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      if (!responseText) throw new Error('Empty response from server');

      let data;
      try { data = JSON.parse(responseText); } catch {
        throw new Error('Invalid response format from server');
      }

      // Update local state from saved data
      const updatedLedgerData = {
        ...ledgerData,
        nextCallDate: editableDate || null,
        lastComments: data?.data?.lastComments ?? ledgerData.lastComments,
      };

      for (let i = 1; i <= 3; i++) {
        const customer = customers[i - 1];
        updatedLedgerData[`cname${i}`] = customer?.name || null;
        updatedLedgerData[`cmob${i}`] = customer?.mobile || null;
        updatedLedgerData[`cemail${i}`] = customer?.email || null;
      }

      setLedgerData(updatedLedgerData);

      const savedAdditionals = [];
      for (let i = 1; i <= 3; i++) {
        const cname = updatedLedgerData[`cname${i}`];
        const mob = updatedLedgerData[`cmob${i}`];
        const cemail = updatedLedgerData[`cemail${i}`];
        if (cname || mob || cemail) savedAdditionals.push({ name: cname || '', mobile: mob || '', email: cemail || '' });
      }
      setAdditionalCustomers(savedAdditionals);

      setEditableComments('');
      setIsEditingDate(false);
      setAlert({ type: 'success', title: 'Saved!', message: 'Updated successfully.' });
    } catch (error) {
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
          isDataLoading={ledgerDataLoading}
          duration={500}
          onComplete={() => setShowLoader(false)}
        />
      )}

      <div className="ledger-card">
        {/* Header */}
        <div className="ledger-header-wrapper">
          <div className="ledger-title-wrapper">
            <User className="ledger-icon" size={24} />
            <h2>{ledgerData ? ledgerData.ledger_name : 'No ledger selected'}</h2>
            {ledgerData?.group && (
              <span className="ledger-group-badge">{ledgerData.group}</span>
            )}
          </div>

          {ledgerData && (
            <div className="ledger-summary-cards">
              <div className="summary-card summary-card--blue">
                <Landmark className="summary-card-icon" size={20} />
                <div className="summary-card-content">
                  <div className="bank-name">{bankData?.bank || ledgerData.bank || '—'}</div>
                </div>
              </div>
              <div className="summary-card summary-card--purple">
                <Landmark className="summary-card-icon" size={20} />
                <div className="summary-card-content">
                  <div className="bank-address">{bankData?.bankadd1 || ledgerData.bankadd1 || '—'}</div>
                </div>
              </div>
              <div className="summary-card summary-card--orange">
                <Landmark className="summary-card-icon" size={20} />
                <div className="summary-card-content">
                  <div className="bank-address">{bankData?.bankadd2 || ledgerData.bankadd2 || '—'}</div>
                </div>
              </div>
            </div>
          )}

          <BackButton onClick={() => navigate(-1)} title="Go Back" size="medium" showLabel={true} />
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

        {ledgerData && (<>
          {/* ── Outstanding Details: compact horizontal row ── */}
          <div className="outstandings-row">
            <h3 className="outstandings-heading">Outstanding Details</h3>
            <div className="outstandings-cards">
              <div className="amount-card debit-card">
                <div className="amount-header">
                  <span className="amount-title">Debit</span>
                  <TrendingDown className="amount-icon" size={22} />
                </div>
                <div className="amount-value">{formatCurrency(ledgerData.debit)}</div>
              </div>
              <div className="amount-card credit-card">
                <div className="amount-header">
                  <span className="amount-title">Credit</span>
                  <TrendingUp className="amount-icon" size={22} />
                </div>
                <div className="amount-value">{formatCurrency(ledgerData.credit)}</div>
              </div>
            </div>
          </div>

          {/* ── Interaction Details: full width ── */}
          <div className="interaction-section">
            <div className="interaction-heading-wrapper">
              <h3 className="interaction-heading">Interaction Details</h3>
            </div>

            <div className="interaction-combined-card">
              {/* Date strip */}
              {!isEditingDate ? (
                <div
                  className="interaction-date-section"
                  onClick={() => setIsEditingDate(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingDate(true)}
                >
                  <div className="interaction-date-label">
                    <Calendar size={15} />
                    <span className="detail-title">Next Call Date</span>
                    <span className="interaction-date-hint">Click to edit</span>
                  </div>
                  <div className="interaction-date-value">
                    {editableDate ? formatDate(editableDate) : '— Not set —'}
                  </div>
                </div>
              ) : (
                <div className="interaction-date-section interaction-date-section--editing">
                  <div className="interaction-date-label">
                    <Calendar size={15} />
                    <span className="detail-title">Next Call Date</span>
                  </div>
                  <div className="date-edit-controls">
                    <div className="interaction-datepicker-wrapper">
                      <DatePicker value={editableDate} onChange={setEditableDate} flow="currentMonth" />
                    </div>
                    <button
                      className="date-action-btn date-action-btn--save"
                      onClick={handleSave}
                      disabled={isLoading}
                      title="Save date"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="date-action-btn date-action-btn--cancel"
                      onClick={() => { setIsEditingDate(false); setEditableDate(ledgerData?.nextCallDate || ''); }}
                      disabled={isLoading}
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Comments body */}
              <div className="comments-cards-section">
                <div className="comments-section-header">
                  <div className="comments-section-title">
                    <MessageSquare size={16} />
                    <span>Interaction Comments</span>
                  </div>
                  <button
                    className="comments-expand-btn"
                    onClick={() => setIsCommentsExpanded((prev) => !prev)}
                    title={isCommentsExpanded ? "Show less history" : "Show full history"}
                  >
                    {isCommentsExpanded ? (
                      <><ChevronUp size={16} /> <span>Collapse</span></>
                    ) : (
                      <><ChevronDown size={16} /> <span>Expand</span></>
                    )}
                  </button>
                </div>

                {/* Table + Add Comment side-by-side */}
                <div className={`comments-main-area ${isCommentsExpanded ? 'expanded' : 'collapsed'}`}>
                  {/* Left: comments table */}
                  <div className="comments-table-col">
                    {Array.isArray(ledgerData?.lastComments) && ledgerData.lastComments.length > 0 ? (
                      <div className="comments-table-wrapper">
                        <table className="comments-table">
                          <thead>
                            <tr>
                              <th className="col-comment">Comment</th>
                              <th className="col-time">Date &amp; Time</th>
                              <th className="col-user">User</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerData.lastComments
                              .slice()
                              .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                              .map((comment, idx) => {
                                const d = new Date(comment.date || Date.now());
                                return (
                                  <tr key={idx}>
                                    <td className="col-comment-cell">{comment.text || '—'}</td>
                                    <td className="col-time-cell">
                                      {d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                      {' '}
                                      {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </td>
                                    <td className="col-user-cell">{comment.userId || '—'}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="no-comments-placeholder">
                        <MessageSquare size={26} />
                        <p>No comments yet</p>
                      </div>
                    )}
                  </div>

                  {/* Right: add comment */}
                  <div className="add-comment-card">
                    <div className="add-comment-header">
                      <span className="add-comment-title">Add Comment</span>
                      <SaveButton
                        onClick={handleSave}
                        disabled={isLoading || !editableComments.trim()}
                        size="small"
                        title="Save comment"
                        showLabel={true}
                      />
                    </div>
                    <textarea
                      value={editableComments}
                      onChange={(e) => setEditableComments(e.target.value)}
                      onFocus={() => setIsCommentsExpanded(true)}
                      placeholder="Type your comment here..."
                      className="comment-textarea"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Customer */}
          <div className="primary-customer-section">
            <h4 className="customer-details-heading">Customer Details</h4>
            <div className="customer-details-row">
              <div className="detail-card customer-detail-name-card">
                <div className="detail-header">
                  <span className="detail-title">Customer Name</span>
                  <User className="detail-icon" size={20} />
                </div>
                <div className="detail-value">{ledgerData.contact || '—'}</div>
              </div>
              <div className="detail-card customer-detail-phone-card">
                <div className="detail-header">
                  <span className="detail-title">Mobile</span>
                  <Phone className="detail-icon" size={20} />
                </div>
                <div className="detail-value">{ledgerData.mobile || '—'}</div>
              </div>
              <div className="detail-card customer-detail-email-card">
                <div className="detail-header">
                  <span className="detail-title">Email</span>
                  <Mail className="detail-icon" size={20} />
                </div>
                <div className="detail-value">{ledgerData.email || '—'}</div>
              </div>
            </div>
          </div>
        </>)}

        {/* Additional Contacts */}
        <div>
          {ledgerData && additionalCustomers.length > 0 && (
            <>
              <h4 className="customer-details-heading">Additional Contacts</h4>
              {additionalCustomers.map((customer, index) => (
                <div key={index}>
                  {editingCustomerIndex === index ? (
                    <>
                      <div className="customer-row-wrapper">
                        {isAdmin && (
                          <div className="customer-row-side-actions">
                            <button className="customer-action-btn customer-action-btn--edit" disabled={isLoading} title="Cancel editing" onClick={handleCancelEditCustomer}>
                              <Pencil size={16} />
                            </button>
                          </div>
                        )}
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
                      </div>
                      <div className="form-action-buttons-center">
                        <SaveButton onClick={handleSaveEditedCustomer} disabled={isLoading} size="medium" title="Save customer" showLabel={true} />
                        <CancelButton onClick={handleCancelEditCustomer} disabled={isLoading} size="medium" title="Cancel" showLabel={true} />
                      </div>
                    </>
                  ) : (
                    <div className="customer-row-wrapper">
                      {isAdmin && (
                        <div className="customer-row-side-actions">
                          <button className="customer-action-btn customer-action-btn--edit" onClick={() => handleEditCustomer(index)} disabled={isLoading} title="Edit customer">
                            <Pencil size={16} />
                          </button>
                          <button className="customer-action-btn customer-action-btn--delete" onClick={() => handleDeleteCustomer(index)} disabled={isLoading} title="Delete customer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      <div className="customer-details-row">
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
                <SaveButton onClick={handleSaveNewCustomer} disabled={isLoading} size="medium" title="Save customer" showLabel={true} />
                <CancelButton onClick={handleCancelAddCustomer} disabled={isLoading} size="medium" title="Cancel adding" showLabel={true} />
              </div>
            </>
          ) : (
            <>
              {ledgerData && additionalCustomers.length < 3 && (
                <div className="customer-details-row">
                  <div className="detail-card add-customer-card" onClick={handleAddCustomer} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AddCustomerButton onClick={handleAddCustomer} disabled={isLoading} title="Add another customer" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
