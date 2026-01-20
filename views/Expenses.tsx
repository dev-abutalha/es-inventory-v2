
import React, { useState, useMemo } from 'react';
import { Plus, X, Download, Edit2, Trash2 } from 'lucide-react';
// Fixed: Removed startOfMonth as it's missing from the environment's date-fns
import { format, endOfMonth } from 'date-fns';
import { db } from '../db';
import { User, UserRole, Expense } from '../types';
import DateRangePicker from '../components/DateRangePicker';
import CalendarPicker from '../components/CalendarPicker';

const CATEGORIES = ['Rent', 'Utilities', 'Staff', 'Transport', 'Misc'];

const Expenses = ({ user }: { user: User }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const stores = db.getStores();
  const [expenses, setExpenses] = useState(db.getExpenses());

  // Fixed: Replaced startOfMonth with manual first-day calculation
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const initialForm = {
    storeId: user.assignedStoreId || 'central',
    category: 'Misc',
    description: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd')
  };

  const [newExpense, setNewExpense] = useState<Partial<Expense>>(initialForm);

  const filteredExpenses = useMemo(() => {
    const base = user.role === UserRole.ADMIN 
      ? expenses 
      : expenses.filter(e => e.storeId === user.assignedStoreId);

    return base.filter(e => e.date >= dateFrom && e.date <= dateTo)
               .sort((a,b) => b.date.localeCompare(a.date));
  }, [expenses, user, dateFrom, dateTo]);

  const totalExpenseAmount = useMemo(() => filteredExpenses.reduce((a, s) => a + s.amount, 0), [filteredExpenses]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewExpense(initialForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (e: Expense) => {
    setEditingId(e.id);
    setNewExpense({
      storeId: e.storeId,
      category: e.category,
      description: e.description,
      amount: e.amount,
      date: e.date
    });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this expense entry?')) {
      db.deleteExpense(id);
      setExpenses(db.getExpenses());
    }
  };

  const handleAddExpense = () => {
    if (newExpense.amount && newExpense.description) {
      const exp: Expense = {
        id: editingId || `exp_${Date.now()}`,
        ...(newExpense as Expense)
      };
      
      if (editingId) {
        db.updateExpense(exp);
      } else {
        db.addExpense(exp);
      }
      
      setExpenses(db.getExpenses());
      setModalOpen(false);
      setNewExpense(initialForm);
      setEditingId(null);
    }
  };

  const downloadCSV = () => {
    const headers = ["Date", "Category", "Store", "Description", "Amount (€)"];
    const rows = filteredExpenses.map(e => [
      e.date,
      e.category,
      stores.find(s => s.id === e.storeId)?.name || e.storeId,
      e.description,
      e.amount.toFixed(2)
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `expenses_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Expenses</h1>
          <p className="text-slate-500 font-medium">Operational cost and overhead tracking.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={downloadCSV}
            className="bg-white text-slate-600 border border-slate-200 px-5 py-2.5 rounded-2xl flex items-center gap-2 font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={20} /> Download
          </button>
          <button 
            onClick={handleOpenAdd}
            className="bg-rose-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all"
          >
            <Plus size={20} /> Record Expense
          </button>
        </div>
      </div>

      <DateRangePicker from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Store</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-sm text-slate-500 font-bold">{exp.date}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      exp.category === 'Staff' ? 'bg-blue-50 text-blue-600' :
                      exp.category === 'Rent' ? 'bg-amber-50 text-amber-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-700">{stores.find(s => s.id === exp.storeId)?.name}</td>
                  <td className="px-8 py-5 text-sm text-slate-900 font-medium">{exp.description}</td>
                  <td className="px-8 py-5 text-right font-black text-rose-600">€{exp.amount.toFixed(2)}</td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleOpenEdit(exp)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold italic">No expenses found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-slate-900 text-white z-40 border-t border-slate-800 shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.3)] backdrop-blur-md bg-opacity-95 animate-in slide-in-from-bottom-full duration-500">
        <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Operational Burden</span>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-rose-400/20 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  {filteredExpenses.length} Claims
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Operating Costs</p>
            <p className="text-3xl font-black tracking-tight text-white">
              €{totalExpenseAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => { setModalOpen(false); setEditingId(null); }}><X className="text-slate-400" size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Location</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold"
                  disabled={user.role !== UserRole.ADMIN}
                  value={newExpense.storeId}
                  onChange={e => setNewExpense({...newExpense, storeId: e.target.value})}
                >
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold"
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <CalendarPicker 
                    label="Date" 
                    value={newExpense.date || ''} 
                    onChange={v => setNewExpense({...newExpense, date: v})} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <input 
                  placeholder="e.g. Utility bill"
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold"
                  value={newExpense.description}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount (€)</label>
                <input 
                  type="number"
                  className="w-full bg-rose-50 text-rose-900 border-none rounded-2xl px-5 py-4 text-2xl font-black outline-none focus:ring-4 focus:ring-rose-500/10 font-bold"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button onClick={() => { setModalOpen(false); setEditingId(null); }} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleAddExpense} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">
                {editingId ? 'Update Expense' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
