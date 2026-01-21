
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  X, 
  Search, 
  Clock, 
  Package, 
  AlertTriangle, 
  User as UserIcon, 
  Calendar, 
  FileText, 
  Image as ImageIcon,
  CheckCircle,
  Save,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../db';
import { User, UserRole, WastageReport, WastageItem, Product } from '../types';
import CalendarPicker from '../components/CalendarPicker';

const WASTAGE_REASONS = [
  'Ripe / Rotten', 
  'Mold', 
  'Damage / Handling', 
  'Transport', 
  'Expired', 
  'Over-ordered', 
  'Supplier Issue'
];

const Wastage = ({ user }: { user: User }) => {
  const [reports, setReports] = useState(db.getWastage());
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCatalog, setShowCatalog] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = db.getProducts();
  const stores = db.getStores();
  const isAdmin = user.role === UserRole.ADMIN;

  const initialItem: WastageItem = {
    time: format(new Date(), 'HH:mm'),
    productId: '',
    productName: '',
    reason: 'Ripe / Rotten',
    quantity: 0,
    unitPrice: 0,
    total: 0
  };

  const initialForm: Omit<WastageReport, 'id'> = {
    date: format(new Date(), 'yyyy-MM-dd'),
    storeId: user.assignedStoreId || (stores.find(s => s.id !== 'central')?.id || ''),
    responsible: user.name,
    items: [{ ...initialItem }],
    totalWastage: 0,
    receiptImage: ''
  };

  const [form, setForm] = useState(initialForm);

  const filteredReports = useMemo(() => {
    const list = isAdmin ? reports : reports.filter(r => r.storeId === user.assignedStoreId);
    return list.sort((a,b) => b.date.localeCompare(a.date));
  }, [reports, isAdmin, user.assignedStoreId]);

  const filteredCatalog = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5);
  }, [products, productSearch]);

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...initialItem }] });
  };

  const removeItem = (idx: number) => {
    const newItems = form.items.filter((_, i) => i !== idx);
    setForm({ ...form, items: newItems.length ? newItems : [{ ...initialItem }] });
  };

  const updateItem = (idx: number, field: keyof WastageItem, val: any) => {
    const newItems = [...form.items];
    const item = { ...newItems[idx], [field]: val };
    
    // Auto-calculate line total
    if (field === 'quantity' || field === 'unitPrice') {
      item.total = Number((item.quantity * item.unitPrice).toFixed(2));
    }
    
    newItems[idx] = item;
    setForm({ ...form, items: newItems });
  };

  const selectProduct = (idx: number, p: Product) => {
    const newItems = [...form.items];
    newItems[idx] = {
      ...newItems[idx],
      productId: p.id,
      productName: p.name,
      unitPrice: p.costPrice // Use cost price for wastage value
    };
    newItems[idx].total = Number((newItems[idx].quantity * p.costPrice).toFixed(2));
    setForm({ ...form, items: newItems });
    setShowCatalog(null);
    setProductSearch('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, receiptImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const total = form.items.reduce((acc, item) => acc + item.total, 0);
    const report: WastageReport = {
      id: `w_${Date.now()}`,
      ...form,
      totalWastage: total
    };
    db.addWastage(report);
    setReports(db.getWastage());
    setModalOpen(false);
    setForm(initialForm);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this wastage log?')) {
      db.deleteWastage(id);
      setReports(db.getWastage());
    }
  };

  const totalCalculated = useMemo(() => form.items.reduce((acc, i) => acc + i.total, 0), [form.items]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Wastage Center</h1>
          <p className="text-slate-500 font-medium">Daily loss tracking and inventory hygiene.</p>
        </div>
        <button 
          onClick={() => { setForm(initialForm); setModalOpen(true); }}
          className="bg-rose-600 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
        >
          <Plus size={20} /> New Wastage Log
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredReports.map(report => (
          <div key={report.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col group hover:border-rose-200 transition-all relative">
            <button 
              onClick={() => handleDelete(report.id)}
              className="absolute top-8 right-8 text-slate-200 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
            <div className="flex items-center gap-4 mb-6">
               <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl">
                 <Trash2 size={24} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{report.date}</p>
                  <h4 className="text-lg font-black text-slate-900 leading-tight">{stores.find(s => s.id === report.storeId)?.name}</h4>
               </div>
            </div>

            <div className="space-y-2 mb-8">
               {report.items.slice(0, 3).map((item, i) => (
                 <div key={i} className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span className="truncate max-w-[150px]">{item.productName}</span>
                    <span className="text-rose-500 font-black">€{item.total.toFixed(2)}</span>
                 </div>
               ))}
               {report.items.length > 3 && (
                 <p className="text-[10px] font-black text-slate-300 uppercase">+{report.items.length - 3} more items...</p>
               )}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Loss</p>
                  <p className="text-2xl font-black text-rose-600 tracking-tighter">€{report.totalWastage.toFixed(2)}</p>
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsible</p>
                  <p className="text-xs font-black text-slate-900">{report.responsible}</p>
               </div>
            </div>
          </div>
        ))}
        {filteredReports.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300">
             <AlertTriangle size={48} className="mx-auto mb-4 opacity-10" />
             <p className="font-black text-xs uppercase tracking-widest">No wastage logs recorded yet.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-6xl h-full sm:h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
             
             {/* HEADER */}
             <div className="p-8 lg:p-10 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-rose-600 text-white rounded-3xl shadow-lg shadow-rose-200">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Daily Wastage Log</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Control Document — Mandatory Hub Protocol</p>
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} className="text-slate-400" /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                {/* METADATA SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Store</label>
                      <select 
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-rose-50 transition-all"
                        value={form.storeId}
                        onChange={e => setForm({...form, storeId: e.target.value})}
                      >
                         {stores.filter(s => s.id !== 'central').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                   <CalendarPicker label="Date" value={form.date} onChange={d => setForm({...form, date: d})} />
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Closing Responsible</label>
                      <div className="relative">
                        <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-rose-50 transition-all"
                          value={form.responsible}
                          onChange={e => setForm({...form, responsible: e.target.value})}
                          placeholder="Name of the responsible person"
                        />
                      </div>
                   </div>
                </div>

                {/* MATRIX ITEMS */}
                <div className="mb-12">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Wastage Details</h3>
                      <button onClick={addItem} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-slate-200">
                        + Add Line Item
                      </button>
                   </div>
                   
                   <div className="overflow-x-auto no-scrollbar">
                     <table className="w-full min-w-[900px]">
                        <thead className="text-left border-b-2 border-slate-100">
                           <tr>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[100px]">Time</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[250px]">Product</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[200px]">Reason</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[120px] text-center">Weight / Qty</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[120px] text-center">€/kg or €/unit</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[120px] text-right">Total €</th>
                              <th className="pb-4 w-12"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {form.items.map((item, idx) => (
                             <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 pr-3">
                                   <div className="relative">
                                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-200" size={12} />
                                      <input 
                                        type="time"
                                        className="w-full pl-8 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border-none focus:ring-2 focus:ring-rose-100"
                                        value={item.time}
                                        onChange={e => updateItem(idx, 'time', e.target.value)}
                                      />
                                   </div>
                                </td>
                                <td className="py-4 pr-3 relative">
                                   <div className="relative">
                                      <input 
                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-black outline-none border-none focus:ring-2 focus:ring-rose-100 placeholder:text-slate-300"
                                        placeholder="Search product..."
                                        value={item.productName}
                                        onFocus={() => setShowCatalog(idx)}
                                        onChange={e => {
                                          updateItem(idx, 'productName', e.target.value);
                                          setProductSearch(e.target.value);
                                        }}
                                      />
                                      {showCatalog === idx && productSearch && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                                           {filteredCatalog.map(p => (
                                             <button 
                                               key={p.id} onClick={() => selectProduct(idx, p)}
                                               className="w-full px-4 py-3 text-left hover:bg-rose-50 flex items-center justify-between group/p"
                                             >
                                                <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                                <span className="text-[10px] font-black text-slate-300 uppercase">{p.unit}</span>
                                             </button>
                                           ))}
                                        </div>
                                      )}
                                   </div>
                                </td>
                                <td className="py-4 pr-3">
                                   <select 
                                     className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-none focus:ring-2 focus:ring-rose-100"
                                     value={item.reason}
                                     onChange={e => updateItem(idx, 'reason', e.target.value)}
                                   >
                                      {WASTAGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                   </select>
                                </td>
                                <td className="py-4 pr-3">
                                   <input 
                                     type="number"
                                     step="0.001"
                                     className="w-full py-3 bg-slate-50 rounded-xl text-center text-xs font-black outline-none border-none focus:ring-2 focus:ring-rose-100"
                                     value={item.quantity || ''}
                                     placeholder="0.000"
                                     onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                   />
                                </td>
                                <td className="py-4 pr-3">
                                   <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-200 text-xs">€</span>
                                      <input 
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-7 pr-3 py-3 bg-slate-50 rounded-xl text-center text-xs font-bold outline-none border-none focus:ring-2 focus:ring-rose-100"
                                        value={item.unitPrice || ''}
                                        placeholder="0.00"
                                        onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                                      />
                                   </div>
                                </td>
                                <td className="py-4 text-right pr-3 font-black text-rose-600">
                                   €{item.total.toFixed(2)}
                                </td>
                                <td className="py-4">
                                   <button onClick={() => removeItem(idx)} className="p-2 text-slate-200 hover:text-rose-500 rounded-lg"><X size={16} /></button>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                   </div>
                </div>

                {/* BOTTOM SECTION: SNAPSHOT & NOTES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-slate-100">
                   <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Log Snapshot (Mandatory Photo)</h3>
                      {form.receiptImage ? (
                         <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-100 shadow-lg group">
                            <img src={form.receiptImage} className="w-full h-auto max-h-[300px] object-contain bg-slate-50" />
                            <button 
                              onClick={() => setForm({...form, receiptImage: ''})}
                              className="absolute top-4 right-4 p-3 bg-rose-500 text-white rounded-2xl shadow-xl z-20"
                            >
                               <X size={20} />
                            </button>
                         </div>
                      ) : (
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="w-full h-40 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 transition-all group"
                         >
                            <ImageIcon size={48} className="mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Attach Signed Paper Form</span>
                         </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                   </div>

                   <div className="space-y-6">
                      <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100">
                        <div className="flex items-center gap-3 mb-4">
                           <AlertTriangle size={20} className="text-amber-500" />
                           <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Permitted Reasons Checklist</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {WASTAGE_REASONS.map(r => (
                             <span key={r} className="px-3 py-1 bg-white text-[9px] font-black text-amber-600 rounded-lg uppercase border border-amber-200">{r}</span>
                           ))}
                        </div>
                        <p className="mt-6 text-[10px] font-bold text-amber-800 leading-relaxed uppercase opacity-60">
                          RULE: All wastage MUST be weighed or counted before disposal. Each daily log requires a responsible person and a physical snapshot.
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                         <div className="flex-1 px-8 py-6 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-between">
                            <div>
                               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Daily Loss</p>
                               <p className="text-3xl font-black tracking-tight">€{totalCalculated.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20">
                               <TrendingUp size={24} />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* FOOTER ACTIONS */}
             <div className="p-8 lg:p-10 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0 z-20">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle size={20} /></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wastage bin verified & Approved for disposal</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                   <button onClick={() => setModalOpen(false)} className="flex-1 sm:flex-none py-4 px-10 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Cancel</button>
                   <button 
                     onClick={handleSave}
                     className="flex-[2] sm:flex-none py-4 px-16 bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
                   >
                     Submit Wastage Report
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wastage;
