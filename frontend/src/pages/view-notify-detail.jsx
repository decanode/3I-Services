import React from 'react';
import { useLocation } from 'react-router-dom';
import { User, TrendingDown, TrendingUp, Calendar, MessageSquare } from 'lucide-react';
import Dashboard from '../components/Dashboard';
import '../styles/pagestyles/view-notify-detail.css';

export default function NotifyDetailPage() {
  const location = useLocation();
  const { row } = location.state || {};

  return (
    <Dashboard activeTab="notify">
      <div className="notify-detail-container">
        <div className="ledger-card">
          <div className="ledger-title-wrapper">
            <User className="ledger-icon" size={24} />
            <h2>{row ? row.ledger_name : 'No ledger selected'}</h2>
            {row && row.group && (
              <span className="ledger-group-badge">{row.group}</span>
            )}
          </div>

          {row && (
            <div className="outstandings-section">
              <h3 className="outstandings-heading">Outstandings Details :</h3>
              <div className="outstandings-cards">
                <div className="amount-card debit-card">
                  <div className="amount-header">
                    <span className="amount-title">Debit</span>
                    <TrendingDown className="amount-icon" size={20} />
                  </div>
                  <div className="amount-value">
                    ₹ {row.debit ? Number(row.debit).toLocaleString('en-IN') : '0'}
                  </div>
                </div>

                <div className="amount-card credit-card">
                  <div className="amount-header">
                    <span className="amount-title">Credit</span>
                    <TrendingUp className="amount-icon" size={20} />
                  </div>
                  <div className="amount-value">
                    ₹ {row.credit ? Number(row.credit).toLocaleString('en-IN') : '0'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {row && (
            <div className="interaction-section">
              <h3 className="interaction-heading">Interaction Details :</h3>
              <div className="interaction-cards">
                <div className="detail-card date-card">
                  <div className="detail-header">
                    <span className="detail-title">Next Call Date</span>
                    <Calendar className="detail-icon" size={20} />
                  </div>
                  <div className="detail-value">
                    {row.nextCallDate || row.lastTransactionDate || 'No date scheduled'}
                  </div>
                </div>

                <div className="detail-card comment-card">
                  <div className="detail-header">
                    <span className="detail-title">Comments</span>
                    <MessageSquare className="detail-icon" size={20} />
                  </div>
                  <div className="detail-value comment-text">
                    {row.lastComments || 'No comments available yet.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
}
