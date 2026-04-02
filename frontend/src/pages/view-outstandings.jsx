import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../utils/api';
import Table from '../components/Table';
import '../styles/pagestyles/view-outstandings.css';

function formatCurrency(value) {
  if (value == null || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatCell(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDate(dateValue) {
  if (!dateValue) return '—';
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function ViewOutstandingsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not logged in.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/ledger-remainder?limit=1000'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to load');
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) {
      setError(e.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(() => [
    {
      key: 'ledger_name',
      label: 'Ledger Name',
      width: '300px',
      align: 'center',
    },
    {
      key: 'group',
      label: 'Group Name',
      width: '150px',
      align: 'center',
    },
    {
      key: 'debit',
      label: 'Debit',
      width: '150px',
      align: 'center',
      render: (item) => formatCurrency(item.debit),
    },
    {
      key: 'credit',
      label: 'Credit',
      width: '150px',
      align: 'center',
      render: (item) => formatCurrency(item.credit),
    },
    {
      key: 'lastTransactionDate',
      label: 'Next Call Date',
      width: '200px',
      align: 'center',
      render: (item) => formatDate(item.lastTransactionDate),
    },
  ], []);

  return (
    <div className="outstandings-page">
      {error && <div className="outstandings-error">{error}</div>}
      
      <div className="outstandings-header">
        <h1>Ledger Remainders</h1>
      </div>

      <div className="outstandings-table-section">
        {loading ? (
          <div className="outstandings-loading">Loading...</div>
        ) : (
          <div className="outstandings-table-container">
            <Table
              columns={columns}
              data={rows}
              noDataMessage="No ledger remainders found"
              striped={true}
              headerGradient={true}
              tableClassName="outstandings-table"
              containerClassName="outstandings-scroll-container"
              minWidth={600}
            />
          </div>
        )}
      </div>
    </div>
  );
}
