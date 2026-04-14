import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

  const columns = useMemo(() => [
    {
      key: 'ledger_name',
      label: 'Ledger Name',
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
      key: 'nextCallDate',
      label: 'Next Call Date',
      width: '160px',
      align: 'center',
      render: (item) => formatDate(item.nextCallDate),
    },
  ], []);

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
              data={rows}
              noDataMessage="No ledger remainders found"
              striped={true}
              headerGradient={true}
              tableClassName="outstandings-table"
              containerClassName="outstandings-scroll-container"
              minWidth={800}
            />

            <Pagination
              currentPage={pageIndex}
              hasPrev={cursorStack.length > 1}
              hasNext={nextCursor != null}
              onPrev={goPrev}
              onNext={goNext}
            />
          </div>
        )}
      </div>
    </div>
  );
}
