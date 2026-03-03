import { useState, useRef, useEffect, useCallback } from 'react';
import { HiChevronLeft, HiChevronRight, HiCalendar } from 'react-icons/hi';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper: get days in month
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Helper: get first day of month (0=Sun, 1=Mon, ...)
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

// Helper: format YYYY-MM-DD
const toDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: parse YYYY-MM-DD to Date
const parseDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Helper: format display date
const formatDisplay = (dateStr) => {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};

// Helper: is same day
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

// Helper: is between dates
const isBetween = (date, start, end) => {
  if (!start || !end) return false;
  const t = date.getTime();
  return t > start.getTime() && t < end.getTime();
};

function CalendarMonth({ year, month, startDate, endDate, hoverDate, onDateClick, onDateHover }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const hover = hoverDate ? parseDate(hoverDate) : null;

  // Determine effective end for highlight range
  const effectiveEnd = end || (start && hover && hover.getTime() >= start.getTime() ? hover : null);

  const cells = [];

  // Empty cells for days before first day of month
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-9" />);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = toDateString(date);
    const isToday = isSameDay(date, today);
    const isStart = start && isSameDay(date, start);
    const isEnd = end && isSameDay(date, end);
    const isSelected = isStart || isEnd;
    const isInRange = start && effectiveEnd && isBetween(date, start, effectiveEnd);
    const isRangeStart = isStart && effectiveEnd;
    const isRangeEnd = (isEnd || (hover && !end && isSameDay(date, hover) && start && hover.getTime() >= start.getTime()));

    let cellClass = 'h-9 w-full flex items-center justify-center text-sm cursor-pointer transition-colors relative ';

    if (isSelected) {
      cellClass += 'bg-blue-500 text-white font-semibold rounded-full z-10 ';
    } else if (isInRange) {
      cellClass += 'bg-blue-100 text-blue-800 ';
    } else if (isToday) {
      cellClass += 'border border-blue-400 rounded-full text-blue-600 font-medium ';
    } else {
      cellClass += 'text-gray-700 hover:bg-blue-50 rounded-full ';
    }

    // Range background spans
    let rangeBg = null;
    if (isInRange) {
      rangeBg = 'bg-blue-100';
    } else if (isRangeStart && effectiveEnd && !isSameDay(start, effectiveEnd)) {
      rangeBg = 'bg-blue-100 rounded-l-none';
    } else if (isRangeEnd && start && !isSameDay(start, effectiveEnd)) {
      rangeBg = 'bg-blue-100 rounded-r-none';
    }

    cells.push(
      <div
        key={day}
        className={`relative flex items-center justify-center ${isInRange ? 'bg-blue-100' : ''} ${isRangeStart && effectiveEnd && !isSameDay(start, effectiveEnd) ? 'bg-gradient-to-l from-blue-100 to-transparent' : ''} ${isRangeEnd && start && !isSameDay(start, effectiveEnd) ? 'bg-gradient-to-r from-blue-100 to-transparent' : ''}`}
        onClick={() => onDateClick(dateStr)}
        onMouseEnter={() => onDateHover(dateStr)}
      >
        <span className={`h-9 w-9 flex items-center justify-center text-sm cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-500 text-white font-semibold rounded-full'
            : isToday
              ? 'border border-blue-400 rounded-full text-blue-600 font-medium'
              : 'text-gray-700 hover:bg-blue-50 rounded-full'
        }`}>
          {day}
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[260px]">
      {/* Month Header */}
      <div className="bg-blue-500 text-white text-center py-2.5 font-semibold text-sm rounded-t-lg">
        {MONTH_NAMES[month]} {year}
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 bg-blue-50 border-b border-blue-100">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-blue-700 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 bg-white border border-t-0 border-gray-200 rounded-b-lg">
        {cells}
      </div>
    </div>
  );
}

export default function DualCalendar({ startDate, endDate, onApply, onReset, isCustomFilter }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [hoverDate, setHoverDate] = useState(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = parseDate(startDate) || new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const popupRef = useRef(null);

  // Right month = left month + 1
  const rightMonth = leftMonth.month === 11
    ? { year: leftMonth.year + 1, month: 0 }
    : { year: leftMonth.year, month: leftMonth.month + 1 };

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Sync tempStart/tempEnd when props change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const handlePrevMonth = () => {
    setLeftMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setLeftMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDateClick = useCallback((dateStr) => {
    if (!selectingEnd || !tempStart) {
      // First click: set start
      setTempStart(dateStr);
      setTempEnd(null);
      setSelectingEnd(true);
    } else {
      // Second click: set end
      const start = parseDate(tempStart);
      const clicked = parseDate(dateStr);

      if (clicked.getTime() < start.getTime()) {
        // Clicked before start: swap
        setTempStart(dateStr);
        setTempEnd(tempStart);
      } else {
        setTempEnd(dateStr);
      }
      setSelectingEnd(false);
    }
  }, [selectingEnd, tempStart]);

  const handleDateHover = useCallback((dateStr) => {
    if (selectingEnd) {
      setHoverDate(dateStr);
    }
  }, [selectingEnd]);

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onApply(tempStart, tempEnd);
      setIsOpen(false);
    }
  };

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  // Display text
  const displayText = startDate && endDate
    ? `${formatDisplay(startDate)}  —  ${formatDisplay(endDate)}`
    : 'Pilih tanggal';

  return (
    <div className="relative" ref={popupRef}>
      {/* Input Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 cursor-pointer transition-colors ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <HiCalendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <span className={`text-sm ${startDate && endDate ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {displayText}
        </span>
        {isCustomFilter && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium ml-auto">
            Filter aktif
          </span>
        )}
      </div>

      {/* Calendar Popup */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-auto">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {selectingEnd ? 'Pilih tanggal akhir' : 'Pilih tanggal mulai'}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Dual Calendars */}
          <div className="flex gap-4">
            <CalendarMonth
              year={leftMonth.year}
              month={leftMonth.month}
              startDate={tempStart}
              endDate={tempEnd}
              hoverDate={hoverDate}
              onDateClick={handleDateClick}
              onDateHover={handleDateHover}
            />
            <CalendarMonth
              year={rightMonth.year}
              month={rightMonth.month}
              startDate={tempStart}
              endDate={tempEnd}
              hoverDate={hoverDate}
              onDateClick={handleDateClick}
              onDateHover={handleDateHover}
            />
          </div>

          {/* Selected Range Display */}
          {tempStart && (
            <div className="mt-3 text-center text-xs text-gray-500">
              {tempStart && tempEnd
                ? `${formatDisplay(tempStart)} — ${formatDisplay(tempEnd)}`
                : `${formatDisplay(tempStart)} — ...`
              }
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              disabled={!tempStart || !tempEnd}
              className={`text-sm px-5 py-1.5 rounded-lg font-medium transition-colors ${
                tempStart && tempEnd
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
