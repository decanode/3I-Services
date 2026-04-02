import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, TrendingDown, TrendingUp, Calendar, MessageSquare, Save, X, AlertCircle, Phone, Mail } from 'lucide-react';
import Dashboard from '../components/Dashboard';
import DatePicker from '../components/datepicker';
import { apiUrl } from '../utils/api';
import '../styles/pagestyles/view-notify-detail.css';

export default function NotifyDetailPage() {
  const location = useLocation();
  const { row } = location.state || {};
  const [ledgerData, setLedgerData] = useState(row || null);
  const [customerData, setCustomerData] = useState(null);
  const [editableDate, setEditableDate] = useState('');
  const [editableComments, setEditableComments] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch ledger remainder data from database
  useEffect(() => {
    const fetchLedgerData = async () => {
      if (!row?.ledger_id) return;
      
      try {
        setIsLoadingData(true);
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
          console.log('Fetched ledger data from database:', matchedLedger);
        }
      } catch (error) {
        console.error('Error fetching ledger data:', error);
        // Fallback to row data if fetch fails
        setEditableDate(row?.date || '');
        setEditableComments(row?.lastComments || row?.comments || '');
      } finally {
        setIsLoadingData(false);
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

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'Not logged in.' });
        return;
      }

      console.log('handleSave - ledger_id:', ledgerData?.ledger_id);
      console.log('handleSave - data to send:', { nextCallDate: editableDate, lastComments: editableComments });

      const response = await fetch(apiUrl(`/api/ledger-remainder/${encodeURIComponent(ledgerData.ledger_id)}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nextCallDate: editableDate || null,
          lastComments: editableComments || null,
        }),
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
      setLedgerData({
        ...ledgerData,
        nextCallDate: editableDate || null,
        lastComments: editableComments || null,
      });

      setMessage({ type: 'success', text: 'Updated successfully!' });
      setIsEditingDate(false);
      setIsEditingComment(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('handleSave - error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dashboard activeTab="notify">
      <div className="notify-detail-container">
        <div className="ledger-card">
          <div className="ledger-title-wrapper">
            <User className="ledger-icon" size={24} />
            <h2>{ledgerData ? ledgerData.ledger_name : 'No ledger selected'}</h2>
            {ledgerData && ledgerData.group && (
              <span className="ledger-group-badge">{ledgerData.group}</span>
            )}
          </div>

          {message.text && (
            <div className={`message-alert ${message.type}`}>
              <AlertCircle size={18} />
              <span>{message.text}</span>
            </div>
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
                {(isEditingComment || isEditingDate) && (
                  <div className="interaction-edit-actions">
                    <button 
                      className="icon-button save-icon-btn"
                      onClick={handleSave}
                      disabled={isLoading}
                      title="Save"
                    >
                      <Save size={18} />
                    </button>
                    <button 
                      className="icon-button cancel-icon-btn"
                      onClick={() => {
                        setIsEditingDate(false);
                        setIsEditingComment(false);
                        setEditableDate(ledgerData?.nextCallDate || '');
                        setEditableComments(ledgerData?.lastComments || '');
                      }}
                      disabled={isLoading}
                      title="Cancel"
                    >
                      <X size={18} />
                    </button>
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
                    onKeyPress={(e) => e.key === 'Enter' && setIsEditingDate(true)}
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
                    onClick={() => setIsEditingComment(true)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && setIsEditingComment(true)}
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
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
}
