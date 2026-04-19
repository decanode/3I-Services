import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAllMasterData } from '../hooks/useAllMasterData';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Table from '../components/Table';
import { SearchBar, Button, ExpandColumnsButton } from '../components/Button';
import PageLoader from '../components/loading';
import Alert from '../components/Alert';
import '../styles/pagestyles/view-master.css';
import '../styles/componentstyles/Alert.css';

const COLUMN_LABELS = {
  code: 'Code', type: 'Type', ledger: 'Ledger', city: 'City',
  group: 'Group', name: 'Name', address1: 'Address 1', address2: 'Address 2',
  address3: 'Address 3', pin: 'PIN', email: 'Email', site: 'Website',
  contact: 'Contact', phone1: 'Phone 1', phone2: 'Phone 2', mobile: 'Mobile',
  resi: 'Residence', fax: 'Fax', licence: 'Licence', tin: 'TIN',
  stno: 'ST No.', panno: 'PAN No.', mr: 'MR', area: 'Area',
  rout: 'Route', tpt: 'Transport', tptdlv: 'TPT Delivery',
  bank: 'Bank', bankadd1: 'Bank Address 1', bankadd2: 'Bank Address 2',
  branch: 'Branch', crdays: 'CR Days', cramount: 'CR Amount',
  limitbill: 'Limit Bill', limitday: 'Limit Day', limittype: 'Limit Type',
  freez: 'Freeze',
};

function formatCell(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function ViewDataPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  const [rowAlert, setRowAlert] = useState(null);
  const [checkingRow, setCheckingRow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isColumnsExpanded, setIsColumnsExpanded] = useState(false);

  // React Query: fetch all rows once per session per user; staleTime=Infinity prevents re-fetch on revisit
  const { data, isLoading, isError, error, refetch } = useAllMasterData(user?.userId);

  const rows = data?.rows ?? [];
  const columns = data?.columns ?? [];

  // Define default visible columns
  const defaultVisibleColumns = useMemo(() =>
    ['ledger', 'city', 'address1', 'address2', 'address3', 'pin', 'email', 'contact', 'phone1', 'phone2', 'mobile', 'tin'],
    []
  );

  // Map each exact column key to its desired width and alignment
  const columnConfig = useMemo(() => ({
    'code': { width: '80px', align: 'center' },
    'type': { width: '100px', align: 'center' },
    'ledger': { width: '150px', align: 'center' },
    'city': { width: '120px', align: 'center' },
    'group': { width: '120px', align: 'center' },
    'name': { width: '250px', align: 'center' },
    'address1': { width: '200px', align: 'center' },
    'address2': { width: '200px', align: 'center' },
    'address3': { width: '200px', align: 'center' },
    'pin': { width: '100px', align: 'center' },
    'email': { width: '200px', align: 'center' },
    'site': { width: '200px', align: 'center' },
    'contact': { width: '150px', align: 'center' },
    'phone1': { width: '120px', align: 'center' },
    'phone2': { width: '120px', align: 'center' },
    'mobile': { width: '120px', align: 'center' },
    'resi': { width: '120px', align: 'center' },
    'fax': { width: '120px', align: 'center' },
    'licence': { width: '150px', align: 'center' },
    'tin': { width: '150px', align: 'center' },
    'stno': { width: '150px', align: 'center' },
    'panno': { width: '150px', align: 'center' },
    'mr': { width: '100px', align: 'center' },
    'area': { width: '150px', align: 'center' },
    'rout': { width: '120px', align: 'center' },
    'tpt': { width: '150px', align: 'center' },
    'tptdlv': { width: '150px', align: 'center' },
    'bank': { width: '200px', align: 'center' },
    'bankadd1': { width: '200px', align: 'center' },
    'bankadd2': { width: '200px', align: 'center' },
    'branch': { width: '150px', align: 'center' },
    'crdays': { width: '100px', align: 'center' },
    'cramount': { width: '120px', align: 'center' },
    'limitbill': { width: '120px', align: 'center' },
    'limitday': { width: '100px', align: 'center' },
    'limittype': { width: '120px', align: 'center' },
    'freez': { width: '100px', align: 'center' },
  }), []);

  const tableColumns = useMemo(
    () => {
      const visibleCols = isColumnsExpanded ? columns : columns.filter(col => defaultVisibleColumns.includes(col));
      return visibleCols.map((key) => {
        const config = columnConfig[key] || {};
        return {
          key,
          label: COLUMN_LABELS[key] ?? key,
          align: config.align || 'center',
          width: config.width || '200px',
          render: (item) => formatCell(item[key]),
        };
      });
    },
    [columns, columnConfig, isColumnsExpanded, defaultVisibleColumns]
  );

  const tableMinWidth = useMemo(
    () => {
      const totalWidth = tableColumns.reduce((sum, col) => {
        const width = col.width ? parseInt(col.width.replace(/[^0-9]/g, ''), 10) : 200;
        return sum + (isNaN(width) ? 200 : width);
      }, 0);
      return Math.max(1200, totalWidth);
    },
    [tableColumns]
  );

  // In-page search — filters within loaded rows
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(row =>
      columns.some(key => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [rows, columns, searchQuery]);

  const handleRowClick = useCallback(async (row) => {
    if (!row.ledger_id || checkingRow) return;

    // City authorization check
    const userCity = user?.city?.trim().toLowerCase();
    const rowCity = row?.city?.trim().toLowerCase();
    if (userCity && rowCity && userCity !== rowCity) {
      setRowAlert({ type: 'error', title: 'Not Authorized', message: 'Not authorized for your city' });
      return;
    }

    setCheckingRow(true);
    try {
      const res = await apiFetch(`/api/ledger-remainder/${encodeURIComponent(row.ledger_id)}`);
      if (res.ok) {
        const data = await res.json();
        navigate('/view-notify-detail', { state: { row: data.row } });
      } else {
        setRowAlert({ type: 'error', title: 'Not Found', message: `No outstanding record found for "${row.ledger || row.ledger_id}".` });
      }
    } catch {
      setRowAlert({ type: 'error', title: 'Error', message: 'Failed to check outstanding record.' });
    } finally {
      setCheckingRow(false);
    }
  }, [checkingRow, navigate, user?.city]);

  const showTable = !isLoading && !isError && columns.length > 0;

  return (
    <div className="view-master-page">
      {showLoader && (
        <PageLoader
          pageName="Master"
          isDataLoading={isLoading}
          duration={1500}
          onComplete={() => setShowLoader(false)}
        />
      )}

      {isError && (
        <Alert
          type="error"
          title="Load Failed"
          message={error?.message || 'Failed to load master data'}
          onConfirm={() => refetch()}
          onCancel={() => { }}
        />
      )}

      {showTable && (
        <div className="view-master-table-section">
          <div className="view-master-toolbar">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this page..."
              />
              {searchQuery && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setSearchQuery('')}
                >
                  Show All
                </Button>
              )}
            </div>
            <ExpandColumnsButton
              isExpanded={isColumnsExpanded}
              onClick={() => setIsColumnsExpanded(!isColumnsExpanded)}
              className="view-master-expand-btn"
            />
            <button className="page-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: '0' }}>
            <Table
              containerClassName="view-master-reusable-table-container"
              tableClassName="view-master-reusable-table"
              columns={tableColumns}
              data={filteredRows}
              minWidth={tableMinWidth}
              striped
              headerGradient
              defaultAlign="center"
              noDataMessage="No records in Excel_master yet. Upload a file from Excel."
              onRowClick={handleRowClick}
            />
          </div>
        </div>
      )}

      {rowAlert && (
        <Alert
          type={rowAlert.type}
          title={rowAlert.title}
          message={rowAlert.message}
          onConfirm={() => setRowAlert(null)}
          onCancel={() => setRowAlert(null)}
        />
      )}
    </div>
  );
}
