import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpNarrowWide, ArrowDownNarrowWide, Filter, X, ArrowLeft, FileDown } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { Button, SearchBar } from '../components/Button';
import DatePicker from '../components/datepicker';
import PageLoader from '../components/loading';
import Alert from '../components/Alert';
import '../styles/pagestyles/view-log.css';
import '../styles/componentstyles/Alert.css';

// Helper function to check if a field was updated in this log entry
const isFieldUpdated = (item, fieldName) => {
  if (!item.updatedFields) return false;
  // For 'insert' operations, all non-empty fields are considered new
  if (item.operation === 'insert') {
    if (fieldName === 'ldebit') return item.ldebit > 0;
    if (fieldName === 'lcredit') return item.lcredit > 0;
    if (fieldName === 'nextCallDate') return !!item.nextCallDate;
    if (fieldName === 'comments') return !!item.comments;
    return false;
  }
  return Array.isArray(item.updatedFields) && item.updatedFields.includes(fieldName);
};

// Different highlight colors per field for the full table cell
const highlightColors = {
  ldebit: { backgroundColor: '#dcfce7' },     // green tint
  lcredit: { backgroundColor: '#fee2e2' },     // red tint
  nextCallDate: { backgroundColor: '#dbeafe' }, // blue tint
  comments: { backgroundColor: '#fef3c7' },    // amber tint
};

export default function ViewLogPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [alert, setAlert] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, credit, debit
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [sortOrder, setSortOrder] = useState('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(20);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const today = () => new Date().toISOString().split('T')[0];

  const handleFilterApply = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo || today());
    setCurrentPage(1);
    setShowFilterModal(false);
  };

  const handleFilterCancel = () => {
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setShowFilterModal(false);
  };

  const handleFilterClear = (e) => {
    e.stopPropagation();
    const t = today();
    setDateFrom(''); setDateTo(t);
    setTempDateFrom(''); setTempDateTo(t);
    setCurrentPage(1);
  };

  const formatShort = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Download modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [dlDateFrom, setDlDateFrom] = useState('');
  const [dlDateTo, setDlDateTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setAlert(null);
      const res = await apiFetch('/api/ledger-logs?limit=1000');

      if (!res.ok) {
        throw new Error('Failed to load ledger logs');
      }

      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (err) {
      setAlert({
        type: 'error',
        title: 'Load Failed',
        message: err.message || 'Failed to load activity logs',
        onConfirm: () => { setAlert(null); fetchLogs(); },
        onCancel: () => setAlert(null),
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const params = new URLSearchParams();
      if (dlDateFrom) params.set('dateFrom', dlDateFrom);
      if (dlDateTo) params.set('dateTo', dlDateTo);

      const res = await apiFetch(`/api/ledger-logs/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowDownloadModal(false);
      setDlDateFrom('');
      setDlDateTo('');
    } catch (err) {
      setAlert({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not download the Excel file',
        onConfirm: () => setAlert(null),
        onCancel: () => setAlert(null),
      });
    } finally {
      setDownloading(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'timestamp',
      label: 'Created At',
      sortable: true,
      width: '10%',
      align: 'center',
      render: (item) => <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
        {new Date(item.timestamp).toLocaleString('en-IN', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}
      </span>
    },
    {
      key: 'ledger_name',
      label: 'Ledger Name',
      width: '14%',
      align: 'left',
      render: (item) => <span style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500 }}>{item.ledger_name || '—'}</span>
    },
    {
      key: 'createdByUserId',
      label: 'User ID',
      width: '8%',
      align: 'center',
      render: (item) => <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{item.createdByUserId || '-'}</span>
    },
    {
      key: 'operation',
      label: 'Type',
      width: '8%',
      align: 'center',
      render: (item) => (
        <span style={{
          fontSize: '0.75rem',
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: item.operation === 'insert' ? '#dcfce7' : '#dbeafe',
          color: item.operation === 'insert' ? '#166534' : '#1e40af',
          fontWeight: 500,
        }}>
          {item.operation === 'insert' ? 'New' : 'Update'}
        </span>
      )
    },
    {
      key: 'ldebit',
      label: 'Debit',
      width: '8%',
      align: 'center',
      highlightKey: 'ldebit',
      render: (item) => {
        return item.ldebit > 0
          ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{item.ldebit.toFixed(2)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      }
    },
    {
      key: 'lcredit',
      label: 'Credit',
      width: '8%',
      align: 'center',
      highlightKey: 'lcredit',
      render: (item) => {
        return item.lcredit > 0
          ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{item.lcredit.toFixed(2)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      }
    },
    {
      key: 'nextCallDate',
      label: 'Next Call Date',
      width: '12%',
      align: 'center',
      highlightKey: 'nextCallDate',
      render: (item) => (
        <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
          {item.nextCallDate ? new Date(item.nextCallDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
        </span>
      )
    },
    {
      key: 'comments',
      label: 'Comments',
      width: '30%',
      align: 'center',
      highlightKey: 'comments',
      render: (item) => (
        <span style={{
          fontSize: '0.85rem',
          color: '#4b5563',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-block',
        }}>
          {item.comments || '—'}
        </span>
      )
    },
  ], []);

  const tableMinWidth = useMemo(() => {
    return '100%';
  }, [columns]);

  // Filter logs step
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filterType === 'credit') {
      result = result.filter(log => log.lcredit > 0);
    } else if (filterType === 'debit') {
      result = result.filter(log => log.ldebit > 0);
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(log =>
        (log.ledger_name && log.ledger_name.toLowerCase().includes(lowerTerm)) ||
        (log.ledger_id && log.ledger_id.toLowerCase().includes(lowerTerm))
      );
    }

    // Date filter — only active when dateFrom is set; dateTo defaults to today
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo || new Date());
      to.setHours(23, 59, 59, 999);
      result = result.filter(log => {
        const ts = new Date(log.timestamp);
        return ts >= from && ts <= to;
      });
    }

    // Sort by timestamp
    result.sort((a, b) => {
      const diff = new Date(b.timestamp) - new Date(a.timestamp);
      return sortOrder === 'asc' ? -diff : diff;
    });

    return result;
  }, [logs, searchTerm, filterType, dateFrom, dateTo, sortOrder]);

  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const currentLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredLogs, currentPage, rowsPerPage]);

  return (
    <div className="view-log-page">
      {showLoader && (
        <PageLoader
          pageName="Activity Logs"
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

      <div className="view-log-header">
        <h2>Ledger Activity Logs</h2>
        <button className="page-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="view-log-filters">
        <SearchBar
          className="view-log-search"
          placeholder="Search by ledger name, ID, group, or comments..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
        <div className="view-log-filter-row">
          <div className="view-log-toggles">
            <Button
              variant={filterType === 'all' ? 'primary' : 'outline'}
              onClick={() => { setFilterType('all'); setCurrentPage(1); }}
            >
              All Updates
            </Button>
            <Button
              variant={filterType === 'credit' ? 'credit' : 'outline'}
              onClick={() => { setFilterType('credit'); setCurrentPage(1); }}
              className={filterType === 'credit' ? 'active' : ''}
            >
              Credit
            </Button>
            <Button
              variant={filterType === 'debit' ? 'debit' : 'outline'}
              onClick={() => { setFilterType('debit'); setCurrentPage(1); }}
              className={filterType === 'debit' ? 'active' : ''}
            >
              Debit
            </Button>
          </div>
          <div className="view-log-actions">
            <button
              type="button"
              className={`view-log-filter-btn${dateFrom ? ' active' : ''}`}
              onClick={() => { setTempDateFrom(dateFrom); setTempDateTo(dateTo); setShowFilterModal(true); }}
            >
              <Filter size={14} />
              <span className="filter-btn-label">
                {dateFrom ? `${formatShort(dateFrom)} – ${formatShort(dateTo)}` : 'Filter'}
              </span>
              {dateFrom && (
                <span className="filter-btn-clear" onClick={handleFilterClear}>
                  <X size={12} />
                </span>
              )}
            </button>
            <button
              type="button"
              title="Download as Excel"
              onClick={() => setShowDownloadModal(true)}
              className="view-log-excel-btn"
            >
              <FileDown size={14} />
              Excel
            </button>
          </div>
        </div>
      </div>

      {showFilterModal && (
        <div
          className="filter-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) handleFilterCancel(); }}
        >
          <div className="filter-modal-card">
            <div className="filter-modal-header">
              <div className="filter-modal-icon">
                <Filter size={18} color="#2563eb" />
              </div>
              <h3 className="filter-modal-title">Filter by Date</h3>
            </div>
            <div className="filter-modal-fields">
              <div className="filter-modal-field">
                <label className="filter-modal-label">From Date</label>
                <DatePicker
                  value={tempDateFrom}
                  onChange={(val) => { setTempDateFrom(val); if (!val) setTempDateTo(today()); }}
                  flow="currentMonth"
                />
              </div>
              <div className="filter-modal-field">
                <label className="filter-modal-label" style={{ opacity: tempDateFrom ? 1 : 0.5 }}>To Date</label>
                <DatePicker
                  value={tempDateTo}
                  onChange={setTempDateTo}
                  flow="currentMonth"
                />
              </div>
            </div>
            <div className="filter-modal-actions">
              <Button variant="outline" onClick={handleFilterCancel}>Cancel</Button>
              <button type="button" className="filter-apply-btn" onClick={handleFilterApply}>
                <Filter size={14} />
                Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {showDownloadModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDownloadModal(false); setDlDateFrom(''); setDlDateTo(''); } }}
        >
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '28px 32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)', minWidth: '360px', maxWidth: '420px', width: '90%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '8px', display: 'flex' }}>
                <FileDown size={20} color="#16a34a" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>Export to Excel</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 500, color: '#6b7280' }}>From Date</label>
                <DatePicker
                  value={dlDateFrom}
                  onChange={(val) => { setDlDateFrom(val); if (!val) setDlDateTo(''); }}
                  flow="currentMonth"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 500, color: dlDateFrom ? '#6b7280' : '#d1d5db' }}>To Date</label>
                <DatePicker
                  value={dlDateTo}
                  onChange={(val) => setDlDateTo(val)}
                  disabled={!dlDateFrom}
                  flow="currentMonth"
                />
              </div>
              {!dlDateFrom && (
                <p style={{ margin: 0, fontSize: '0.73rem', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px' }}>
                  No date selected — will download last 60 days
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => { setShowDownloadModal(false); setDlDateFrom(''); setDlDateTo(''); }}
                disabled={downloading}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 18px', borderRadius: '6px', cursor: downloading ? 'not-allowed' : 'pointer',
                  border: 'none', background: downloading ? '#86efac' : '#16a34a',
                  color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                <FileDown size={15} />
                {downloading ? 'Downloading…' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="view-log-content">
        {loading ? (
          <div className="view-log-empty">
            <p>Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="view-log-empty">
            <AlertCircle size={48} style={{ marginBottom: '16px', color: '#ccc' }} />
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="view-log-table-container">
            <table className="view-log-custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width, textAlign: col.align || 'center', cursor: col.sortable ? 'pointer' : 'default', userSelect: col.sortable ? 'none' : 'auto' }}
                      onClick={col.sortable ? () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc') : undefined}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {col.label}
                        {col.sortable && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '24px', height: '24px', borderRadius: '4px',
                            backgroundColor: '#f3f4f6', transition: 'background-color 0.2s'
                          }}>
                            {sortOrder === 'desc'
                              ? <ArrowDownNarrowWide size={14} color="#4b5563" />
                              : <ArrowUpNarrowWide size={14} color="#4b5563" />
                            }
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentLogs.map((item, rowIndex) => {
                  return (
                    <tr key={item.id || item._id || rowIndex}>
                      {columns.map((col) => {
                        const highlighted = col.highlightKey && isFieldUpdated(item, col.highlightKey);
                        const cellHighlight = highlighted ? highlightColors[col.highlightKey] : {};
                        return (
                          <td
                            key={col.key}
                            style={{
                              width: col.width,
                              textAlign: col.align || 'center',
                              padding: '12px 8px',
                              borderBottom: '1px solid #e5e7eb',
                              ...cellHighlight,
                            }}
                          >
                            {col.render ? col.render(item, rowIndex) : (item[col.key] !== undefined ? item[col.key] : '—')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="log-pagination">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="pagination-info">
                  Page {currentPage} of {totalPages} ({filteredLogs.length} total)
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
