import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, MapPin, MessageSquare, AlertCircle, RefreshCw, ChevronRight, ArrowRight, TrendingDown, TrendingUp, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Alert from '../components/Alert';
import { BackButton } from '../components/Button';
import '../styles/pagestyles/Remainder.css';

function formatCurrency(value) {
  const num = parseFloat(value);
  if (!value || isNaN(num) || num === 0) return null;
  return '₹' + num.toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
}

function getDayOffset(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function getDayLabel(offset) {
  if (offset === null) return '';
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return `In ${offset} days`;
}

function getLatestComment(lastComments) {
  if (!lastComments) return null;
  if (Array.isArray(lastComments)) return lastComments[lastComments.length - 1]?.text || null;
  return typeof lastComments === 'string' ? lastComments : null;
}

async function fetchUpcoming(days = 7, limit = '') {
  const res = await apiFetch(`/api/ledger-remainder/upcoming?days=${days}${limit ? `&limit=${limit}` : ''}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || 'Failed to load reminders');
  return json;
}

// ─── Card (Dashboard Widget) ────────────────────────────────────────────────

export function RemainderCard() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchUpcoming(7, 50)
      .then(json => setItems((json.rows || []).filter(i => i.nextCallDate)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = expanded ? items : items.slice(0, 3);

  return (
    <div className="rc">
      <div className="rc__content">
        <div className="rc__header">
          <div className="rc__title-row">
            <div className="rc__icon"><Calendar size={18} /></div>
            <div>
              <h3 className="rc__title">Upcoming Calls</h3>
              <p className="rc__sub">Next 7 days</p>
            </div>
          </div>
          {items.length > 0 && <span className="rc__badge">{items.length}</span>}
        </div>

        <div className="rc__body">
          {loading && (
            <div className="rc__state">
              <div className="rc__spinner" />
              <p>Loading schedule…</p>
            </div>
          )}
          {!loading && error && (
            <div className="rc__state rc__state--error">
              <AlertCircle size={22} />
              <p>Unable to load reminders</p>
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="rc__state">
              <Calendar size={22} />
              <p>No calls scheduled</p>
            </div>
          )}
          {!loading && !error && items.length > 0 && visible.map((item, idx) => {
            const offset = getDayOffset(item.nextCallDate);
            const comment = getLatestComment(item.lastComments);
            return (
              <div key={`${item.id ?? item.ledger_id}-${idx}`} className={`rc__item${offset === 0 ? ' rc__item--today' : ''}`} onClick={() => navigate('/view-notify-detail', { state: { row: item } })} style={{ cursor: 'pointer' }}>
                <div className={`rc__date-badge${offset === 0 ? ' rc__date-badge--today' : ''}`}>
                  <span>{formatDate(item.nextCallDate)}</span>
                  {getDayLabel(offset) && <span className="rc__day-label">{getDayLabel(offset)}</span>}
                </div>
                <div className="rc__item-mid">
                  <span className="rc__name">{item.ledger_name || '—'}</span>
                  <div className="rc__item-chips">
                    {item.category && <span className="rc__category">Cat: {item.category}</span>}
                    {comment && (<span className="rc__comment">{comment}</span>)}
                    {formatCurrency(item.debit) && ( <span className="rc__amt rc__amt--debit"> <TrendingDown size={13} /> {formatCurrency(item.debit)} </span>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {items.length > 3 && (
        <button className="rc__footer" onClick={() => setExpanded(x => !x)}>
          <span>{expanded ? 'Show Less' : `View All (${items.length})`}</span>
          <ArrowRight size={15} className={expanded ? 'rc__arrow-up' : ''} />
        </button>
      )}
    </div>
  );
}

// ─── Full Page ───────────────────────────────────────────────────────────────

export default function RemainderPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertState, setAlertState] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchUpcoming(7)
      .then(json => setData((json.rows || []).filter(i => i.nextCallDate)))
      .catch(e => { setError(e.message); setData([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = data.reduce((acc, item) => {
    (acc[item.nextCallDate] ??= []).push(item);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="rp">
      {/* Back Button */}
      <div className="back-button-container--safe">
        <BackButton 
          onClick={() => navigate(-1)}
          title="Go Back"
          size="medium"
          showLabel={true}
        />
      </div>

      {alertState && (
        <Alert
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          onConfirm={alertState.onConfirm || (() => setAlertState(null))}
          onCancel={alertState.onCancel || (() => setAlertState(null))}
        />
      )}

      <div className="rp__header">
        <div className="rp__header-inner">
          <div>
            <h1 className="rp__title">Upcoming Calls & Reminders</h1>
            <p className="rp__sub">Next 7 days schedule for follow-ups</p>
          </div>
          <button className="rp__refresh" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rp__alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && !data.length && (
        <div className="rp__center">
          <div className="rp__spinner" />
          <p>Loading upcoming reminders…</p>
        </div>
      )}

      {!loading && !data.length && !error && (
        <div className="rp__center">
          <Calendar size={44} />
          <h3>No reminders scheduled</h3>
          <p>No calls or follow-ups in the next 7 days.</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="rp__timeline">
          {sortedDates.map(dateKey => {
            const offset = getDayOffset(dateKey);
            const isToday = offset === 0;
            const items = grouped[dateKey];

            return (
              <div key={dateKey} className={`rp__group${isToday ? ' rp__group--today' : ''}`}>
                <div className="rp__day-header">
                  <div className="rp__day-left">
                    <span className={`rp__day-badge${isToday ? ' rp__day-badge--today' : ''}`}>
                      {formatDate(dateKey)}
                    </span>
                    {getDayLabel(offset) && (
                      <span className="rp__day-label">{getDayLabel(offset)}</span>
                    )}
                  </div>
                  <span className="rp__day-count">
                    <b>{items.length}</b> call{items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="rp__items">
                  {items.map((item, idx) => (
                    <div key={`${item.id ?? item.ledger_id}-${idx}`} className="rp__item" onClick={() => navigate('/view-notify-detail', { state: { row: item } })} style={{ cursor: 'pointer' }}>
                      <div className="rp__item-body">
                        {/* Left */}
                        <div className="rp__item-left">
                          <div className="rp__item-name-row">
                            <h3 className="rp__item-name">{item.ledger_name || '—'}</h3>
                            {item.ledger_id && <code className="rp__item-id">{item.ledger_id}</code>}
                          </div>
                          <div className="rp__item-meta">
                            {item.city && <span><MapPin size={12} /> {item.city}</span>}
                            {item.group && item.group !== '-' && <span><FileText size={12} /> {item.group}</span>}
                            {item.category && <span className="rp__item-cat"><Tag size={11} /> Cat {item.category}</span>}
                          </div>
                        </div>

                        {/* Center */}
                        {getLatestComment(item.lastComments) && (
                          <div className="rp__item-comment">
                            <MessageSquare size={14} />
                            <p>{getLatestComment(item.lastComments)}</p>
                          </div>
                        )}

                        {/* Right */}
                        <div className="rp__item-amounts">
                          {item.debit !== 0 && (
                            <div className="rp__amt rp__amt--debit">
                              <span>Debit</span>
                              <b>₹{item.debit.toFixed(2)}</b>
                            </div>
                          )}
                          {item.credit !== 0 && (
                            <div className="rp__amt rp__amt--credit">
                              <span>Credit</span>
                              <b>₹{item.credit.toFixed(2)}</b>
                            </div>
                          )}
                        </div>
                      </div>

                      <ChevronRight size={18} className="rp__item-arrow" />
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
