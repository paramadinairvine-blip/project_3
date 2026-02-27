import { useState, useRef, useEffect } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

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

function formatDateDisplay(date) {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
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

function CalendarMonth({ year, month, startDate, endDate, hoverDate, onSelect, onHover, onPrev, onNext, showPrev, showNext }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  // Build weeks array for week numbers
  const weeks = [];
  let currentWeek = new Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return (
    <div className="flex-1 min-w-[280px]">
      {/* Blue header with month/year and navigation */}
      <div className="bg-blue-600 text-white rounded-t-lg px-3 py-2.5 flex items-center justify-between">
        {showPrev ? (
          <button type="button" onClick={onPrev} className="p-0.5 hover:bg-blue-500 rounded transition-colors">
            <HiChevronLeft className="w-5 h-5" />
          </button>
        ) : <div className="w-6" />}
        <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
        {showNext ? (
          <button type="button" onClick={onNext} className="p-0.5 hover:bg-blue-500 rounded transition-colors">
            <HiChevronRight className="w-5 h-5" />
          </button>
        ) : <div className="w-6" />}
      </div>

      {/* Day headers */}
      <div className="border border-t-0 border-gray-200">
        <div className="grid grid-cols-8 bg-blue-50">
          <div className="py-1.5 text-center text-xs font-medium text-blue-400" />
          {DAYS_SHORT.map((day) => (
            <div key={day} className="py-1.5 text-center text-xs font-semibold text-blue-600">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => {
          // Get week number from first valid day in this week
          const firstDayInWeek = week.find((d) => d !== null);
          const weekNum = firstDayInWeek ? getWeekNumber(new Date(year, month, firstDayInWeek)) : '';

          return (
            <div key={wi} className="grid grid-cols-8 border-t border-gray-100">
              {/* Week number */}
              <div className="py-1 text-center text-xs text-blue-400 font-medium flex items-center justify-center">
                {weekNum}
              </div>
              {/* Day cells */}
              {week.map((day, di) => {
                if (day === null) {
                  return <div key={`e-${di}`} className="py-1" />;
                }

                const date = new Date(year, month, day);
                const isStart = isSameDay(date, startDate);
                const isEnd = isSameDay(date, endDate);
                const isSelected = isStart || isEnd;
                const effectiveEnd = endDate || hoverDate;
                const inRange = startDate && effectiveEnd ? isInRange(date, startDate, effectiveEnd) : false;
                const isToday = isSameDay(date, today);

                let cellBg = '';
                let textCls = 'text-gray-700';
                let circle = '';

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
                    className={`py-1 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors ${cellBg}`}
                    onClick={() => onSelect(date)}
                    onMouseEnter={() => onHover(date)}
                  >
                    <span className={`w-7 h-7 flex items-center justify-center text-sm rounded-full ${circle} ${textCls}`}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
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
  const [picking, setPicking] = useState('start');
  const ref = useRef(null);

  const rightMonth = {
    year: leftMonth.month === 11 ? leftMonth.year + 1 : leftMonth.year,
    month: (leftMonth.month + 1) % 12,
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setStartDate(dateFrom ? new Date(dateFrom) : null);
    setEndDate(dateTo ? new Date(dateTo) : null);
  }, [dateFrom, dateTo]);

  const prevMonth = () => {
    setLeftMonth((prev) => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 });
  };

  const nextMonth = () => {
    setLeftMonth((prev) => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 });
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
      // Auto-apply when both dates selected
      setTimeout(() => {
        const s = date < startDate ? date : startDate;
        const e = date < startDate ? startDate : date;
        onChange(formatDateISO(s), formatDateISO(e));
        setOpen(false);
      }, 150);
    }
  };

  const displayText = startDate && endDate
    ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
    : startDate
      ? `${formatDateDisplay(startDate)} - ...`
      : 'Pilih tanggal';

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        readOnly
        value={startDate ? displayText : ''}
        placeholder="Pilih tanggal"
        onClick={() => setOpen(!open)}
        className="w-52 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />

      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
          <div className="flex gap-4">
            <CalendarMonth
              year={leftMonth.year}
              month={leftMonth.month}
              startDate={startDate}
              endDate={endDate}
              hoverDate={picking === 'end' ? hoverDate : null}
              onSelect={handleSelect}
              onHover={setHoverDate}
              onPrev={prevMonth}
              showPrev
              showNext={false}
            />
            <CalendarMonth
              year={rightMonth.year}
              month={rightMonth.month}
              startDate={startDate}
              endDate={endDate}
              hoverDate={picking === 'end' ? hoverDate : null}
              onSelect={handleSelect}
              onHover={setHoverDate}
              onNext={nextMonth}
              showPrev={false}
              showNext
            />
          </div>
        </div>
      )}
    </div>
  );
}
