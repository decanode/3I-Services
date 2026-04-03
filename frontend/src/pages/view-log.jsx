import { useState, useEffect, useMemo } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { apiUrl } from '../utils/api';
import { Button } from '../components/Button';
import PageLoader from '../components/loading';
import '../styles/pagestyles/view-log.css';

// Helper function to check if a field was updated
const isFieldUpdated = (item, fieldName) => {
  if (item.operation === 'insert') return false; // Initial entries not highlighted
  
  if (fieldName === 'debit') {
    return item.debit !== (item.previous_debit || 0);
  }
  if (fieldName === 'credit') {
    return item.credit !== (item.previous_credit || 0);
  }
  if (fieldName === 'comments') {
    return item.operation === 'update' && item.comments;
  }
  if (fieldName === 'date') {
    return item.operation === 'update' && item.date;
  }
  return false;
};

// Styles for updated cells with different colors for each field type
const updatedCellStyles = {
  debit: {
    backgroundColor: '#dcfce7',
  },
  credit: {
    backgroundColor: '#fee2e2',
  },
  date: {
    backgroundColor: '#ede9fe',
  },
  comments: {
    backgroundColor: '#fef3c7',
  },
};

export default function ViewLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, credit, debit, insert, update

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
      label: 'Created At',
      width: '180px',
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
      width: '250px',
      align: 'center',
      render: (item) => <span style={{ fontWeight: 500 }}>{item.ledger_name || '-'}</span>
    },
    {
      key: 'group',
      label: 'Group',
      width: '150px',
      align: 'center',
      render: (item) => <span style={{ fontSize: '0.95rem' }}>{item.group || '-'}</span>
    },
    {
      key: 'createdByUserId',
      label: 'User ID',
      width: '120px',
      align: 'center',
      render: (item) => <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{item.createdByUserId || '-'}</span>
    },
    {
      key: 'debit',
      label: 'Debit',
      width: '120px',
      align: 'center',
      render: (item) => {
        const isUpdated = isFieldUpdated(item, 'debit');
        const style = isUpdated ? updatedCellStyles.debit : {};
        return item.debit > 0 
          ? <span style={{ color: '#16a34a', fontWeight: 600, ...style }}>{item.debit.toFixed(2)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      }
    },
    {
      key: 'credit',
      label: 'Credit',
      width: '120px',
      align: 'center',
      render: (item) => {
        const isUpdated = isFieldUpdated(item, 'credit');
        const style = isUpdated ? updatedCellStyles.credit : {};
        return item.credit > 0 
          ? <span style={{ color: '#dc2626', fontWeight: 600, ...style }}>{item.credit.toFixed(2)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      }
    },
    {
      key: 'date',
      label: 'Next Call Date',
      width: '150px',
      align: 'center',
      render: (item) => {
        const isUpdated = isFieldUpdated(item, 'date');
        const style = isUpdated ? updatedCellStyles.date : {};
        return item.date ? 
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#059669', ...style }}>{item.date}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      }
    },
    {
      key: 'comments',
      label: 'Comments & Notes',
      width: '250px',
      align: 'center',
      render: (item) => {
        const isUpdated = isFieldUpdated(item, 'comments');
        const style = isUpdated ? updatedCellStyles.comments : {};
        return item.comments ? 
          <span style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic', ...style }}>"{item.comments}"</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      }
    },
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
    } else if (filterType === 'insert') {
      result = result.filter(log => log.operation === 'insert');
    } else if (filterType === 'update') {
      result = result.filter(log => log.operation === 'update');
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(log => 
        (log.ledger_name && log.ledger_name.toLowerCase().includes(lowerTerm)) ||
        (log.ledger_id && log.ledger_id.toLowerCase().includes(lowerTerm)) ||
        (log.group && log.group.toLowerCase().includes(lowerTerm)) ||
        (log.comments && log.comments.toLowerCase().includes(lowerTerm))
      );
    }

    // Sort by newest timestamp
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
      {showLoader && (
        <PageLoader
          pageName="Activity Logs"
          isDataLoading={loading}
          onComplete={() => setShowLoader(false)}
        />
      )}

      <div className="view-log-header">
        <h2>Ledger Activity Logs</h2>
      </div>

      <div className="view-log-filters">
        <div className="view-log-search">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by ledger name, ID, group, or comments..."
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
          <Button 
            variant={filterType === 'insert' ? 'primary' : 'outline'} 
            onClick={() => { setFilterType('insert'); setCurrentPage(1); }}
            className={filterType === 'insert' ? 'active' : ''}
          >
            Initial Entry
          </Button>
          <Button 
            variant={filterType === 'update' ? 'primary' : 'outline'} 
            onClick={() => { setFilterType('update'); setCurrentPage(1); }}
            className={filterType === 'update' ? 'active' : ''}
          >
            Updates
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
            <table className="view-log-custom-table" style={{ minWidth: `${tableMinWidth}px` }}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} style={{ width: col.width, textAlign: col.align || 'center' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentLogs.map((item, rowIndex) => {
                  return (
                    <tr key={item.id || item._id || rowIndex}>
                      {columns.map((col) => {
                        const isUpdated = isFieldUpdated(item, col.key);
                        let cellStyle = {};
                        
                        // Apply appropriate style based on field type
                        if (isUpdated) {
                          if (col.key === 'debit') cellStyle = updatedCellStyles.debit;
                          else if (col.key === 'credit') cellStyle = updatedCellStyles.credit;
                          else if (col.key === 'date') cellStyle = updatedCellStyles.date;
                          else if (col.key === 'comments') cellStyle = updatedCellStyles.comments;
                        }
                        
                        return (
                          <td 
                            key={col.key} 
                            style={{ 
                              width: col.width, 
                              textAlign: col.align || 'center',
                              padding: '12px 8px',
                              borderBottom: '1px solid #e5e7eb',
                              ...cellStyle
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
