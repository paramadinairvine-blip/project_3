import { useState, useRef, useEffect } from 'react';
import { HiChevronLeft, HiChevronRight, HiCalendar } from 'react-icons/hi';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date) {
  if (!date) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(day, start, end) {
  if (!start || !end) return false;
  const t = day.getTime();
  return t > start.getTime() && t < end.getTime();
}

function CalendarMonth({ year, month, startDate, endDate, hoverDate, onSelect, onHover }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isStart = isSameDay(date, startDate);
    const isEnd = isSameDay(date, endDate);
    const isSelected = isStart || isEnd;

    const effectiveEnd = endDate || hoverDate;
    const inRange = startDate && effectiveEnd
      ? isInRange(date, startDate, effectiveEnd) || isInRange(date, effectiveEnd, startDate)
      : false;

    const isToday = isSameDay(date, today);

    let cls = 'w-8 h-8 text-sm rounded-full flex items-center justify-center cursor-pointer transition-colors ';
    if (isSelected) {
      cls += 'bg-blue-600 text-white font-semibold ';
    } else if (inRange) {
      cls += 'bg-blue-100 text-blue-800 ';
    } else if (isToday) {
      cls += 'border border-blue-400 text-blue-600 font-medium hover:bg-blue-50 ';
    } else {
      cls += 'text-gray-700 hover:bg-gray-100 ';
    }

    cells.push(
      <div
        key={d}
        className={cls}
        onClick={() => onSelect(date)}
        onMouseEnter={() => onHover(date)}
      >
        {d}
      </div>
    );
  }

  return (
    <div className="w-64">
      <div className="text-center font-semibold text-gray-800 mb-3 text-sm">
        {MONTHS[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((day) => (
          <div key={day} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
    </div>
  );
}

export default function DateRangePicker({ dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false);
  const [leftMonth, setLeftMonth] = useState(() => {
    if (dateFrom) {
      const d = new Date(dateFrom);
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [startDate, setStartDate] = useState(() => dateFrom ? new Date(dateFrom) : null);
  const [endDate, setEndDate] = useState(() => dateTo ? new Date(dateTo) : null);
  const [hoverDate, setHoverDate] = useState(null);
  const [picking, setPicking] = useState('start'); // 'start' or 'end'
  const ref = useRef(null);

  const rightMonth = {
    year: leftMonth.month === 11 ? leftMonth.year + 1 : leftMonth.year,
    month: (leftMonth.month + 1) % 12,
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync external props
  useEffect(() => {
    setStartDate(dateFrom ? new Date(dateFrom) : null);
    setEndDate(dateTo ? new Date(dateTo) : null);
  }, [dateFrom, dateTo]);

  const prevMonth = () => {
    setLeftMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setLeftMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const handleSelect = (date) => {
    if (picking === 'start') {
      setStartDate(date);
      setEndDate(null);
      setPicking('end');
    } else {
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      setPicking('start');
    }
  };

  const handleApply = () => {
    onChange(formatDate(startDate), formatDate(endDate));
    setOpen(false);
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setPicking('start');
    onChange('', '');
    setOpen(false);
  };

  const displayText = startDate && endDate
    ? `${formatDisplay(startDate)}  —  ${formatDisplay(endDate)}`
    : startDate
      ? `${formatDisplay(startDate)}  —  ...`
      : 'Pilih rentang tanggal';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-w-[260px]"
      >
        <HiCalendar className="w-4 h-4 text-gray-400" />
        <span className={startDate ? 'text-gray-800' : 'text-gray-400'}>{displayText}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-5 animate-in fade-in">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Dual Calendars */}
          <div className="flex gap-8">
            <CalendarMonth
              year={leftMonth.year}
              month={leftMonth.month}
              startDate={startDate}
              endDate={endDate}
              hoverDate={picking === 'end' ? hoverDate : null}
              onSelect={handleSelect}
              onHover={setHoverDate}
            />
            <CalendarMonth
              year={rightMonth.year}
              month={rightMonth.month}
              startDate={startDate}
              endDate={endDate}
              hoverDate={picking === 'end' ? hoverDate : null}
              onSelect={handleSelect}
              onHover={setHoverDate}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!startDate || !endDate}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
