import { useState, useEffect, useMemo } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { apiUrl } from '../utils/api';
import Table from '../components/Table';
import { Button } from '../components/Button';
import '../styles/pagestyles/view-log.css';

export default function ViewLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, credit, debit

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(20);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/ledger-logs?limit=1000'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load ledger logs');
      }

      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load data');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = useMemo(() => [
    {
      key: 'timestamp',
      label: 'Timestamp',
      width: '180px',
      align: 'center',
      render: (item) => <span style={{ fontSize: '1rem', color: '#6b7280' }}>
        {new Date(item.timestamp).toLocaleString()}
      </span>
    },
    {
      key: 'ledger_id',
      label: 'Ledger ID',
      width: '120px',
      align: 'center',
      render: (item) => <strong style={{ fontFamily: "'Courier New', monospace" }}>{item.ledger_id}</strong>
    },
    {
      key: 'ledger_name',
      label: 'Ledger Name',
      width: '250px',
      align: 'center',
      render: (item) => <span style={{ fontWeight: 500 }}>{item.ledger_name || '-'}</span>
    },
    {
      key: 'operation',
      label: 'Operation',
      width: '100px',
      align: 'center',
      render: (item) => <span style={{ textTransform: 'capitalize' }}>{item.operation}</span>
    },
    {
      key: 'debit',
      label: 'Debit',
      width: '120px',
      align: 'center',
      render: (item) => item.debit > 0 
        ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{item.debit.toFixed(2)}</span>
        : <span style={{ color: '#9ca3af' }}>-</span>
    },
    {
      key: 'credit',
      label: 'Credit',
      width: '120px',
      align: 'center',
      render: (item) => item.credit > 0 
        ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{item.credit.toFixed(2)}</span>
        : <span style={{ color: '#9ca3af' }}>-</span>
    },
    {
      key: 'comments',
      label: 'Comments',
      width: '200px',
      align: 'center',
      render: (item) => <span style={{ fontSize: '1.05rem', color: '#555' }}>{item.comments || '-'}</span>
    }
  ], []);

  const tableMinWidth = useMemo(() => {
    return columns.reduce((sum, col) => {
      const width = col.width ? parseInt(col.width.replace(/[^0-9]/g, ''), 10) : 200;
      return sum + (isNaN(width) ? 200 : width);
    }, 0);
  }, [columns]);

  // Filter logs step
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filterType === 'credit') {
      result = result.filter(log => log.credit > 0);
    } else if (filterType === 'debit') {
      result = result.filter(log => log.debit > 0);
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(log => 
        (log.ledger_name && log.ledger_name.toLowerCase().includes(lowerTerm)) ||
        (log.ledger_id && log.ledger_id.toLowerCase().includes(lowerTerm)) ||
        (log.comments && log.comments.toLowerCase().includes(lowerTerm))
      );
    }

    // Sort heavily by newest timestamp
    result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return result;
  }, [logs, searchTerm, filterType]);

  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const currentLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredLogs, currentPage, rowsPerPage]);

  return (
    <div className="view-log-page">
      <div className="view-log-header">
        <h2>Ledger Activity Logs</h2>
      </div>

      <div className="view-log-filters">
        <div className="view-log-search">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by ledger name, ID, or comments..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
        <div className="view-log-toggles">
          <Button 
            variant={filterType === 'all' ? 'primary' : 'outline'} 
            onClick={() => { setFilterType('all'); setCurrentPage(1); }}
          >
            All
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
      </div>

      <div className="view-log-content">
        {loading ? (
          <div className="view-log-empty">
            <p>Loading activity logs...</p>
          </div>
        ) : error ? (
          <div className="view-log-error">
            <AlertCircle size={24} style={{ display: 'inline', marginRight: '8px' }} />
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="view-log-empty">
            <AlertCircle size={48} style={{ marginBottom: '16px', color: '#ccc' }} />
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="view-log-table-container">
            <Table
              className="view-log-table"
              columns={columns}
              data={currentLogs}
              noDataMessage="No records found"
              minWidth={tableMinWidth}
              striped={true}
              headerGradient={true}
              defaultAlign="center"
            />

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
