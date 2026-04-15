import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react';
import { useOutstandingsData } from '../hooks/useOutstandingsData';
import Table from '../components/Table';
import { Pagination } from '../components/Button';
import PageLoader from '../components/loading';
import Alert from '../components/Alert';
import '../styles/pagestyles/view-outstandings.css';
import '../styles/componentstyles/Alert.css';

function formatCurrency(value) {
  if (value == null || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d) ? val : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}


export default function ViewOutstandingsPage() {
  const navigate = useNavigate();

  // Cursor stack — last element is the current page's cursor (null = page 1)
  const [cursorStack, setCursorStack] = useState([null]);
  const [pageIndex, setPageIndex] = useState(1);
  const [showLoader, setShowLoader] = useState(true);

  // Sort state
  const [sortField, setSortField] = useState('nextCallDate');
  const [sortDir, setSortDir] = useState('asc');

  const currentCursor = cursorStack[cursorStack.length - 1];

  // React Query: serves from 5-min cache on revisit, no Firestore reads
  const { data, isLoading, isError, error, refetch } = useOutstandingsData(currentCursor);

  const rows       = data?.rows       ?? [];
  const nextCursor = data?.nextCursor ?? null;

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

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  // Sort applied client-side on the 15 loaded rows
  const displayRows = useMemo(() => {
    let result = [...rows];

    result.sort((a, b) => {
      if (sortField === 'nextCallDate') {
        const aHas = !!a.nextCallDate;
        const bHas = !!b.nextCallDate;
        if (!aHas && !bHas) return String(a.ledger_name ?? '').localeCompare(String(b.ledger_name ?? ''));
        if (!aHas) return 1;
        if (!bHas) return -1;
        const diff = a.nextCallDate.localeCompare(b.nextCallDate);
        return sortDir === 'asc' ? diff : -diff;
      }
      if (sortField === 'debit' || sortField === 'credit') {
        const diff = (parseFloat(a[sortField]) || 0) - (parseFloat(b[sortField]) || 0);
        return sortDir === 'asc' ? diff : -diff;
      }
      // ledger_name
      const diff = String(a.ledger_name ?? '').localeCompare(String(b.ledger_name ?? ''));
      return sortDir === 'asc' ? diff : -diff;
    });

    return result;
  }, [rows, sortField, sortDir]);

  function SortIcon({ field }) {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ArrowUpNarrowWide size={13} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
      : <ArrowDownNarrowWide size={13} style={{ marginLeft: 4, verticalAlign: 'middle' }} />;
  }

  function SortableLabel({ field, children }) {
    return (
      <button
        className="outstandings-sort-btn"
        onClick={() => handleSort(field)}
        title={`Sort by ${children}`}
      >
        {children}
        <SortIcon field={field} />
      </button>
    );
  }

  const columns = useMemo(() => [
    {
      key: 'ledger_name',
      label: <SortableLabel field="ledger_name">Ledger Name</SortableLabel>,
      width: '280px',
      align: 'center',
    },
    {
      key: 'group',
      label: 'Group',
      width: '200px',
      align: 'center',
    },
    {
      key: 'debit',
      label: <SortableLabel field="debit">Debit</SortableLabel>,
      width: '150px',
      align: 'center',
      render: (item) => formatCurrency(item.debit),
    },
    {
      key: 'credit',
      label: <SortableLabel field="credit">Credit</SortableLabel>,
      width: '150px',
      align: 'center',
      render: (item) => formatCurrency(item.credit),
    },
    {
      key: 'nextCallDate',
      label: <SortableLabel field="nextCallDate">Next Call Date</SortableLabel>,
      width: '160px',
      align: 'center',
      render: (item) => formatDate(item.nextCallDate),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sortField, sortDir]);

  return (
    <div className="outstandings-page">
      {showLoader && (
        <PageLoader
          pageName="Outstandings"
          isDataLoading={isLoading}
          duration={2500}
          onComplete={() => setShowLoader(false)}
        />
      )}

      {isError && (
        <Alert
          type="error"
          title="Load Failed"
          message={error?.message || 'Failed to load outstanding data'}
          onConfirm={() => refetch()}
          onCancel={() => {}}
        />
      )}

      <div className="outstandings-header">
        <h1>Outstanding Data :</h1>
        <button className="page-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="outstandings-table-section">
        {isLoading ? (
          <div className="outstandings-loading">Loading...</div>
        ) : (
          <div className="outstandings-table-container">
            <Table
              columns={columns}
              data={displayRows}
              noDataMessage="No ledger remainders found"
              striped={true}
              headerGradient={true}
              tableClassName="outstandings-table"
              containerClassName="outstandings-scroll-container"
              minWidth={800}
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
