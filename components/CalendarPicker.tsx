import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  className?: string;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({
  value,
  onChange,
  label,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value) : new Date(),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderHeader = () => (
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-100">
      <button
        type="button"
        onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      {/* Mobile: short month */}
      <span className="text-sm font-black text-slate-900 truncate">
        <span className="sm:hidden">{format(currentMonth, "MMM yyyy")}</span>
        <span className="hidden sm:inline">
          {format(currentMonth, "MMMM yyyy")}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="grid grid-cols-7 mb-1">
        {days.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] sm:text-[12px] font-black text-slate-400 uppercase py-2"
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const monthEnd = endOfMonth(monthStart);

    const startDate = new Date(monthStart);
    startDate.setDate(monthStart.getDate() - monthStart.getDay());

    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let daysArr = [];
    let day = startDate;

    const selectedDate = value ? new Date(value) : null;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        daysArr.push(
          <div
            key={day.toString()}
            className={`relative p-1 sm:p-2 text-center text-[10px] sm:text-sm cursor-pointer transition-all rounded-xl m-0.5
              ${!isCurrentMonth ? "text-slate-300" : isSelected ? "bg-primary text-white font-black shadow-lg shadow-primary/20 scale-105" : "text-slate-700 hover:bg-slate-100 font-medium"}
            `}
            onClick={() => {
              onChange(format(cloneDay, "yyyy-MM-dd"));
              setIsOpen(false);
            }}
          >
            {format(day, "d")}
          </div>,
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {daysArr}
        </div>,
      );
      daysArr = [];
    }

    return <div className="p-1 sm:p-2">{rows}</div>;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] sm:text-[12px] text-slate-400 font-black uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 sm:px-5 py-2 sm:py-3 flex items-center justify-between text-[12px] sm:text-sm font-bold text-slate-900 hover:bg-white hover:border-primary-400 hover:shadow-md transition-all outline-none focus:ring-4 focus:ring-primary-500/10"
      >
        <span className="truncate">
          {value ? (
            <>
              <span className="sm:hidden">
                {format(new Date(value), "MMM d, yyyy")}
              </span>
              <span className="hidden sm:inline">
                {format(new Date(value), "PPP")}
              </span>
            </>
          ) : (
            "Select Date"
          )}
        </span>
        <CalendarIcon size={16} className="text-slate-400 flex-shrink-0 ml-2" />
      </button>

      {isOpen && (
        <>
          {/* Desktop: left-aligned, fixed width */}
          <div className="hidden md:block absolute top-full left-0 mt-2 w-[300px] bg-white rounded-[2rem] border border-slate-100 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  onChange(format(new Date(), "yyyy-MM-dd"));
                  setIsOpen(false);
                }}
                className="text-[10px] font-black text-primary-600 uppercase hover:underline"
              >
                Today: {format(new Date(), "MMM d, yyyy")}
              </button>
            </div>
          </div>

          {/* Mobile: centered, responsive width */}
          <div className="block md:hidden absolute top-full left-1/2 transform -translate-x-1/2 mt-2 min-w-[200px] max-w-[90vw] bg-white rounded-[2rem] border border-slate-100 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  onChange(format(new Date(), "yyyy-MM-dd"));
                  setIsOpen(false);
                }}
                className="text-[10px] font-black text-primary-600 uppercase hover:underline"
              >
                Today: {format(new Date(), "MMM d, yyyy")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarPicker;
