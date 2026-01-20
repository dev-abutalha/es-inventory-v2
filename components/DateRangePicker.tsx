
import React from 'react';
// Fixed: Removed missing startOfMonth and subMonths
import { format, endOfMonth, addMonths } from 'date-fns';
import CalendarPicker from './CalendarPicker';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ from, to, onChange }) => {
  // Fixed: Replaced startOfMonth and subMonths with manual logic and addMonths
  const presets = [
    { label: 'This Month', get: () => ({ f: new Date(new Date().getFullYear(), new Date().getMonth(), 1), t: endOfMonth(new Date()) }) },
    { label: 'Last Month', get: () => {
        const d = addMonths(new Date(), -1);
        return { f: new Date(d.getFullYear(), d.getMonth(), 1), t: endOfMonth(d) };
    } },
    { label: 'Last 3 Months', get: () => {
        const d = addMonths(new Date(), -2);
        return { f: new Date(d.getFullYear(), d.getMonth(), 1), t: endOfMonth(new Date()) };
    } },
  ];

  const handlePreset = (preset: typeof presets[0]) => {
    const { f, t } = preset.get();
    onChange(format(f, 'yyyy-MM-dd'), format(t, 'yyyy-MM-dd'));
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm w-fit">
      <div className="flex items-center gap-1 px-2 border-r border-slate-100 hidden md:flex">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p)}
            className="px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all uppercase tracking-widest"
          >
            {p.label}
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-3 px-1">
        <CalendarPicker 
          value={from} 
          onChange={(v) => onChange(v, to)} 
          className="w-[180px]"
        />
        <span className="text-slate-300 font-black">→</span>
        <CalendarPicker 
          value={to} 
          onChange={(v) => onChange(from, v)} 
          className="w-[180px]"
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
