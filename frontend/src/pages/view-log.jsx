import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpNarrowWide, ArrowDownNarrowWide, Filter, X, ArrowLeft, FileDown, Search, Calendar, Pin } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { Button, Pagination } from '../components/Button';
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
    if (fieldName === 'category') return item.category != null && item.category > 0;
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
  category: { backgroundColor: '#f3e8ff' },   // purple tint
};

export default function ViewLogPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [alert, setAlert] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);

  // Type filter
  const [filterType, setFilterType] = useState('all'); // all, credit, debit

  // Sort
  const [sortField, setSortField] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(20);

  // ── Committed (applied) filters ──────────────────────
  const [filterLedgerNames, setFilterLedgerNames] = useState([]);
  const [filterUserIds, setFilterUserIds] = useState([]);
  const [filterCreatedFrom, setFilterCreatedFrom] = useState('');
  const [filterCreatedTo, setFilterCreatedTo] = useState('');
  const [filterNextCallFrom, setFilterNextCallFrom] = useState('');
  const [filterNextCallTo, setFilterNextCallTo] = useState('');

  // ── Pending (editable in panel, not yet applied) ─────
  const [tempLedgerNames, setTempLedgerNames] = useState([]);
  const [tempUserIds, setTempUserIds] = useState([]);
  const [tempCreatedFrom, setTempCreatedFrom] = useState('');
  const [tempCreatedTo, setTempCreatedTo] = useState('');
  const [tempNextCallFrom, setTempNextCallFrom] = useState('');
  const [tempNextCallTo, setTempNextCallTo] = useState('');

  // ── Pill input text fields ───────────────────────────
  const [ledgerNameInput, setLedgerNameInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');

  // ── Suggestion dropdown visibility ───────────────────
  const [showLedgerDropdown, setShowLedgerDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // ── Refs for click-outside detection ─────────────────
  const ledgerDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Download modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [dlDateFrom, setDlDateFrom] = useState('');
  const [dlDateTo, setDlDateTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  // ── Derived: unique values from loaded data ───────────
  const uniqueLedgerNames = useMemo(() => (
    [...new Set(logs.map(l => l.ledger_name).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  ), [logs]);

  const uniqueUserIds = useMemo(() => (
    [...new Set(logs.map(l => l.createdByUserId).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
  ), [logs]);

  // ── Filtered suggestion lists ────────────────────────
  const filteredLedgerSuggestions = useMemo(() => {
    const term = ledgerNameInput.toLowerCase();
    return uniqueLedgerNames
      .filter(n => !tempLedgerNames.includes(n) && (!term || n.toLowerCase().includes(term)))
      .slice(0, 8);
  }, [uniqueLedgerNames, ledgerNameInput, tempLedgerNames]);

  const filteredUserSuggestions = useMemo(() => {
    const term = userIdInput.toLowerCase();
    return uniqueUserIds
      .filter(id => !tempUserIds.includes(id) && (!term || String(id).toLowerCase().includes(term)))
      .slice(0, 8);
  }, [uniqueUserIds, userIdInput, tempUserIds]);

  // ── Active filter count for badge ────────────────────
  const activeFilterCount = useMemo(() => (
    [filterLedgerNames.length > 0, filterUserIds.length > 0, !!filterCreatedFrom, !!filterNextCallFrom]
      .filter(Boolean).length
  ), [filterLedgerNames, filterUserIds, filterCreatedFrom, filterNextCallFrom]);

  // ── Click-outside: close dropdowns ───────────────────
  useEffect(() => {
    const handler = (e) => {
      if (ledgerDropdownRef.current && !ledgerDropdownRef.current.contains(e.target)) {
        setShowLedgerDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  // ── Filter action handlers ────────────────────────────
  const handleApplyFilter = () => {
    const hasSomething =
      tempLedgerNames.length > 0 ||
      tempUserIds.length > 0 ||
      tempCreatedFrom ||
      tempCreatedTo ||
      tempNextCallFrom ||
      tempNextCallTo;

    if (!hasSomething) return; // nothing to apply

    setFilterLoading(true);
    // small delay so the loading UI is visible
    setTimeout(() => {
      setFilterLedgerNames(tempLedgerNames);
      setFilterUserIds(tempUserIds);
      setFilterCreatedFrom(tempCreatedFrom);
      setFilterCreatedTo(tempCreatedTo);
      setFilterNextCallFrom(tempNextCallFrom);
      setFilterNextCallTo(tempNextCallTo);
      setCurrentPage(1);
      setFilterLoading(false);
    }, 450);
  };

  const handleClearFilter = () => {
    setTempLedgerNames([]); setFilterLedgerNames([]);
    setTempUserIds([]); setFilterUserIds([]);
    setTempCreatedFrom(''); setFilterCreatedFrom('');
    setTempCreatedTo(''); setFilterCreatedTo('');
    setTempNextCallFrom(''); setFilterNextCallFrom('');
    setTempNextCallTo(''); setFilterNextCallTo('');
    setLedgerNameInput('');
    setUserIdInput('');
    setCurrentPage(1);
  };

  // ── Pill helpers ──────────────────────────────────────
  const addLedgerName = (name) => {
    if (!tempLedgerNames.includes(name)) setTempLedgerNames(p => [...p, name]);
    setLedgerNameInput('');
    setShowLedgerDropdown(false);
  };
  const removeLedgerName = (name) => setTempLedgerNames(p => p.filter(n => n !== name));

  const addUserId = (id) => {
    if (!tempUserIds.includes(id)) setTempUserIds(p => [...p, id]);
    setUserIdInput('');
    setShowUserDropdown(false);
  };
  const removeUserId = (id) => setTempUserIds(p => p.filter(u => u !== id));

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
      width: '12%',
      align: 'left',
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
      width: '18%',
      align: 'left',
      render: (item) => <span style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500 }}>{item.ledger_name || '—'}</span>
    },
    {
      key: 'createdByUserId',
      label: 'User ID',
      width: '10%',
      align: 'left',
      render: (item) => <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{item.createdByUserId || '-'}</span>
    },
    {
      key: 'ldebit',
      label: 'Debit',
      width: '10%',
      align: 'center',
      highlightKey: 'ldebit',
      render: (item) => {
        return item.ldebit > 0
          ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{item.ldebit.toFixed(2)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      }
    },
    {
      key: 'category',
      label: 'Category',
      width: '10%',
      align: 'center',
      highlightKey: 'category',
      render: (item) => (
        item.category
          ? <span style={{ fontSize: '0.85rem', color: '#1f2937', fontWeight: 500 }}>{item.category}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      )
    },
    {
      key: 'nextCallDate',
      label: 'Next Call Date',
      width: '10%',
      align: 'left',
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
      align: 'left',
      highlightKey: 'comments',
      cellClassName: 'view-log-comments-cell',
      render: (item) => (
        <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
          {item.comments || '—'}
        </span>
      )
    },
  ], []);

  // ── Filter + sort ─────────────────────────────────────
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filterType === 'credit') {
      result = result.filter(log => log.lcredit > 0);
    } else if (filterType === 'debit') {
      result = result.filter(log => log.ldebit > 0);
    }

    // Ledger name filter — OR across selected names, partial match
    if (filterLedgerNames.length > 0) {
      result = result.filter(log =>
        filterLedgerNames.some(n => log.ledger_name?.toLowerCase().includes(n.toLowerCase()))
      );
    }

    // User ID filter — exact match, any of selected
    if (filterUserIds.length > 0) {
      result = result.filter(log => filterUserIds.includes(log.createdByUserId));
    }

    // Created at date range
    // If only From is given (no To), show that single day only
    if (filterCreatedFrom) {
      const from = new Date(filterCreatedFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(filterCreatedTo || filterCreatedFrom); // same day if no To
      to.setHours(23, 59, 59, 999);
      result = result.filter(log => {
        const ts = new Date(log.timestamp);
        return ts >= from && ts <= to;
      });
    }

    // Next call date range
    // If only From is given (no To), show that single day only
    if (filterNextCallFrom) {
      const from = new Date(filterNextCallFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(filterNextCallTo || filterNextCallFrom); // same day if no To
      to.setHours(23, 59, 59, 999);
      result = result.filter(log => {
        if (!log.nextCallDate) return false;
        const d = new Date(log.nextCallDate);
        return d >= from && d <= to;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      let diff = 0;
      if (sortField === 'ledger_name') {
        diff = String(a.ledger_name ?? '').localeCompare(String(b.ledger_name ?? ''));
      } else if (sortField === 'nextCallDate') {
        const aHas = !!a.nextCallDate;
        const bHas = !!b.nextCallDate;
        if (!aHas && !bHas) diff = 0;
        else if (!aHas) diff = 1;
        else if (!bHas) diff = -1;
        else diff = new Date(a.nextCallDate) - new Date(b.nextCallDate);
      } else {
        diff = new Date(a.timestamp) - new Date(b.timestamp);
      }
      return sortDir === 'asc' ? diff : -diff;
    });

    return result;
  }, [
    logs, filterType,
    filterLedgerNames, filterUserIds,
    filterCreatedFrom, filterCreatedTo,
    filterNextCallFrom, filterNextCallTo,
    sortField, sortDir,
  ]);

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

      {filterLoading && (
        <Alert
          type="loading"
          title="Applying Filters…"
          message="Filtering your activity logs, please wait."
        />
      )}

      {!filterLoading && alert && (
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

        {/* Row 1: Sort by + Type toggles + Excel */}
        <div className="vl-row1">
          <div className="vl-sort-group">
            <span className="vl-row-label">Sort by</span>
            {[
              { value: 'timestamp', label: 'Date' },
              { value: 'ledger_name', label: 'Ledger Name' },
              { value: 'nextCallDate', label: 'Next Call Date' },
            ].map(({ value, label }) => (
              <label key={value} className="vl-pill-radio">
                <input
                  type="radio"
                  name="sortField"
                  value={value}
                  checked={sortField === value}
                  onChange={() => { setSortField(value); setCurrentPage(1); }}
                />
                {label}
              </label>
            ))}
            <span className="vl-sep" />
            {[
              { value: 'asc', icon: <ArrowUpNarrowWide size={13} />, label: 'Asc' },
              { value: 'desc', icon: <ArrowDownNarrowWide size={13} />, label: 'Desc' },
            ].map(({ value, icon, label }) => (
              <label key={value} className="vl-pill-radio">
                <input
                  type="radio"
                  name="sortDir"
                  value={value}
                  checked={sortDir === value}
                  onChange={() => setSortDir(value)}
                />
                {icon}{label}
              </label>
            ))}
          </div>

          <div className="vl-type-group">
            <span className="vl-row-label">Filter</span>
            {[
              { value: 'all', label: 'All Updates' },
              { value: 'credit', label: 'Credit' },
              { value: 'debit', label: 'Debit' },
            ].map(({ value, label }) => (
              <label key={value} className={`vl-pill-radio vl-type-${value}`}>
                <input
                  type="radio"
                  name="filterType"
                  value={value}
                  checked={filterType === value}
                  onChange={() => { setFilterType(value); setCurrentPage(1); }}
                />
                {label}
              </label>
            ))}
          </div>

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

        {/* Divider */}
        <div className="vl-divider" />

        {/* Row 2: Filter fields left + Action buttons right */}
        <div className="vl-row2">

          {/* Fields grid */}
          <div className="vl-row2-fields">

            {/* Ledger Name */}
            <div className="view-log-filter-group" ref={ledgerDropdownRef}>
              <label className="view-log-filter-label">
                <Search size={11} />
                Ledger Name
              </label>
              <div className="view-log-pill-input">
                {tempLedgerNames.map(name => (
                  <span key={name} className="view-log-pill">
                    <span className="view-log-pill-text">{name}</span>
                    <button type="button" className="view-log-pill-remove" onClick={() => removeLedgerName(name)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="view-log-pill-input-field"
                  placeholder={tempLedgerNames.length === 0 ? 'Type to search…' : 'Add more…'}
                  value={ledgerNameInput}
                  onChange={e => { setLedgerNameInput(e.target.value); setShowLedgerDropdown(true); }}
                  onFocus={() => setShowLedgerDropdown(true)}
                />
              </div>
              {showLedgerDropdown && filteredLedgerSuggestions.length > 0 && (
                <ul className="view-log-suggestions">
                  {filteredLedgerSuggestions.map(name => (
                    <li key={name} className="view-log-suggestion-item" onMouseDown={() => addLedgerName(name)}>
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* User ID */}
            <div className="view-log-filter-group" ref={userDropdownRef}>
              <label className="view-log-filter-label">
                <Search size={11} />
                User ID
              </label>
              <div className="view-log-pill-input">
                {tempUserIds.map(id => (
                  <span key={id} className="view-log-pill">
                    <span className="view-log-pill-text">{id}</span>
                    <button type="button" className="view-log-pill-remove" onClick={() => removeUserId(id)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="view-log-pill-input-field"
                  placeholder={tempUserIds.length === 0 ? 'Type to search…' : 'Add more…'}
                  value={userIdInput}
                  onChange={e => { setUserIdInput(e.target.value); setShowUserDropdown(true); }}
                  onFocus={() => setShowUserDropdown(true)}
                />
              </div>
              {showUserDropdown && filteredUserSuggestions.length > 0 && (
                <ul className="view-log-suggestions">
                  {filteredUserSuggestions.map(id => (
                    <li key={id} className="view-log-suggestion-item" onMouseDown={() => addUserId(id)}>
                      {id}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Created At range */}
            <div className="view-log-filter-group">
              <label className="view-log-filter-label">
                <Calendar size={11} />
                Created At
              </label>
              <div className="vl-date-range">
                <DatePicker
                  value={tempCreatedFrom}
                  onChange={val => { setTempCreatedFrom(val); if (!val) setTempCreatedTo(''); }}
                  flow="currentMonth"
                />
                <span className="view-log-date-sep">→</span>
                <DatePicker
                  value={tempCreatedTo}
                  onChange={setTempCreatedTo}
                  disabled={!tempCreatedFrom}
                  flow="currentMonth"
                />
              </div>
              {tempCreatedFrom && !tempCreatedTo && (
                <span className="view-log-date-hint">
                  <Pin size={9} />
                  {new Date(tempCreatedFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {tempCreatedFrom && tempCreatedTo && (
                <span className="view-log-date-hint"><Pin size={9} /> Range selected</span>
              )}
            </div>

            {/* Next Call Date range */}
            <div className="view-log-filter-group">
              <label className="view-log-filter-label">
                <Calendar size={11} />
                Next Call
              </label>
              <div className="vl-date-range">
                <DatePicker
                  value={tempNextCallFrom}
                  onChange={val => { setTempNextCallFrom(val); if (!val) setTempNextCallTo(''); }}
                  flow="currentMonth"
                />
                <span className="view-log-date-sep">→</span>
                <DatePicker
                  value={tempNextCallTo}
                  onChange={setTempNextCallTo}
                  disabled={!tempNextCallFrom}
                  flow="currentMonth"
                />
              </div>
              {tempNextCallFrom && !tempNextCallTo && (
                <span className="view-log-date-hint">
                  <Pin size={9} />
                  {new Date(tempNextCallFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {tempNextCallFrom && tempNextCallTo && (
                <span className="view-log-date-hint"><Pin size={9} /> Range selected</span>
              )}
            </div>

          </div>{/* end vl-row2-fields */}

          {/* Actions — right side, aligned to bottom */}
          <div className="vl-actions">
            <button type="button" className="view-log-filter-clear-btn" onClick={handleClearFilter}>
              Clear
            </button>
            <button type="button" className="view-log-filter-apply-btn" onClick={handleApplyFilter}>
              <Filter size={13} />
              Apply Filter
              {activeFilterCount > 0 && (
                <span className="view-log-filter-badge">{activeFilterCount}</span>
              )}
            </button>
          </div>

        </div>

      </div>

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
                      style={{ width: col.width, minWidth: col.minWidth, maxWidth: col.maxWidth, textAlign: col.align || 'center', cursor: col.sortable ? 'pointer' : 'default', userSelect: col.sortable ? 'none' : 'auto' }}
                      onClick={col.sortable ? () => { setSortField('timestamp'); setSortDir(prev => prev === 'desc' ? 'asc' : 'desc'); } : undefined}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {col.label}
                        {col.sortable && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '24px', height: '24px', borderRadius: '4px',
                            backgroundColor: sortField === 'timestamp' ? '#dbeafe' : '#f3f4f6',
                            transition: 'background-color 0.2s'
                          }}>
                            {sortDir === 'desc'
                              ? <ArrowDownNarrowWide size={14} color={sortField === 'timestamp' ? '#2563eb' : '#4b5563'} />
                              : <ArrowUpNarrowWide size={14} color={sortField === 'timestamp' ? '#2563eb' : '#4b5563'} />
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
                            className={col.cellClassName || ''}
                            style={{
                              width: col.width,
                              minWidth: col.minWidth,
                              maxWidth: col.maxWidth,
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

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
