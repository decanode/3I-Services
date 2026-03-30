import {CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  CloudUpload,
  X,
  FileText,
  Check
} from 'lucide-react';
import '../styles/componentstyles/Alert.css';
import {
  useEffect,
  useRef
} from 'react';

export default function Alert({
  type,
  title,
  message,
  onConfirm,
  onCancel,
  progress = 0,
  fileName = 'file.pdf',
  fileSize = '4.2 MB',
  fileCount = { current: 1, total: 3 },
  stats = {},
  notFoundLedgers = [],
}) {
  const alertCardRef = useRef(null);

  const closePopup = () => {
    onCancel?.() || onConfirm?.();
  };

  useEffect(() => {
    if (type !== 'loading' && type !== 'uploading' && type !== 'warning' && type !== 'confirm' && type !== 'success' && type !== 'error') {
      const timer = setTimeout(() => {
        closePopup();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [type, onCancel, onConfirm]);

  const handleOverlayClick = (e) => {
    if (
      type !== 'loading' &&
      type !== 'uploading' &&
      type !== 'warning' &&
      type !== 'confirm' &&
      alertCardRef.current &&
      !alertCardRef.current.contains(e.target)
    ) {
      closePopup();
    }
  };

  return (
    <div className="alert-overlay" onClick={handleOverlayClick}>
      {/* CONFIRM */}
      {type === 'confirm' && (
        <div ref={alertCardRef} className="alert-card alert-card--warning">
          <div className="alert-warning-bar"></div>
          <div className="alert-content alert-content--warning">
            <div className="alert-icon-box alert-icon-box--warning">
              <AlertTriangle size={36} />
            </div>
            <h3 className="alert-title">{title}</h3>
            <div className="alert-message">{message}</div>
            <div className="alert-btn-stack">
              <button onClick={onConfirm} className="alert-btn alert-btn--warning">
                Yes, Confirm
              </button>
              <button onClick={onCancel || closePopup} className="alert-btn alert-btn--ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {type === 'success' && (
        <div ref={alertCardRef} className="alert-card alert-card--success">
          <div className="alert-content">
            <div className="alert-icon-wrapper alert-icon-wrapper--success pulse-ring">
              <div className="alert-icon alert-icon--success">
                <CheckCircle2 size={32} />
              </div>
            </div>
            <h3 className="alert-title">{title}</h3>
            <div className="alert-message">{message}</div>
            <button onClick={onConfirm || closePopup} className="alert-btn alert-btn--success">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ERROR */}
      {type === 'error' && (
        <div ref={alertCardRef} className="alert-card alert-card--error">
          <div className="alert-content">
            <div className="alert-icon-wrapper alert-icon-wrapper--error pulse-ring">
              <div className="alert-icon alert-icon--error">
                <XCircle size={32} />
              </div>
            </div>
            <h3 className="alert-title">{title}</h3>
            <div className="alert-message">{message}</div>
            <div className="alert-btn-group">
              <button onClick={onCancel || closePopup} className="alert-btn alert-btn--secondary">
                Cancel
              </button>
              <button onClick={onConfirm || closePopup} className="alert-btn alert-btn--error">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WARNING */}
      {type === 'warning' && (
        <div ref={alertCardRef} className="alert-card alert-card--warning alert-card--warning-large">
          <div className="alert-warning-bar"></div>
          <div className="alert-content alert-content--warning alert-content--warning-large">
            <div className="alert-icon-box alert-icon-box--warning">
              <AlertTriangle size={36} />
            </div>
            <h3 className="alert-title">{title}</h3>
            
            {/* Stats Summary */}
            {stats && Object.keys(stats).length > 0 && (
              <div className="alert-warning-stats">
                <div className="alert-stat-item alert-stat-success">
                  <span className="alert-stat-label">Updated</span>
                  <span className="alert-stat-value">{stats.updated}</span>
                </div>
                <div className="alert-stat-item alert-stat-processed">
                  <span className="alert-stat-label">Processed</span>
                  <span className="alert-stat-value">{stats.processed}</span>
                </div>
                <div className="alert-stat-item alert-stat-logs">
                  <span className="alert-stat-label">Logs</span>
                  <span className="alert-stat-value">{stats.logsCreated}</span>
                </div>
              </div>
            )}
            
            {/* Not Found Ledgers List */}
            {notFoundLedgers && notFoundLedgers.length > 0 && (
              <div className="alert-warning-errors">
                <h4 className="alert-warning-errors-title">
                  Not Found Ledger Master ({notFoundLedgers.length})
                </h4>
                <div className="alert-warning-errors-list">
                  {notFoundLedgers.map((ledger, idx) => (
                    <div key={idx} className="alert-error-item">
                      <span className="alert-error-icon">✕</span>
                      <div className="alert-error-content">
                        <p className="alert-error-name">{ledger.ledger}</p>
                        {ledger.ledger_id && (
                          <p className="alert-error-id">{ledger.ledger_id}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="alert-btn-stack">
              <button onClick={onConfirm || closePopup} className="alert-btn alert-btn--warning">
                Yes, Confirm
              </button>
              <button onClick={onCancel || closePopup} className="alert-btn alert-btn--ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADING */}
      {type === 'loading' && (
        <div ref={alertCardRef} className="alert-card alert-card--loading">
          <div className="alert-content">
            <div className="alert-spinner-wrapper">
              <div className="alert-spinner-ring"></div>
              <div className="alert-spinner-ring alert-spinner-ring--animated"></div>
              <div className="alert-spinner-icon">
                <Loader2 size={24} className="alert-spin" />
              </div>
            </div>
            <h3 className="alert-title">{title}</h3>
            <div className="alert-message alert-message--sm">{message}</div>
          </div>
        </div>
      )}

      {/* UPLOADING */}
      {type === 'uploading' && (
        <div ref={alertCardRef} className="alert-card alert-card--uploading">
          <div className="alert-upload-header">
            <div className="alert-upload-info">
              <div className="alert-upload-icon">
                <CloudUpload size={24} />
              </div>
              <div>
                <h3 className="alert-upload-title">{title}</h3>
                <p className="alert-upload-subtitle">
                  Uploading {fileCount.current} of {fileCount.total} files
                </p>
              </div>
            </div>
            {progress < 100 && (
              <span className="alert-progress-badge">{progress}%</span>
            )}
          </div>

          <div className="alert-file-card">
            <div className="alert-file-info">
              <FileText size={20} className="alert-file-icon" />
              <div className="alert-file-details">
                <p className="alert-file-name">{fileName}</p>
                <p className="alert-file-size">{fileSize}</p>
              </div>
              {progress === 100 && <Check size={18} className="alert-file-check" />}
            </div>
            <div className="alert-progress-bar">
              <div
                className={`alert-progress-fill ${progress === 100 ? 'alert-progress-fill--done' : ''}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {progress === 100 && (
            <button onClick={closePopup} className="alert-btn alert-btn--done">
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}
