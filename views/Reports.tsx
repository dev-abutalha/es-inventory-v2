
import React, { useMemo, useState } from 'react';
import { Download, FileText, TrendingUp, Calendar, Mail, Save, CheckCircle } from 'lucide-react';
// Fixed: Removed missing startOfMonth and subMonths exports
import { format, endOfMonth, addMonths } from 'date-fns';
import { db } from '../db';
import { User, UserRole } from '../types';
import DateRangePicker from '../components/DateRangePicker';

const Reports = ({ user }: { user: User }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  
  // Fixed: Manual calculation for start of month
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // State for report settings
  const [reportSettings, setReportSettings] = useState(db.getReportSettings());
  const [isEditingRecipients, setIsEditingRecipients] = useState(false);
  const [tempRecipients, setTempRecipients] = useState(reportSettings.recipients);
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);

  const sales = db.getSales();
  const purchases = db.getPurchases();
  const expenses = db.getExpenses();
  const stores = db.getStores();

  const handleSaveSettings = () => {
    const updated = { recipients: tempRecipients };
    db.saveReportSettings(updated);
    setReportSettings(updated);
    setIsEditingRecipients(false);
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 3000);
  };

  const downloadGenericReport = (from: string, to: string, label: string) => {
    const filteredSales = sales.filter(s => s.date >= from && s.date <= to);
    const filteredPurchases = purchases.filter(p => p.date >= from && p.date <= to);
    const filteredExpenses = expenses.filter(e => e.date >= from && e.date <= to);

    const headers = ["Category", "Metric", "Value"];
    const rows = [
      ["Summary", "Period Start", from],
      ["Summary", "Period End", to],
      ["Financial", "Total Sales", filteredSales.reduce((a, s) => a + s.amount, 0).toFixed(2)],
      ["Financial", "Total Purchases", filteredPurchases.reduce((a, p) => a + p.totalCost, 0).toFixed(2)],
      ["Financial", "Total Expenses", filteredExpenses.reduce((a, e) => a + e.amount, 0).toFixed(2)],
      ["Financial", "Net Profit", (filteredSales.reduce((a, s) => a + s.amount, 0) - filteredPurchases.reduce((a, p) => a + p.totalCost, 0) - filteredExpenses.reduce((a, e) => a + e.amount, 0)).toFixed(2)],
    ];

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `full_report_${label.toLowerCase().replace(' ', '_')}_${from}_to_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const metrics = useMemo(() => {
    const filteredSales = sales.filter(s => s.date >= dateFrom && s.date <= dateTo);
    const filteredPurchases = purchases.filter(p => p.date >= dateFrom && p.date <= dateTo);
    const filteredExpenses = expenses.filter(e => e.date >= dateFrom && e.date <= dateTo);

    const totalSales = filteredSales.reduce((acc, s) => acc + s.amount, 0);
    
    const storePerformance = stores.filter(s => s.id !== 'central').map(store => {
      const sRev = filteredSales.filter(s => s.storeId === store.id).reduce((acc, s) => acc + s.amount, 0);
      const sPur = filteredPurchases.filter(p => p.storeId === store.id).reduce((acc, p) => acc + p.totalCost, 0);
      const sExp = filteredExpenses.filter(e => e.storeId === store.id).reduce((acc, e) => acc + e.amount, 0);
      return {
        name: store.name,
        revenue: sRev,
        profit: sRev - sPur - sExp
      };
    });

    return { totalSales, storePerformance };
  }, [sales, purchases, expenses, stores, dateFrom, dateTo]);

  if (!isAdmin) return <div className="p-10 text-center font-bold text-slate-400">Unauthorized Access</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-500 mt-1 font-medium">Consolidated intelligence for the Barcelona hub.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Custom Date Filter Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-black text-slate-900">Custom Range Analytics</h3>
              <button 
                onClick={() => downloadGenericReport(dateFrom, dateTo, 'Custom Range')}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
              >
                <Download size={18} />
                Download Filtered Report
              </button>
            </div>
            
            <DateRangePicker from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
              {metrics.storePerformance.map(sp => (
                <div key={sp.name} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-primary-200 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{sp.name}</span>
                    <span className={`text-sm font-black ${sp.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {sp.profit >= 0 ? '+' : ''}€{sp.profit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-white rounded-full overflow-hidden p-0.5 border border-slate-100">
                    <div 
                      className={`h-full rounded-full ${sp.profit >= 0 ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-rose-500'}`} 
                      style={{ width: `${Math.min(100, (Math.max(0, sp.profit) / (metrics.totalSales || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Exports Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6">Quick Exports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  // Fixed: Replaced startOfMonth with manual calc
                  const f = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
                  const t = format(endOfMonth(new Date()), 'yyyy-MM-dd');
                  downloadGenericReport(f, t, 'This Month');
                }}
                className="flex items-center justify-between p-6 bg-emerald-50 text-emerald-900 rounded-3xl border border-emerald-100 hover:bg-emerald-100 transition-all group"
              >
                <div className="text-left">
                  <p className="text-lg font-black tracking-tight">This Month</p>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Full financial summary</p>
                </div>
                <div className="p-3 bg-white rounded-2xl group-hover:scale-110 transition-transform">
                  <Download size={20} className="text-emerald-600" />
                </div>
              </button>

              <button 
                onClick={() => {
                  // Fixed: Replaced subMonths with addMonths(..., -1) and manual startOfMonth
                  const lastMonth = addMonths(new Date(), -1);
                  const f = format(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1), 'yyyy-MM-dd');
                  const t = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
                  downloadGenericReport(f, t, 'Last Month');
                }}
                className="flex items-center justify-between p-6 bg-primary-50 text-primary-900 rounded-3xl border border-primary-100 hover:bg-primary-100 transition-all group"
              >
                <div className="text-left">
                  <p className="text-lg font-black tracking-tight">Last Month</p>
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-widest">Historical archive</p>
                </div>
                <div className="p-3 bg-white rounded-2xl group-hover:scale-110 transition-transform">
                  <Download size={20} className="text-primary-600" />
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Automated Reporting Settings Card */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl -mr-10 -mt-10 rounded-full"></div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary-500/20 rounded-2xl">
                <Mail size={24} className="text-primary-400" />
              </div>
              <h3 className="text-xl font-black">Daily Report Automation</h3>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-black text-primary-400 uppercase tracking-widest">Email Recipients</p>
                  {!isEditingRecipients ? (
                    <button 
                      onClick={() => setIsEditingRecipients(true)}
                      className="text-[10px] font-black text-white/50 hover:text-white uppercase"
                    >
                      Edit
                    </button>
                  ) : (
                    <button 
                      onClick={handleSaveSettings}
                      className="flex items-center gap-1 text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase"
                    >
                      <Save size={12} /> Save
                    </button>
                  )}
                </div>
                
                {isEditingRecipients ? (
                  <textarea 
                    className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm text-white font-medium focus:ring-2 focus:ring-primary-500 transition-all h-24"
                    value={tempRecipients}
                    onChange={(e) => setTempRecipients(e.target.value)}
                    placeholder="Enter emails separated by commas..."
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-300 break-all leading-relaxed">
                    {reportSettings.recipients || 'No recipients set.'}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm py-4 border-b border-white/5">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Frequency</span>
                  <span className="font-black">Daily at 23:00</span>
                </div>
                <div className="flex justify-between items-center text-sm py-4 border-b border-white/5">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Format</span>
                  <span className="font-black text-primary-400">PDF + CSV Attachment</span>
                </div>
              </div>

              {showSaveFeedback && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black bg-emerald-400/10 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                  <CheckCircle size={14} /> Settings Saved Successfully
                </div>
              )}

              <button className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary-900/40 hover:bg-primary-400 transition-all active:scale-95">
                Trigger Manual Dispatch
              </button>
              
              <p className="text-[10px] text-slate-500 font-bold text-center uppercase tracking-tighter">
                Server Time: {new Date().toLocaleTimeString()} (Barcelona)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
