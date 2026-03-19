import { useState, useRef, useEffect } from 'react';
import { HiChevronLeft, HiChevronRight, HiCalendar } from 'react-icons/hi';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function formatDateISO(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${d} ${MONTHS[date.getMonth()].slice(0, 3)} ${y}`;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(day, start, end) {
  if (!start || !end) return false;
  const t = day.getTime();
  const s = Math.min(start.getTime(), end.getTime());
  const e = Math.max(start.getTime(), end.getTime());
  return t > s && t < e;
}

/**
 * CalendarPicker — unified calendar component
 *
 * Props:
 *   mode: 'single' | 'range'  (default: 'range')
 *
 *   Single mode:
 *     value: string (YYYY-MM-DD)
 *     onChange: (dateStr: string) => void
 *
 *   Range mode:
 *     dateFrom: string (YYYY-MM-DD)
 *     dateTo: string (YYYY-MM-DD)
 *     onChange: (from: string, to: string) => void
 *
 *   Optional:
 *     placeholder: string
 *     className: string (wrapper)
 */
export default function CalendarPicker({
  mode = 'range',
  // Single mode
  value,
  // Range mode
  dateFrom,
  dateTo,
  // Callback
  onChange,
  placeholder = 'Pilih tanggal',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Current viewed month
  const [viewMonth, setViewMonth] = useState(() => {
    const initDate = mode === 'single'
      ? (value ? new Date(value) : new Date())
      : (dateFrom ? new Date(dateFrom) : new Date());
    return { year: initDate.getFullYear(), month: initDate.getMonth() };
  });

  // Range selection state
  const [startDate, setStartDate] = useState(() => dateFrom ? new Date(dateFrom) : null);
  const [endDate, setEndDate] = useState(() => dateTo ? new Date(dateTo) : null);
  const [hoverDate, setHoverDate] = useState(null);
  const [picking, setPicking] = useState('start');

  // Sync external props
  useEffect(() => {
    if (mode === 'range') {
      setStartDate(dateFrom ? new Date(dateFrom) : null);
      setEndDate(dateTo ? new Date(dateTo) : null);
    }
  }, [dateFrom, dateTo, mode]);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => {
    setViewMonth((prev) => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 });
  };

  const nextMonth = () => {
    setViewMonth((prev) => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 });
  };

  const handleSelectSingle = (date) => {
    onChange(formatDateISO(date));
    setOpen(false);
  };

  const handleSelectRange = (date) => {
    if (picking === 'start') {
      setStartDate(date);
      setEndDate(null);
      setPicking('end');
    } else {
      let s = startDate;
      let e = date;
      if (date < startDate) { s = date; e = startDate; }
      setEndDate(e);
      setStartDate(s);
      setPicking('start');
      setTimeout(() => {
        onChange(formatDateISO(s), formatDateISO(e));
        setOpen(false);
      }, 150);
    }
  };

  const handleSelect = (date) => {
    if (mode === 'single') handleSelectSingle(date);
    else handleSelectRange(date);
  };

  // Build calendar grid
  const { year, month } = viewMonth;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const weeks = [];
  let currentWeek = new Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Display text
  let displayText = '';
  if (mode === 'single') {
    displayText = value ? formatDateDisplay(value) : '';
  } else {
    if (dateFrom && dateTo) {
      displayText = `${formatDateDisplay(dateFrom)}  —  ${formatDateDisplay(dateTo)}`;
    } else if (dateFrom) {
      displayText = `${formatDateDisplay(dateFrom)}  —  ...`;
    }
  }

  // Selected date for single mode
  const selectedSingle = mode === 'single' && value ? new Date(value) : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Input trigger */}
      <div
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
          open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <HiCalendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={`text-sm ${displayText ? 'text-gray-900' : 'text-gray-400'}`}>
          {displayText || placeholder}
        </span>
      </div>

      {/* Calendar Popup */}
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden" style={{ minWidth: 300 }}>
          {/* Blue header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-blue-400/50 rounded-lg transition-colors">
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-blue-400/50 rounded-lg transition-colors">
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-8 bg-blue-50 border-b border-blue-100">
            <div className="py-2 text-center text-xs font-medium text-blue-300" />
            {DAYS_SHORT.map((day) => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-blue-600">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar body */}
          <div className="p-1">
            {weeks.map((week, wi) => {
              const firstDayInWeek = week.find((d) => d !== null);
              const weekNum = firstDayInWeek ? getWeekNumber(new Date(year, month, firstDayInWeek)) : '';

              return (
                <div key={wi} className="grid grid-cols-8">
                  {/* Week number */}
                  <div className="py-1 text-center text-xs text-blue-300 font-medium flex items-center justify-center">
                    {weekNum}
                  </div>
                  {/* Day cells */}
                  {week.map((day, di) => {
                    if (day === null) {
                      return <div key={`e-${di}`} className="py-1" />;
                    }

                    const date = new Date(year, month, day);
                    const isToday = isSameDay(date, today);

                    // Single mode
                    let isSelected = false;
                    if (mode === 'single') {
                      isSelected = selectedSingle && isSameDay(date, selectedSingle);
                    }

                    // Range mode
                    let isStart = false;
                    let isEnd = false;
                    let inRange = false;
                    if (mode === 'range') {
                      isStart = isSameDay(date, startDate);
                      isEnd = isSameDay(date, endDate);
                      isSelected = isStart || isEnd;
                      const effectiveEnd = endDate || hoverDate;
                      inRange = startDate && effectiveEnd ? isInRange(date, startDate, effectiveEnd) : false;
                    }

                    let cellBg = '';
                    let circle = '';
                    let textCls = 'text-gray-700';

                    if (isSelected) {
                      circle = 'bg-blue-500 text-white';
                      textCls = '';
                    } else if (inRange) {
                      cellBg = 'bg-blue-50';
                      textCls = 'text-blue-700';
                    } else if (isToday) {
                      circle = 'border-2 border-blue-400 text-blue-600';
                      textCls = '';
                    }

                    return (
                      <div
                        key={day}
                        className={`py-1 flex items-center justify-center cursor-pointer hover:bg-blue-50 rounded transition-colors ${cellBg}`}
                        onClick={() => handleSelect(date)}
                        onMouseEnter={() => mode === 'range' && picking === 'end' && setHoverDate(date)}
                      >
                        <span className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors ${circle} ${textCls}`}>
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer hint for range mode */}
          {mode === 'range' && (
            <div className="px-3 py-2 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-400">
                {picking === 'end' ? 'Pilih tanggal akhir' : 'Pilih tanggal mulai'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
