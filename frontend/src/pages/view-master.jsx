import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMasterData } from '../hooks/useMasterData';
// import { useUpdateLedger } from '../hooks/useUpdateLedger'; // wire up when inline editing is added
import Table from '../components/Table';
import { Pagination, SearchBar, Button, ExpandColumnsButton } from '../components/Button';
import PageLoader from '../components/loading';
import Alert from '../components/Alert';
import '../styles/pagestyles/view-master.css';
import '../styles/componentstyles/Alert.css';

function formatCell(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function ViewDataPage() {
  const navigate = useNavigate();
  const [showLoader, setShowLoader] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isColumnsExpanded, setIsColumnsExpanded] = useState(false);

  // Cursor stack — last element is the current page's cursor (null = page 1)
  const [cursorStack, setCursorStack] = useState([null]);
  const [pageIndex, setPageIndex] = useState(1);

  const currentCursor = cursorStack[cursorStack.length - 1];

  // React Query: serves from 5-min cache on revisit, no Firestore reads
  const { data, isLoading, isError, error, refetch } = useMasterData(currentCursor);

  // To add inline editing: import useUpdateLedger and call:
  // const { mutate: updateLedger } = useUpdateLedger(currentCursor);
  // updateLedger({ ledger_id, payload: { nextCallDate, lastComments } })

  const rows       = data?.rows    ?? [];
  const columns    = data?.columns ?? [];
  const nextCursor = data?.nextCursor ?? null;

  // Define default visible columns
  const defaultVisibleColumns = useMemo(() =>
    ['ledger', 'city', 'address1', 'address2', 'address3', 'pin', 'email', 'contact', 'phone1', 'phone2', 'mobile', 'tin'],
    []
  );

  const goNext = () => {
    if (nextCursor == null) return;
    setCursorStack(prev => [...prev, nextCursor]);
    setPageIndex(p => p + 1);
    setSearchQuery('');
  };

  const goPrev = () => {
    if (cursorStack.length <= 1) return;
    setCursorStack(prev => prev.slice(0, -1));
    setPageIndex(p => p - 1);
    setSearchQuery('');
  };

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
          label: key,
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

  // In-page search — filters within the 15 loaded rows only
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
          onCancel={() => {}}
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
            />
          </div>
          <Pagination
            currentPage={pageIndex}
            hasPrev={cursorStack.length > 0}
            hasNext={nextCursor != null}
            onPrev={goPrev}
            onNext={goNext}
          />
        </div>
      )}
    </div>
  );
}
