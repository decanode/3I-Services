import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, TrendingDown, TrendingUp, Calendar, MessageSquare, Save, AlertCircle } from 'lucide-react';
import Dashboard from '../components/Dashboard';
import DatePicker from '../components/datepicker';
import { apiUrl } from '../utils/api';
import '../styles/pagestyles/view-notify-detail.css';

export default function NotifyDetailPage() {
  const location = useLocation();
  const { row } = location.state || {};
  const [ledgerData, setLedgerData] = useState(row || null);
  const [editableDate, setEditableDate] = useState('');
  const [editableComments, setEditableComments] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
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
      setIsEditMode(false);
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
              <h3 className="interaction-heading">Interaction Details :</h3>
              
              {isEditMode ? (
                <div className="interaction-cards">
                  <div className="detail-card date-card editable-card">
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

                  <div className="detail-card comment-card editable-card">
                    <div className="detail-header">
                      <span className="detail-title">Comments</span>
                      <MessageSquare className="detail-icon" size={20} />
                    </div>
                    <div className="editable-field">
                      <textarea
                        value={editableComments}
                        onChange={(e) => setEditableComments(e.target.value)}
                        placeholder="Enter comments here..."
                        className="comment-textarea"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="interaction-cards read-only clickable">
                  <div 
                    className="detail-card date-card"
                    onClick={() => setIsEditMode(true)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && setIsEditMode(true)}
                  >
                    <div className="detail-header">
                      <span className="detail-title">Next Call Date</span>
                      <Calendar className="detail-icon" size={20} />
                    </div>
                    <div className="detail-value">
                      {editableDate ? formatDate(editableDate) : '—'}
                    </div>
                  </div>

                  <div 
                    className="detail-card comment-card"
                    onClick={() => setIsEditMode(true)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && setIsEditMode(true)}
                  >
                    <div className="detail-header">
                      <span className="detail-title">Comments</span>
                      <MessageSquare className="detail-icon" size={20} />
                    </div>
                    <div className="comment-text">
                      {editableComments || '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {ledgerData && isEditMode && (
            <div className="save-section">
              <button 
                className="save-button"
                onClick={handleSave}
                disabled={isLoading}
              >
                <Save size={18} />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                className="cancel-button"
                onClick={() => {
                  setIsEditMode(false);
                  setEditableDate(ledgerData?.nextCallDate || '');
                  setEditableComments(ledgerData?.lastComments || '');
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
}
