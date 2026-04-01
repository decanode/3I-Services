import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiUrl } from '../utils/api';
import Table from '../components/Table';
import '../styles/pagestyles/view-notify.css';

export default function NotifyPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchRemainders();
  }, []);

  const fetchRemainders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/api/ledger-remainder'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch ledger remainders');
      const json = await res.json();
      setData(json.rows || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let processedData = data.filter(item => {
    const matchesSearch = (item.ledger_name || '').toLowerCase().includes(search.toLowerCase());
    
    // If showAll is toggled, just filter by search and ignore dates entirely
    if (showAll) {
      return matchesSearch;
    }

    if (!item.lastTransactionDate) return false;

    const itemDate = new Date(item.lastTransactionDate);
    itemDate.setHours(0, 0, 0, 0);

    // Show only ledgers with dates that are today or in the future
    return matchesSearch && (itemDate >= today);
  });

  const columns = [
    { 
      key: 'ledger_name', 
      label: 'Ledger Name',
      render: (row) => {
        const itemDate = new Date(row.lastTransactionDate);
        itemDate.setHours(0, 0, 0, 0);
        const isToday = itemDate.getTime() === today.getTime();

        return (
          <div className="ledger-name-wrapper">
            <span>{row.ledger_name}</span>
            {isToday && <span className="today-badge">Today</span>}
          </div>
        );
      }
    },
    { key: 'lastTransactionDate', label: 'Date', render: (row) => row.lastTransactionDate ? row.lastTransactionDate : '-' },
    { 
      key: 'lastComments', 
      label: 'Comments',
      render: (row) => (
        <a href="#" className="comment-link" onClick={(e) => {
          e.preventDefault();
          navigate('/notify-detail', { state: { row } });
        }}>
          {row.lastComments || 'No comments'}
        </a>
      )
    }
  ];

  return (
    <div className="ledger-page">
      <div className="ledger-header">
        <h2>Collection Details</h2>
        <div className="search-card">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search by Ledger Name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button 
            className={`filter-btn ${showAll ? 'active' : ''}`}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Pending' : 'Show All'}
          </button>
        </div>
      </div>

      <div className="ledger-content">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <Table 
            columns={columns} 
            data={processedData} 
            minWidth={1700}
            striped={true}
          />
        )}
      </div>
    </div>
  );
}
