import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../utils/api';
import Table from '../components/Table';
import PageLoader from '../components/loading';
import Alert from '../components/Alert';
import { SearchBar, Pagination } from '../components/Button';
import '../styles/pagestyles/view-notify.css';
import '../styles/componentstyles/Alert.css';

const PAGE_SIZE = 15;

export default function NotifyPage() {
  // Cursor stack — last element is the current page's cursor (null = page 1)
  const [cursorStack, setCursorStack] = useState([null]);
  const [pageIndex, setPageIndex] = useState(1);
  const [showLoader, setShowLoader] = useState(true);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ledgers, setLedgers] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const navigate = useNavigate();

  const currentCursor = cursorStack[cursorStack.length - 1];

  const fetchLedgerRemainders = useCallback(async (cursor) => {
    try {
      const url = cursor
        ? `/api/ledger-remainder/paged?after=${encodeURIComponent(JSON.stringify(cursor))}`
        : `/api/ledger-remainder/paged`;
      
      const res = await apiFetch(url);

      if (!res.ok) {
        throw new Error('Failed to load ledger remainders');
      }

      const data = await res.json();
      const sortedLedgers = (Array.isArray(data.rows) ? data.rows : []).sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );
      setLedgers(sortedLedgers);
      setNextCursor(data.nextCursor || null);
      setAlert(null);
    } catch (err) {
      setAlert({
        type: 'error',
        title: 'Load Failed',
        message: err.message || 'Failed to load ledger data',
        onConfirm: () => { setAlert(null); fetchLedgerRemainders(cursor); },
        onCancel: () => setAlert(null),
      });
      setLedgers([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedgerRemainders(currentCursor);
  }, [currentCursor, fetchLedgerRemainders]);

  const goNext = () => {
    if (nextCursor == null) return;
    setCursorStack(prev => [...prev, nextCursor]);
    setPageIndex(p => p + 1);
  };

  const goPrev = () => {
    if (cursorStack.length <= 1) return;
    setCursorStack(prev => prev.slice(0, -1));
    setPageIndex(p => p - 1);
  };

  const formatCurrency = (value) => {
    if (value == null || value === '') return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const formatCallDate = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return val;
    }
  };

  const columns = useMemo(() => [
    {
      key: 'ledger_name',
      label: 'Ledger Name',
      width: '280px',
      align: 'center',
      render: (item) => <span style={{ color: '#2a4759', fontWeight: 600 }}>{item.ledger_name || '—'}</span>,
    },
    {
      key: 'group',
      label: 'Group',
      width: '150px',
      align: 'center',
    },
    {
      key: 'debit',
      label: 'Debit',
      width: '130px',
      align: 'center',
      render: (item) => formatCurrency(item.debit),
    },
    {
      key: 'nextCallDate',
      label: 'Next Call Date',
      width: '160px',
      align: 'center',
      render: (item) => formatCallDate(item.nextCallDate),
    },
  ], []);

  const filteredLedgers = useMemo(() => {
    if (!searchTerm.trim()) return ledgers;
    const lower = searchTerm.toLowerCase().trim();
    return ledgers.filter(l => {
      if (l.ledger_name && l.ledger_name.toLowerCase().includes(lower)) return true;
      if (l.nextCallDate) {
        try {
          const date = new Date(l.nextCallDate);
          const formatted = date.toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric',
          }).toLowerCase();
          if (formatted.includes(lower)) return true;
          const parts = [
            date.getFullYear().toString(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
          ];
          if (parts.some(p => p.includes(lower))) return true;
        } catch {}
      }
      return false;
    });
  }, [ledgers, searchTerm]);

  const handleRowClick = (ledger) => {
    navigate('/view-notify-detail', { state: { row: ledger } });
  };

  return (
    <div className="notify-page">
      {showLoader && (
        <PageLoader
          pageName="Notifications"
          isDataLoading={loading}
          duration={1500}
          onComplete={() => setShowLoader(false)}
        />
      )}

      {alert && (
        <Alert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onConfirm={alert.onConfirm}
          onCancel={alert.onCancel}
        />
      )}

      <div className="notify-header">
        <h1>Ledger Notifications :</h1>
        <button className="page-back-btn" onClick={() => navigate("/home")}>
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="notify-table-section">
        {loading ? (
          <div className="notify-loading">Loading...</div>
        ) : (
          <div className="notify-table-container">
            <div className="notify-toolbar">
              <SearchBar
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by ledger name or date..."
                className="notify-search"
              />
              {searchTerm && (
                <button
                  className="notify-clear-btn"
                  onClick={() => setSearchTerm('')}
                >
                  Clear
                </button>
              )}
            </div>

            <Table
              columns={columns}
              data={filteredLedgers}
              noDataMessage="No ledger updates found"
              striped={true}
              headerGradient={true}
              minWidth={800}
              containerClassName="notify-scroll-container"
              tableClassName="notify-table"
              onRowClick={handleRowClick}
              footer={
                <Pagination
                  currentPage={pageIndex}
                  hasPrev={cursorStack.length > 1}
                  hasNext={nextCursor != null}
                  onPrev={goPrev}
                  onNext={goNext}
                />
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
