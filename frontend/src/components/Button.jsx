import React, { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import '../styles/componentstyles/Button.css';


export const Dropdown = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  icon: Icon,
  required = false,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon className="form-input-icon" size={20} />}
        <div
          className="form-input dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: '1rem',
            backgroundColor: '#fafafa'
          }}
        >
          <span style={{ color: selectedOption ? '#1f2937' : '#9ca3af' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>

        {isOpen && (
          <div className="dropdown-menu">
            {options.map((option) => (
              <div
                key={option.value}
                className="dropdown-item"
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

// Pagination Component
export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-container">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      
      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
};

export const Button = ({ children, variant = 'primary', size = 'medium', className = '', ...props }) => {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {children}
    </button>
  );
};
