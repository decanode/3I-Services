import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, ArrowLeft } from 'lucide-react';
import '../styles/componentstyles/Button.css';

// Animated Submit Button with border animation
export const AnimatedButton = ({
  children,
  loading = false,
  loadingText = 'Loading...',
  disabled = false,
  className = '',
  variant = 'dark', // 'dark' | 'light' | 'maroon'
  fullWidth = true,
  type = 'submit',
  ...props
}) => {
  return (
    <button
      type={type}
      className={`animated-btn animated-btn--${variant} ${fullWidth ? 'animated-btn--full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      <span className="animated-btn__box">
        {loading ? loadingText : children}
      </span>
    </button>
  );
};

// Dropdown Component
export const Dropdown = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  icon: Icon,
  required = false,
  name,
  className = '',
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange({
      target: {
        name: name,
        value: option.value
      }
    });
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);

  const isSignup = variant === 'signup';

  return (
    <div className={`form-group ${isSignup ? '!mb-0' : ''}`} ref={dropdownRef}>
      {label && <label htmlFor={name} className={isSignup ? 'text-xs text-rose-200/60 mb-1 block' : ''}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && <Icon className="form-input-icon" size={20} />}
        <div
          className={className || `form-input dropdown-trigger ${isSignup ? '!bg-transparent !border-b !border-rose-300/30 !text-white !p-0 !py-2 focus:!border-amber-400 !shadow-none !rounded-none' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...(isSignup ? {} : { paddingRight: '1rem', backgroundColor: '#fafafa' })
          }}
        >
          <span style={isSignup ? { color: selectedOption ? 'white' : 'rgba(254, 205, 211, 0.5)' } : { color: selectedOption ? '#1f2937' : '#9ca3af' }}>
            {selectedOption ? (selectedOption.shortLabel || selectedOption.label) : placeholder}
          </span>
          <ChevronDown
            size={isSignup ? 20 : 16}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: isSignup ? 'white' : '#9ca3af'
            }}
          />
        </div>

        {isOpen && (
          <div className={`dropdown-menu ${isSignup ? '!bg-rose-950 !border !border-rose-300/30 !text-white !right-auto min-w-full whitespace-nowrap z-[100]' : ''}`}>
            {options.map((option) => (
              <div
                key={option.value}
                className={`dropdown-item ${isSignup ? 'hover:!bg-rose-900 !text-white px-3 py-2' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// City options
export const cityOptions = [
  { value: 'Bhopal', label: 'Bhopal' },
  { value: 'delhi', label: 'Delhi' },
  { value: 'bengaluru', label: 'Bengaluru' },
  { value: 'Indore', label: 'Indore' }
];

// Country options
export const COUNTRY_OPTIONS = [
  { value: '+91', label: '+91 - India', shortLabel: '+91' },
  { value: '+65', label: '+65 - Singapore', shortLabel: '+65' },
  { value: '+1', label: '+1 - USA', shortLabel: '+1' },
  { value: '+44', label: '+44 - UK', shortLabel: '+44' },
  { value: '+61', label: '+61 - Australia', shortLabel: '+61' },
  { value: '+86', label: '+86 - China', shortLabel: '+86' },
  { value: '+81', label: '+81 - Japan', shortLabel: '+81' },
  { value: '+33', label: '+33 - France', shortLabel: '+33' },
  { value: '+49', label: '+49 - Germany', shortLabel: '+49' },
  { value: '+39', label: '+39 - Italy', shortLabel: '+39' },
];

// Pagination Component
// Classic mode:  <Pagination currentPage={n} totalPages={t} onPageChange={fn} />
// Cursor mode:   <Pagination currentPage={n} hasPrev={bool} hasNext={bool} onPrev={fn} onNext={fn} />
export const Pagination = ({ currentPage, totalPages, onPageChange, hasPrev, hasNext, onPrev, onNext }) => {
  const isCursor = onPrev !== undefined || onNext !== undefined;

  // Cursor-based mode
  if (isCursor) {
    return (
      <div className="pagination-footer">
        <button
          className="pagination-btn"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} className="pagination-btn__icon" />
          <span className="pagination-btn__label">Previous</span>
        </button>

        <div className="pagination-center">
          <span className="pagination-pill">
            <span className="pagination-pill__page">Page {currentPage}</span>
            {!hasNext && currentPage > 1 && <span className="pagination-pill__badge">Last</span>}
          </span>
        </div>

        <button
          className="pagination-btn"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next page"
        >
          <span className="pagination-btn__label">Next</span>
          <ChevronRight size={16} className="pagination-btn__icon" />
        </button>
      </div>
    );
  }

  // Classic mode — total pages known
  if (totalPages <= 1) return null;
  return (
    <div className="pagination-footer">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} className="pagination-btn__icon" />
        <span className="pagination-btn__label">Previous</span>
      </button>

      <div className="pagination-center">
        <span className="pagination-pill">
          <span className="pagination-pill__page">Page {currentPage}</span>
          <span className="pagination-pill__divider">/</span>
          <span className="pagination-pill__total">{totalPages}</span>
        </span>
      </div>

      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <span className="pagination-btn__label">Next</span>
        <ChevronRight size={16} className="pagination-btn__icon" />
      </button>
    </div>
  );
};

// Search Bar
export const SearchBar = ({ value, onChange, placeholder = 'Search...', className = '' }) => {
  return (
    <div className={`search-bar ${className}`}>
      <Search size={20} className="search-bar-icon" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="search-bar-input"
      />
    </div>
  );
};

// Basic Button
export const Button = ({ children, variant = 'primary', size = 'medium', className = '', ...props }) => {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Legacy Gradient Submit Button (kept for backward compatibility)
export const GradientSubmitButton = ({
  children,
  icon: Icon,
  loading = false,
  loadingText = 'Loading...',
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <AnimatedButton
      loading={loading}
      loadingText={loadingText}
      disabled={disabled}
      className={className}
      variant="maroon"
      {...props}
    >
      {children}
    </AnimatedButton>
  );
};

// Icon Buttons for Save/Cancel Actions
export const SaveButton = ({ onClick, disabled = false, size = 'medium', title = 'Save', className = '', showLabel = false }) => {
  return (
    <button
      className={`icon-btn icon-btn--save icon-btn--${size} ${showLabel ? 'icon-btn--with-label' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      {showLabel && <span className="btn-label">{title}</span>}
    </button>
  );
};

export const CancelButton = ({ onClick, disabled = false, size = 'medium', title = 'Cancel', className = '', showLabel = false }) => {
  return (
    <button
      className={`icon-btn icon-btn--cancel icon-btn--${size} ${showLabel ? 'icon-btn--with-label' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
      {showLabel && <span className="btn-label">{title}</span>}
    </button>
  );
};

export const DeleteButton = ({ onClick, disabled = false, size = 'medium', title = 'Delete', className = '' }) => {
  return (
    <button
      className={`icon-btn icon-btn--delete icon-btn--${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  );
};

// Expand/Collapse Columns Button
export const ExpandColumnsButton = ({ isExpanded = false, onClick, disabled = false, className = '' }) => {
  return (
    <button
      className={`expand-columns-btn ${isExpanded ? 'expanded' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={isExpanded ? 'Show Less Columns' : 'Show More Columns'}
      type="button"
    >
      <span className="expand-columns-btn__text">
        {isExpanded ? 'Show Less' : 'Show More'}
      </span>
      <svg
        className="expand-columns-btn__icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  );
};

// Add Customer Button
export const AddCustomerButton = ({ onClick, disabled = false, className = '', title = 'Add another customer' }) => {
  return (
    <button
      className={`add-customer-btn ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="add-customer-icon">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Add Customer</span>
    </button>
  );
};

// Back Button Component
export const BackButton = ({ onClick, className = '', title = 'Go Back', size = 'medium', showLabel = false }) => {
  return (
    <button
      className={`btn btn-back btn-${size} ${showLabel ? 'btn-back--with-label' : ''} ${className}`}
      onClick={onClick}
      type="button"
      title={title}
      aria-label={title}
    >
      <ArrowLeft size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />
      {showLabel && <span className="btn-back-label">Back</span>}
    </button>
  );
};
