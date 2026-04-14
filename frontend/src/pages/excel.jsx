import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileUp, ArrowLeft } from 'lucide-react';

import Alert from '../components/Alert';
import '../styles/pagestyles/excel.css';

export default function ExcelPage() {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState(null);
  const fileInputRef = useRef(null);
  const [alert, setAlert] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('uploading'); // 'uploading' | 'processing'
  const [fileType, setFileType] = useState(null);
  const progressIntervalRef = useRef(null);

  const cards = [
    {
      id: 'master',
      title: 'Upload Master',
      desc: 'Upload and manage Excel master data files. Import new records and update existing master data.',
      icon: Upload,
      color: '#AEB784',
      endpoint: '/api/excel/master/upload',
    },
    {
      id: 'outstanding',
      title: 'Upload Outstandings',
      desc: 'Upload outstanding ledger transactions. Validates against master ledger data, updates debit/credit values, and maintains audit logs.',
      icon: FileUp,
      color: '#AEB784',
      endpoint: '/api/excel/outstanding/upload',
    },
  ];

  const handleCardClick = (cardId) => {
    setActiveCard(cardId);
    setFileType(cardId);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !fileType) return;

    const card = cards.find(c => c.id === fileType);
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadPhase('uploading');
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setAlert({
      type: 'uploading',
      title: 'Uploading',
      message: `Uploading ${file.name}...`,
      fileName: file.name,
      fileSize: file.size,
      fileCount: { current: 1, total: 1 },
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadStartTime = Date.now();

      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            // Cap file-transfer phase at 60% — remaining 35% reserved for server processing
            const progress = Math.round((e.loaded / e.total) * 60);
            const elapsed = (Date.now() - uploadStartTime) / 1000;
            const speed = elapsed > 0 ? e.loaded / elapsed : 0;
            setUploadProgress(progress);
            setUploadSpeed(speed);
          }
        };

        xhr.upload.onloadend = () => {
          // File bytes sent — server is now processing; switch to processing phase
          setUploadSpeed(0);
          setUploadPhase('processing');
          let current = 60;
          progressIntervalRef.current = setInterval(() => {
            current = current + (99 - current) * 0.015;
            setUploadProgress(Math.round(current));
          }, 200);
        };

        xhr.onload = () => {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          if (xhr.status === 401) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            headers: { get: (h) => xhr.getResponseHeader(h) },
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            text: () => Promise.resolve(xhr.responseText),
          });
        };

        xhr.onerror = () => {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          reject(new Error('Network error during upload'));
        };
        xhr.onabort = () => {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          reject(new Error('Upload aborted'));
        };

        const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
        const url = base ? `${base}${card.endpoint}` : card.endpoint;
        xhr.open('POST', url);
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      // Try to parse response as JSON
      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        // Handle outstanding upload errors with validation details
        if (fileType === 'outstanding' && data.invalidRecords) {
          const invalidCount = data.invalidRecords.length;
          const errorList = data.invalidRecords
            .slice(0, 5)
            .map(r => `- ${r.ledger || 'Unknown'}: ${r.error}`)
            .join('\n');
          throw new Error(
            `${data.message}\n\nFirst 5 errors:\n${errorList}${invalidCount > 5 ? `\n... and ${invalidCount - 5} more` : ''}`
          );
        }
        throw new Error(data?.message || `Upload failed with status ${response.status}`);
      }

      const resetAlert = () => {
        setAlert(null);
        setActiveCard(null);
        setUploadPhase('uploading');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      // Handle outstanding upload success with validation results
      if (fileType === 'outstanding') {
        setAlert({
          type: 'success',
          title: 'Upload Successful',
          stats: {
            type: 'outstanding',
            processed: data.processed,
            updated: data.updated,
            logsCreated: data.logsCreated,
            found: Array.isArray(data.found) ? data.found.length : (data.found ?? 0),
            notFound: Array.isArray(data.notFound) ? data.notFound.length : (data.notFound ?? 0),
            fileName: data.fileName,
          },
          onConfirm: resetAlert,
        });
      } else {
        // Master upload success
        setAlert({
          type: 'success',
          title: 'Upload Successful',
          stats: {
            type: 'master',
            inserted: data.inserted,
            updated: data.updated,
            fileName: data.fileName,
          },
          onConfirm: resetAlert,
        });
      }
    } catch (error) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setUploadProgress(0);
      setUploadSpeed(0);
      setUploadPhase('uploading');
      console.error('Upload error:', error);
      setAlert({
        type: 'error',
        title: 'Upload Failed',
        message: error.message || 'An error occurred during upload',
        onCancel: () => {
          setAlert(null);
          setActiveCard(null);
        },
        onConfirm: () => {
          setAlert(null);
          setActiveCard(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      });
    }
  };

  return (
    <div className="excel-page">
      {/* Top bar: back button */}
      <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 10 }}>
        <button className="page-back-btn" onClick={() => navigate("/home")}>
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="portal-cards-grid">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const cardClassName = `portal-card portal-card-${index + 1} ${activeCard === card.id ? 'active' : ''}`;
          return (
            <div
              key={card.id}
              className={cardClassName}
              onClick={() => handleCardClick(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCardClick(card.id);
                }
              }}
            >
              <div className="portal-card-icon">
                <Icon size={40} color={card.color} />
              </div>
              <h2 className="portal-card-title">{card.title}</h2>
              <p className="portal-card-desc">{card.desc}</p>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-label="Upload Excel file"
      />

      {alert && (
        <Alert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onConfirm={alert.onConfirm}
          onCancel={alert.onCancel}
          progress={uploadProgress}
          fileName={alert.fileName}
          fileSize={alert.fileSize}
          fileCount={alert.fileCount}
          uploadSpeed={uploadSpeed}
          uploadPhase={uploadPhase}
          stats={alert.stats}
        />
      )}
    </div>
  );
}
