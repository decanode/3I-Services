import { useState, useRef, useEffect } from 'react';
import { Upload, FileUp, Download, Settings, Trash2, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Alert from '../components/Alert';
import { apiUrl } from '../utils/api';
import '../styles/pagestyles/excel.css';

export default function ExcelPage() {
  const [activeCard, setActiveCard] = useState(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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

  const handleTemplateDownload = (e, cardId) => {
    e.stopPropagation(); // Prevent card click event

    let worksheetData = [];
    let fileName = '';
    let columnWidths = [];

    if (cardId === 'master') {
      // Master template headers - all 40 fields as per backend EXCEL_MASTER_FIELDS
      worksheetData = [
        [
          'CODE', 'TYPE', 'LEDGER', 'CITY', 'GROUP', 'NAME',
          'ADDRESS1', 'ADDRESS2', 'ADDRESS3', 'PIN', 'EMAIL', 'SITE',
          'CONTACT', 'PHONE1', 'PHONE2', 'MOBILE', 'RESI', 'FAX',
          'LICENCE', 'TIN', 'STNO', 'PANNO', 'MR', 'AREA',
          'ROUT', 'TPT', 'TPTDLV', 'BANK', 'BANKADD1', 'BANKADD2',
          'BRANCH', 'CRDAYS', 'CRAMOUNT', 'LIMITBILL', 'LIMITDAY',
          'LIMITTYPE', 'FREEZ'
        ],
      ];
      fileName = 'master_template.xlsx';
      // Set column widths - all columns 15 characters wide
      columnWidths = worksheetData[0].map(() => ({ wch: 15 }));
    } else if (cardId === 'outstanding') {
      // Outstanding template with blank rows 1-3, headers in row 4, data starts row 5
      worksheetData = [
        ['', '', '', '', '', ''],  // Row 1: Empty
        ['', '', '', '', '', ''],  // Row 2: Empty
        ['', '', '', '', '', ''],  // Row 3: Empty
        ['SERIAL', 'LEDGER', 'GROUP', 'DEBIT', 'CREDIT', 'COMMENTS'],  // Row 4: Column headers
      ];
      fileName = 'outstanding_template.xlsx';
      // Set specific column widths for outstanding template
      columnWidths = [
        { wch: 10 },  // SERIAL - narrow for numbers
        { wch: 35 },  // LEDGER - wider for ledger names
        { wch: 30 },  // GROUP
        { wch: 15 },  // DEBIT
        { wch: 15 },  // CREDIT
        { wch: 30 },  // COMMENTS - wider for comments
      ];
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = columnWidths;


    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !fileType) return;

    const card = cards.find(c => c.id === fileType);
    setUploading(true);
    setAlert({
      type: 'uploading',
      title: 'Uploading',
      message: `Uploading ${file.name}...`,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(apiUrl(card.endpoint), {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
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

      // Handle outstanding upload success with validation results
      if (fileType === 'outstanding') {
        const foundCount = data.found?.length || 0;
        const notFoundCount = data.notFound?.length || 0;

        // Always show success on successful upload response.
        // If some ledgers were not found, we still consider the upload processed.
        setAlert({
          type: 'success',
          title: 'Upload Successful',
          message: (
            <div className="upload-success-stats">
              <span className="stat-item success-stat"><Check size={16} /> Processed: {data.processed} records</span>
              <span className="stat-item success-stat"><Check size={16} /> Updated: {data.updated} ledgers</span>
              <span className="stat-item success-stat"><Check size={16} /> Logs created: {data.logsCreated}</span>
              {notFoundCount > 0 && (
                <span className="stat-item warning-stat"><AlertTriangle size={16} /> Not found in master: {notFoundCount}</span>
              )}
            </div>
          ),
          onConfirm: () => {
            setAlert(null);
            setUploading(false);
            setActiveCard(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          },
        });
      } else {
        // Master upload success
        setAlert({
          type: 'success',
          title: 'Upload Successful',
          message: `${data.inserted} records imported from ${data.fileName}`,
          onConfirm: () => {
            setAlert(null);
            setUploading(false);
            setActiveCard(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          },
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setAlert({
        type: 'error',
        title: 'Upload Failed',
        message: error.message || 'An error occurred during upload',
        onCancel: () => {
          setAlert(null);
          setUploading(false);
          setActiveCard(null);
        },
        onConfirm: () => {
          setAlert(null);
          setUploading(false);
          setActiveCard(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      });
    }
  };

  const handleClearData = async (collection) => {
    const collectionNames = {
      'master': 'Excel Master Data',
      'remainder': 'Ledger Remainder',
      'logs': 'Ledger Logs',
      'all': 'All Data (Master, Remainder & Logs)'
    };

    setShowDropdown(false);

    setAlert({
      type: 'confirm',
      title: 'Confirm Delete',
      message: `Are you sure you want to delete ${collectionNames[collection]}? This action cannot be undone.`,
      onCancel: () => setAlert(null),
      onConfirm: async () => {
        setAlert({
          type: 'uploading',
          title: 'Deleting',
          message: `Deleting ${collectionNames[collection]}...`,
        });

        try {
          const response = await fetch(apiUrl(`/api/excel/clear/${collection}`), {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.message || 'Delete failed');
          }

          setAlert({
            type: 'success',
            title: 'Delete Successful',
            message: data.message || `${collectionNames[collection]} deleted successfully`,
            onConfirm: () => setAlert(null),
          });
        } catch (error) {
          console.error('Delete error:', error);
          setAlert({
            type: 'error',
            title: 'Delete Failed',
            message: error.message || 'An error occurred during deletion',
            onConfirm: () => setAlert(null),
          });
        }
      },
    });
  };

  return (
    <div className="excel-page">
      {/* Database Management Dropdown */}
      <div className="db-management-container" ref={dropdownRef}>
        <button
          className="db-management-btn"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Database Management"
        >
          <Settings size={20} />
          <span>Manage Data</span>
          <ChevronDown size={16} className={showDropdown ? 'rotate' : ''} />
        </button>

        {showDropdown && (
          <div className="db-dropdown">
            <div className="dropdown-header">
              <Trash2 size={18} />
              <span>Clear Database Collections</span>
            </div>
            <button
              className="dropdown-item danger"
              onClick={() => handleClearData('master')}
            >
              <Trash2 size={16} />
              <span>Clear Excel Master</span>
            </button>
            <button
              className="dropdown-item danger"
              onClick={() => handleClearData('remainder')}
            >
              <Trash2 size={16} />
              <span>Clear Ledger Remainder</span>
            </button>
            <button
              className="dropdown-item danger"
              onClick={() => handleClearData('logs')}
            >
              <Trash2 size={16} />
              <span>Clear Ledger Logs</span>
            </button>
            <div className="dropdown-divider"></div>
            <button
              className="dropdown-item danger-high"
              onClick={() => handleClearData('all')}
            >
              <Trash2 size={16} />
              <span>Clear All Data</span>
            </button>
          </div>
        )}
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
              <button
                className="template-download-btn"
                onClick={(e) => handleTemplateDownload(e, card.id)}
                title="Download Template"
                aria-label={`Download ${card.title} template`}
              >
                <Download size={20} />
              </button>
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
        />
      )}
    </div>
  );
}
