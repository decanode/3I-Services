import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/componentstyles/datepicker.css';

const DatePicker = ({ value, onChange, required = false, disabled = false, variant = 'default', className = '', flow = 'default', minDate = null, maxDate = null }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(new Date().getFullYear() / 9) * 9);
  const [openUpward, setOpenUpward] = useState(false);
  const calendarRef = useRef(null);
  const inputRef = useRef(null);

  const isSignup = variant === 'signup';

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-');
      setSelectedDate(new Date(year, month - 1, day));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smart positioning: Check if calendar should open upward or downward
  useEffect(() => {
    if (showCalendar && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const calendarHeight = 300; // Approximate rounded down calendar height

      // If not enough space below and more space above, open upward
      setOpenUpward(spaceBelow < calendarHeight && spaceAbove > spaceBelow);
    }
  }, [showCalendar]);

  const formatDate = (date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDaysInMonth = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    if (minDate) { const mn = new Date(minDate); mn.setHours(0, 0, 0, 0); if (d < mn) return true; }
    if (maxDate) { const mx = new Date(maxDate); mx.setHours(0, 0, 0, 0); if (d > mx) return true; }
    return false;
  };

  // True if the entire previous month is before minDate
  const isPrevMonthBlocked = () => {
    if (!minDate) return false;
    const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0);
    lastDayOfPrevMonth.setHours(0, 0, 0, 0);
    const mn = new Date(minDate); mn.setHours(0, 0, 0, 0);
    return lastDayOfPrevMonth < mn;
  };

  // True if the entire next month is after maxDate
  const isNextMonthBlocked = () => {
    if (!maxDate) return false;
    const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    firstDayOfNextMonth.setHours(0, 0, 0, 0);
    const mx = new Date(maxDate); mx.setHours(0, 0, 0, 0);
    return firstDayOfNextMonth > mx;
  };

  const handleDateSelect = (date) => {
    if (!date || isDateDisabled(date)) return;

    setSelectedDate(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
    setShowCalendar(false);
  };

  const handleMonthChange = (e) => {
    setCurrentMonth(parseInt(e.target.value));
  };

  const handleYearSelect = (year) => {
    setCurrentYear(year);
    setShowYearPicker(false);
    setShowMonthPicker(true);
  };

  const handleMonthSelect = (monthIndex) => {
    setCurrentMonth(monthIndex);
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };

  const previousYearRange = () => {
    setYearRangeStart(yearRangeStart - 9);
  };

  const nextYearRange = () => {
    const currentYearNow = new Date().getFullYear();
    if (yearRangeStart + 9 < currentYearNow) {
      setYearRangeStart(yearRangeStart + 9);
    }
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const isFutureDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const currentYearNow = new Date().getFullYear();
  const yearRange = Array.from({ length: 9 }, (_, i) => yearRangeStart + i).filter(y => y <= currentYearNow);

  const days = getDaysInMonth(currentMonth, currentYear);

  return (
    <div className={`heroui-datepicker ${isSignup ? '!m-0 heroui-datepicker--maroon' : ''}`} ref={calendarRef}>
      <div
        ref={inputRef}
        className={className || `date-field-group ${isSignup ? '!bg-transparent !border-b !border-rose-300/30 !rounded-none !p-0 py-2' : ''}`}
        data-focused={showCalendar}
        data-disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setShowCalendar(true);
            if (flow === 'currentMonth') {
              // Flow one: go directly to day picker with current month/year
              setShowYearPicker(false);
              setShowMonthPicker(false);
              setCurrentMonth(new Date().getMonth());
              setCurrentYear(new Date().getFullYear());
            } else {
              // Default flow: start with year picker
              setShowYearPicker(true);
              setShowMonthPicker(false);
            }
          }
        }}
        style={isSignup ? { paddingLeft: 0, paddingRight: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } : {}}
      >
        <div className="date-field-input" style={isSignup ? { paddingLeft: 0, paddingRight: 0 } : {}}>
          {selectedDate ? (
            <span className={`date-segment ${isSignup ? '!text-white' : ''}`}>{formatDate(selectedDate)}</span>
          ) : (
            <span className={`date-segment ${isSignup ? '!text-rose-200/50 pl-0' : ''}`} data-placeholder style={isSignup ? { textAlign: 'left', paddingLeft: 0 } : {}}>DD/MM/YYYY</span>
          )}
        </div>
        <button
          type="button"
          className="date-picker-trigger"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setShowCalendar(!showCalendar);
              if (!showCalendar) {
                if (flow === 'currentMonth') {
                  // Flow one: go directly to day picker with current month/year
                  setShowYearPicker(false);
                  setShowMonthPicker(false);
                  setCurrentMonth(new Date().getMonth());
                  setCurrentYear(new Date().getFullYear());
                } else {
                  // Default flow: start with year picker
                  setShowYearPicker(true);
                  setShowMonthPicker(false);
                }
              }
            }
          }}
          aria-label="Open calendar"
        >
          <Calendar size={20} className={isSignup ? '!text-rose-200/50' : 'date-picker-icon'} />
        </button>
      </div>

      {showCalendar && !disabled && (
        <div className={`date-picker-popover ${openUpward ? 'open-upward' : ''}`}>
          <div className="date-calendar">
          <div className="calendar-header">
              <button
                slot="previous"
                type="button"
                onClick={() => {
                  if (showYearPicker || showMonthPicker) return;
                  currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(currentYear - 1)) : setCurrentMonth(currentMonth - 1);
                }}
                aria-label="Previous month"
                style={{ visibility: (showYearPicker || showMonthPicker || isPrevMonthBlocked()) ? 'hidden' : 'visible' }}
              >
                <ChevronLeft size={16} />
              </button>

              <div
                className={`year-picker-trigger ${(flow === 'currentMonth' || minDate || maxDate) ? 'pointer-events-none' : ''}`}
                onClick={() => {
                  if (showYearPicker || showMonthPicker || flow === 'currentMonth' || minDate || maxDate) return;
                  setShowYearPicker(true);
                  setShowMonthPicker(false);
                }}
              >
                {monthNames[currentMonth]} {currentYear}
                {flow !== 'currentMonth' && !minDate && !maxDate && <ChevronDown size={14} />}
              </div>

              <button
                slot="next"
                type="button"
                onClick={() => {
                  if (showYearPicker || showMonthPicker) return;
                  currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(currentYear + 1)) : setCurrentMonth(currentMonth + 1);
                }}
                aria-label="Next month"
                style={{ visibility: (showYearPicker || showMonthPicker || isNextMonthBlocked()) ? 'hidden' : 'visible' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {showYearPicker ? (
              <div className="year-picker">
                <div className="year-picker-header">
                  <button type="button" onClick={previousYearRange} className="year-nav-btn">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="year-range-label">{yearRangeStart} - {yearRangeStart + 8}</span>
                  <button type="button" onClick={nextYearRange} className="year-nav-btn">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="year-grid">
                  {yearRange.map((year) => (
                    <button
                      key={year}
                      type="button"
                      className={`year-cell ${year === currentYear ? 'selected' : ''}`}
                      onClick={() => handleYearSelect(year)}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            ) : showMonthPicker ? (
              <div className="month-picker">
                <div className="month-picker-header">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowMonthPicker(false);
                      setShowYearPicker(true);
                    }} 
                    className="month-nav-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="month-year-label">{currentYear}</span>
                  <div style={{ width: '24px' }}></div>
                </div>
                <div className="month-grid">
                  {monthNames.map((month, index) => (
                    <button
                      key={month}
                      type="button"
                      className={`month-cell ${index === currentMonth ? 'selected' : ''}`}
                      onClick={() => handleMonthSelect(index)}
                    >
                      {month.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <table className="calendar-grid">
                <thead>
                  <tr>
                    {dayNames.map((day, index) => (
                      <th key={index}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
                    <tr key={weekIndex}>
                      {Array.from({ length: 7 }).map((__, dayIndex) => {
                        const date = days[weekIndex * 7 + dayIndex];
                        const isOutside = !date;
                        const isDisabled = isOutside || isDateDisabled(date);
                        return (
                          <td key={dayIndex}>
                            <button
                              type="button"
                              role="gridcell"
                              onClick={() => handleDateSelect(date)}
                              disabled={isDisabled}
                              data-selected={isSelected(date)}
                              data-today={isToday(date)}
                              data-disabled={isDisabled}
                              data-outside-month={isOutside}
                            >
                              {date ? date.getDate() : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default DatePicker;
