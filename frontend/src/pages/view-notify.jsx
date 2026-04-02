import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';
import Table from '../components/Table';
import '../styles/pagestyles/view-notify.css';

export default function NotifyPage() {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchLedgerRemainders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not logged in.');
        setLoading(false);
        return;
      }

      const res = await fetch(apiUrl('/api/ledger-remainder?limit=500'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load ledger remainders');
      }

      const data = await res.json();
      const sortedLedgers = (Array.isArray(data.rows) ? data.rows : []).sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );
      setLedgers(sortedLedgers);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load data');
      setLedgers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedgerRemainders();
  }, [fetchLedgerRemainders]);

  const columns = useMemo(() => [
    {
      key: 'ledger_name',
      label: 'Ledger Name',
      width: '300px',
      align: 'center',
    },
    {
      key: 'nextCallDate',
      label: 'Date',
      width: '150px',
      align: 'center',
      render: (value) => {
        if (!value) return '—';
        try {
          const date = new Date(value);
          return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        } catch {
          return value;
        }
      },
    },
    {
      key: 'lastComments',
      label: 'Comments',
      width: '400px',
      align: 'center',
      render: (value) => {
        if (!value) return '—';
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
      },
    },
  ], []);

  const handleRowClick = (ledger) => {
    navigate('/view-notify-detail', { state: { row: ledger } });
  };

  return (
    <div className="notify-page">
      {error && <div className="notify-error">⚠️ {error}</div>}

      <div className="notify-header">
        <h1>Ledger Notifications</h1>
        <p className="notify-subtitle">Recent ledger updates and changes</p>
      </div>

      <div className="notify-table-section">
        {loading ? (
          <div className="notify-loading">Loading...</div>
        ) : (
          <div className="notify-table-container">
            <div className="notify-table-wrapper">
              {ledgers.length === 0 ? (
                <div className="notify-empty">No ledger updates found</div>
              ) : (
                <table className="notify-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} style={{ width: col.width, textAlign: col.align }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgers.map((ledger, index) => (
                      <tr
                        key={ledger.id || index}
                        className="notify-table-row"
                        onClick={() => handleRowClick(ledger)}
                      >
                        {columns.map((col) => (
                          <td key={col.key} style={{ textAlign: col.align }}>
                            {col.render ? col.render(ledger[col.key]) : ledger[col.key] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
