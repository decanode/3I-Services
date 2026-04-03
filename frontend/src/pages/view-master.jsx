import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../utils/api';
import Table from '../components/Table';
import { Pagination } from '../components/Button';
import PageLoader from '../components/loading';
import '../styles/pagestyles/view-master.css';

function formatCell(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function ViewDataPage() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

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
      const res = await fetch(apiUrl('/api/excel/master?limit=1000'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to load');
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setColumns(Array.isArray(data.columns) ? data.columns : []);
    } catch (e) {
      setError(e.message || 'Failed to load');
      setRows([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    () =>
      columns.map((key) => {
        const config = columnConfig[key] || {};
        return {
          key,
          label: key,
          align: config.align || 'center',
          width: config.width || '200px',
          render: (item) => formatCell(item[key]),
        };
      }),
    [columns, columnConfig]
  );

  const tableMinWidth = useMemo(
    () => {
      // Calculate total width of all dynamically mapped columns
      const totalWidth = tableColumns.reduce((sum, col) => {
        const width = col.width ? parseInt(col.width.replace(/[^0-9]/g, ''), 10) : 200;
        return sum + (isNaN(width) ? 200 : width);
      }, 0);
      return Math.max(1200, totalWidth);
    },
    [tableColumns]
  );

  // Pagination logic
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const currentRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return rows.slice(startIndex, startIndex + rowsPerPage);
  }, [rows, currentPage, rowsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const showTable = !loading && !error && columns.length > 0;

  return (
    <div className="viewdata-page">
      {showLoader && (
        <PageLoader
          pageName="Master"
          isDataLoading={loading}
          onComplete={() => setShowLoader(false)}
        />
      )}

      {error && (
        <p className="viewdata-error" role="alert">
          {error}
        </p>
      )}

      {showTable && (
        <div className="viewdata-table-section">
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: '0' }}>
            <Table
              containerClassName="viewdata-reusable-table-container"
              tableClassName="viewdata-reusable-table"
              columns={tableColumns}
              data={currentRows}
              minWidth={tableMinWidth}
              striped
              headerGradient
              defaultAlign="center"
              noDataMessage="No records in Excel_master yet. Upload a file from Excel."
            />
          </div>
          <div style={{ padding: '0.5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
             <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
          </div>
        </div>
      )}
    </div>
  );
}
