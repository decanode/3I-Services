import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAllOutstandingsData } from '../hooks/useAllOutstandingsData';
import Table from '../components/Table';
import { SearchBar } from '../components/Button';
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
  const { user } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, refetch } = useAllOutstandingsData(user?.userId);

  const rows = data?.rows ?? [];

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(row =>
      row.ledger_name != null && String(row.ledger_name).toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

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
      key: 'category',
      label: 'Category',
      width: '160px',
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
        <div className="outstandings-header-search">
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ledger name..."
          />
        </div>
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
              data={filteredRows}
              noDataMessage="No ledger remainders found"
              striped={true}
              headerGradient={true}
              tableClassName="outstandings-table"
              containerClassName="outstandings-scroll-container"
              minWidth={800}
            />
          </div>
        )}
      </div>
    </div>
  );
}
