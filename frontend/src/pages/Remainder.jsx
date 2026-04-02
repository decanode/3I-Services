import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, MapPin, MessageSquare, AlertCircle, RefreshCw, ChevronRight, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import Alert from '../components/Alert';
import '../styles/pagestyles/Remainder.css';

function formatCurrency(value) {
  if (value == null || value === 0 || value === '0') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return '₹' + num.toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Format as dd-mm-yyyy
    const padZero = (num) => String(num).padStart(2, '0');
    return `${padZero(day)}-${padZero(month)}-${year}`;
  } catch {
    return dateStr;
  }
}

function getDayOffset(dateStr) {
  if (!dateStr) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

function getDayLabel(dayOffset) {
  if (dayOffset === null) return '';
  if (dayOffset === 0) return 'Today';
  if (dayOffset === 1) return 'Tomorrow';
  return `In ${dayOffset} days`;
}

// Card Version Component
export function RemainderCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        // Fetch more items to support expansion
        const res = await fetch(apiUrl('/api/ledger-remainder/upcoming?days=7&limit=50'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch reminders');
        }

        const json = await res.json();
        console.log('[RemainderCard] API Response:', json);
        console.log('[RemainderCard] Sample item:', json.rows?.[0]);
        
        // Use API data directly - backend already filters items with nextCallDate
        const items = (json.rows || [])
          .filter(item => item.nextCallDate); // Filter items with nextCallDate
        
        console.log('[RemainderCard] Items with nextCallDate:', items);
        setItems(items);
        setError(null);
      } catch (e) {
        console.error('Error fetching upcoming:', e);
        setError(e.message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, []);

  // Show 3 items when collapsed, all items when expanded
  const displayItems = expanded ? items : items.slice(0, 3);
  const hasMoreItems = items.length > 3;

  return (
    <div className="remainder-card">
      {/* Header */}
      <div className="remainder-card__header">
        <div className="remainder-card__title-group">
          <div className="remainder-card__icon-wrapper">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="remainder-card__title">Upcoming Calls</h3>
            <p className="remainder-card__subtitle">Next 7 days</p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="remainder-card__badge">{items.length}</span>
        )}
      </div>

      {/* Body */}
      <div className="remainder-card__body">
        {loading && (
          <div className="remainder-card__state">
            <div className="remainder-card__spinner"></div>
            <p>Loading schedule...</p>
          </div>
        )}

        {error && !loading && (
          <div className="remainder-card__state remainder-card__state--error">
            <AlertCircle size={24} />
            <p>Unable to load reminders</p>
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <div className="remainder-card__state">
            <Calendar size={24} />
            <p>No calls scheduled</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="remainder-card__items">
            {displayItems.map((item, idx) => {
              const dayOffset = getDayOffset(item.nextCallDate);
              const isToday = dayOffset === 0;

              const displayDate = formatDate(item.nextCallDate);
              const dayLabel = getDayLabel(dayOffset);

              return (
                <div
                  key={`${item.id || item.ledger_id}-${idx}`}
                  className={`remainder-card__item ${isToday ? 'remainder-card__item--today' : ''}`}
                >
                  {/* Left: Date Badge */}
                  <div className="remainder-card__item-date-section">
                    <div className={`remainder-card__date-badge ${isToday ? 'remainder-card__date-badge--today' : ''}`}>
                      <div className="remainder-card__date-display">{displayDate}</div>
                      {dayLabel && <div className="remainder-card__day-label">{dayLabel}</div>}
                    </div>
                  </div>

                  {/* Center: Ledger Name */}
                  <div className="remainder-card__item-content">
                    <h4 className="remainder-card__item-title">
                      {item.ledger_name || '—'}
                    </h4>
                  </div>

                  {/* Right: Amounts with Icons */}
                  <div className="remainder-card__item-amounts">
                    {formatCurrency(item.debit) && (
                      <div className="remainder-card__amount remainder-card__amount--debit">
                        <TrendingDown size={16} />
                        <span className="remainder-card__amount-label">Debit</span>
                        <span className="remainder-card__amount-value">{formatCurrency(item.debit)}</span>
                      </div>
                    )}
                    {formatCurrency(item.credit) && (
                      <div className="remainder-card__amount remainder-card__amount--credit">
                        <TrendingUp size={16} />
                        <span className="remainder-card__amount-label">Credit</span>
                        <span className="remainder-card__amount-value">{formatCurrency(item.credit)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Show expand/collapse button only if more than 3 items */}
      {hasMoreItems && (
        <button
          type="button"
          className="remainder-card__footer-btn"
          onClick={() => setExpanded(!expanded)}
        >
          <span>{expanded ? 'Show Less' : `View All (${items.length})`}</span>
          <ArrowRight size={16} className={expanded ? 'remainder-card__arrow--up' : ''} />
        </button>
      )}
    </div>
  );
}

// Full Page Version Component
export default function RemainderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [todayDate, setTodayDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertState, setAlertState] = useState(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/ledger-remainder/upcoming?days=7'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.message || json.error || 'Failed to load reminders');
      }

      console.log('[RemainderPage] API Response:', json);
      console.log('[RemainderPage] Sample item:', json.rows?.[0]);
      
      // Use API data directly - backend already filters items with nextCallDate
      const data = (json.rows || [])
        .filter(item => item.nextCallDate); // Filter items with nextCallDate
      
      console.log('[RemainderPage] Items with nextCallDate:', data);
      setData(data);
      setTodayDate(json.todayDate || new Date().toISOString().split('T')[0]);
    } catch (e) {
      console.error('Error loading remainders:', e);
      setError(e.message || 'Failed to load upcoming reminders');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group data by nextCallDate (only items with nextCallDate)
  const groupedByDate = data.reduce((acc, item) => {
    // Skip items without nextCallDate
    if (!item.nextCallDate) return acc;
    
    const dateKey = item.nextCallDate;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {});

  // Sort dates (ascending - nearest date first)
  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="remainder-page">
      {alertState && (
        <Alert
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          onConfirm={alertState.onConfirm || (() => setAlertState(null))}
          onCancel={alertState.onCancel || (() => setAlertState(null))}
        />
      )}

      {/* Header */}
      <div className="remainder-header">
        <div className="remainder-header__content">
          <div>
            <h1 className="remainder-header__title">Upcoming Calls & Reminders</h1>
            <p className="remainder-header__subtitle">
              Next 7 days schedule for follow-ups and calls
            </p>
          </div>
          <button
            type="button"
            className="remainder-header__refresh"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'remainder-header__refresh-icon--spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="remainder-alert remainder-alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && !data.length && !error && (
        <div className="remainder-loading">
          <div className="remainder-loading__spinner"></div>
          <p>Loading upcoming reminders...</p>
        </div>
      )}

      {!loading && data.length === 0 && !error && (
        <div className="remainder-empty">
          <Calendar size={48} />
          <h3>No reminders scheduled</h3>
          <p>You don't have any calls or follow-ups scheduled in the next 7 days.</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="remainder-timeline">
          {sortedDates.map((dateKey) => {
            const dayOffset = getDayOffset(dateKey); // dateKey is nextCallDate (YYYY-MM-DD)
            const dayLabel = getDayLabel(dayOffset);
            const items = groupedByDate[dateKey];
            const isToday = dayOffset === 0;

            return (
              <div key={dateKey} className={`remainder-day-group ${isToday ? 'remainder-day-group--today' : ''}`}>
                {/* Day Header */}
                <div className="remainder-day-header">
                  <div className="remainder-day-header__date">
                    <span className={`remainder-day-badge ${isToday ? 'remainder-day-badge--today' : ''}`}>
                      {formatDate(dateKey)}
                    </span>
                    {dayLabel && <span className="remainder-day-label">{dayLabel}</span>}
                  </div>
                  <div className="remainder-day-count">
                    <span className="remainder-day-count__number">{items.length}</span>
                    <span className="remainder-day-count__text">call{items.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Day Items */}
                <div className="remainder-items">
                  {items.map((item, idx) => (
                    <div key={`${item.id || item.ledger_id}-${idx}`} className="remainder-item">
                      <div className="remainder-item__marker"></div>

                      <div className="remainder-item__content">
                        {/* Top Section - Ledger Name */}
                        <div className="remainder-item__header">
                          <h3 className="remainder-item__title">
                            {item.ledger_name || '—'}
                          </h3>
                          {item.ledger_id && (
                            <code className="remainder-item__id">
                              {item.ledger_id}
                            </code>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="remainder-item__meta">
                          {item.city && (
                            <div className="remainder-item__meta-item">
                              <MapPin size={14} />
                              <span>{item.city}</span>
                            </div>
                          )}
                          {item.group && item.group !== '-' && (
                            <div className="remainder-item__meta-item">
                              <FileText size={14} />
                              <span>{item.group}</span>
                            </div>
                          )}
                        </div>

                        {/* Comments Section */}
                        {item.lastComments && (
                          <div className="remainder-item__comments">
                            <div className="remainder-item__comments-icon">
                              <MessageSquare size={16} />
                            </div>
                            <p className="remainder-item__comments-text">
                              {item.lastComments}
                            </p>
                          </div>
                        )}

                        {/* Amount Info */}
                        <div className="remainder-item__amounts">
                          {item.debit !== 0 && (
                            <div className="remainder-item__amount remainder-item__amount--debit">
                              <span className="remainder-item__amount-label">Debit</span>
                              <span className="remainder-item__amount-value">
                                ₹{item.debit.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {item.credit !== 0 && (
                            <div className="remainder-item__amount remainder-item__amount--credit">
                              <span className="remainder-item__amount-label">Credit</span>
                              <span className="remainder-item__amount-value">
                                ₹{item.credit.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Arrow */}
                      <div className="remainder-item__arrow">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
