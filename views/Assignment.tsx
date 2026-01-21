
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Store, 
  Search, 
  X, 
  Layers, 
  Trash2, 
  ArrowRight, 
  Table as TableIcon, 
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db } from '../db';
import { Product, Store as StoreType, User } from '../types';

const UNIT_OPTIONS = ['pcs', 'kg', 'lb', 'box', 'pack', 'liter', 'meter'];

interface StockEntry {
  id: string; 
  productId: string | null;
  name: string;
  unit: string;
  incomingQty: number;
  distribution: Record<string, number>;
}

const Assignment = ({ user }: { user: User }) => {
  const [products, setProducts] = useState(db.getProducts());
  const [stores, setStores] = useState(db.getStores().filter(s => s.id !== 'central'));
  const [stock, setStock] = useState(db.getStock());
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [batch, setBatch] = useState<StockEntry[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Sync data whenever products or stock changes
  useEffect(() => {
    setProducts(db.getProducts());
    setStock(db.getStock());
  }, [isModalOpen]);

  const getStockFor = (productId: string, storeId: string) => {
    return stock.find(s => s.productId === productId && s.storeId === storeId)?.quantity || 0;
  };

  const handleOpenModal = () => {
    setBatch([]);
    setProductSearch('');
    setModalOpen(true);
  };

  const addAllToBatch = () => {
    const newBatch = products.map(p => ({
      id: `temp_${Math.random()}`,
      productId: p.id,
      name: p.name,
      unit: p.unit || 'pcs',
      incomingQty: 0,
      distribution: stores.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {})
    }));
    setBatch(newBatch);
  };

  const addProductToBatch = (p: Product) => {
    if (batch.some(b => b.productId === p.id)) return;
    const newEntry: StockEntry = {
      id: `temp_${Math.random()}`,
      productId: p.id,
      name: p.name,
      unit: p.unit || 'pcs',
      incomingQty: 0,
      distribution: stores.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {})
    };
    setBatch([newEntry, ...batch]);
    setProductSearch('');
  };

  const addNewProductToBatch = () => {
    if (!productSearch.trim()) return;
    const newEntry: StockEntry = {
      id: `temp_${Math.random()}`,
      productId: null,
      name: productSearch,
      unit: 'pcs',
      incomingQty: 0,
      distribution: stores.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {})
    };
    setBatch([newEntry, ...batch]);
    setProductSearch('');
  };

  const updateEntry = (id: string, updates: Partial<StockEntry>) => {
    setBatch(batch.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateDistribution = (id: string, storeId: string, qty: number) => {
    setBatch(batch.map(b => b.id === id ? {
      ...b,
      distribution: { ...b.distribution, [storeId]: Math.max(0, qty) }
    } : b));
  };

  const handleFinishAssignment = () => {
    batch.forEach(entry => {
      let finalProductId = entry.productId;
      if (!finalProductId) {
        finalProductId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        db.addProduct({ 
          id: finalProductId, 
          name: entry.name, 
          unit: entry.unit, 
          costPrice: 0, 
          sellingPrice: 0, 
          minStockLevel: 5 
        });
      }
      if (entry.incomingQty > 0) db.updateStock(finalProductId, 'central', entry.incomingQty);
      
      (Object.entries(entry.distribution) as [string, number][]).forEach(([storeId, qty]) => {
        if (qty > 0) {
          db.addTransfer({
            id: `tr_${Date.now()}_${storeId}_${finalProductId}`,
            date: new Date().toISOString().split('T')[0],
            productId: finalProductId!,
            quantity: qty,
            fromStoreId: 'central',
            toStoreId: storeId
          });
        }
      });
    });
    setStock(db.getStock());
    setProducts(db.getProducts());
    setModalOpen(false);
  };

  const filteredCatalog = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      !batch.some(b => b.productId === p.id)
    ).slice(0, 5);
  }, [products, productSearch, batch]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Assignment Center</h1>
          <p className="text-slate-500 font-medium">Global store map and bulk restock processing.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-primary text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95 group"
        >
          <Layers size={20} className="group-hover:rotate-12 transition-transform" /> 
          Process Bulk Supply
        </button>
      </div>

      <div className="relative max-w-xl">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input 
          type="text" 
          placeholder="Filter entire shop catalog..." 
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-sm font-bold focus:ring-4 focus:ring-primary-50 transition-all outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
          const inHub = getStockFor(p.id, 'central');
          const totalInStores = stores.reduce((acc, s) => acc + getStockFor(p.id, s.id), 0);
          
          return (
            <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col hover:border-primary-200 transition-all group overflow-hidden">
              <div className="p-8 pb-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
                    <Package size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Central Hub</p>
                    <p className={`text-2xl font-black ${inHub === 0 ? 'text-slate-200' : 'text-slate-900'}`}>
                      {inHub} <span className="text-[10px] uppercase font-bold">{p.unit}</span>
                    </p>
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">{p.name}</h3>
                
                <div className="space-y-3">
                  {stores.map(s => {
                    const qty = getStockFor(p.id, s.id);
                    return (
                      <div key={s.id} className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.name}</span>
                        <span className={`text-sm font-black ${qty === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                          {qty} {p.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-auto px-8 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-50">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Retail Stock</p>
                 <p className="text-sm font-black text-primary">{totalInStores} {p.unit}</p>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-[3rem] w-full max-w-[98vw] h-full sm:h-[94vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-6 lg:p-10 border-b border-slate-100 bg-white shrink-0">
              <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary text-white rounded-3xl shadow-lg shadow-primary/20"><TableIcon size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Matrix Entry</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Multi-Store Logistical Dispatch</p>
                  </div>
                </div>
                
                <div className="relative flex-1 w-full group">
                  <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <input 
                    autoFocus
                    type="text"
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-200 transition-all outline-none text-lg"
                    placeholder="Search or type product..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNewProductToBatch()}
                  />
                  {productSearch && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden z-[110]">
                      {filteredCatalog.map(p => (
                        <button key={p.id} onClick={() => addProductToBatch(p)} className="w-full px-8 py-5 flex items-center justify-between hover:bg-primary-50 border-b border-slate-50 last:border-none group">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-white transition-colors text-slate-400"><Package size={18} /></div>
                            <div className="text-left">
                              <p className="font-black text-slate-900">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{p.unit}</p>
                            </div>
                          </div>
                          <Plus size={20} className="text-primary" />
                        </button>
                      ))}
                      <button onClick={addNewProductToBatch} className="w-full px-8 py-6 flex items-center gap-5 text-primary bg-primary-50/20 hover:bg-primary-50 transition-colors">
                        <Plus size={24} className="bg-primary text-white rounded-2xl p-1" />
                        <span className="font-black text-sm uppercase tracking-widest">Register New: "{productSearch}"</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 shrink-0">
                  <button onClick={addAllToBatch} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">Add All Catalog</button>
                  <button onClick={() => setModalOpen(false)} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 hover:text-rose-500 transition-all"><X size={24} /></button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/50">
              {batch.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                   <ArrowDownToLine size={100} className="mb-8 opacity-5 animate-bounce" />
                   <h3 className="font-black text-lg uppercase tracking-[0.5em] opacity-30">Matrix Workspace Empty</h3>
                </div>
              ) : (
                <div className="min-w-max p-4 lg:p-6">
                  <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white sticky top-0 z-20 shadow-sm">
                        <tr>
                          <th className="p-4 pl-6 text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white w-[220px] border-b border-slate-100">Product</th>
                          <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white text-center border-b border-slate-100">Hub Supply</th>
                          {stores.map(s => (
                            <th key={s.id} className="p-2 text-[11px] font-black text-primary uppercase tracking-widest bg-primary-50/50 text-center border-x border-primary-100/30 border-b border-primary-100/30">
                              <span className="truncate block max-w-[80px] mx-auto">{s.name}</span>
                            </th>
                          ))}
                          <th className="p-4 pr-6 text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white text-right border-b border-slate-100">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {batch.map((b: StockEntry) => {
                          const assigned = (Object.values(b.distribution) as number[]).reduce((acc: number, val: number) => acc + (val || 0), 0);
                          const hubStock = b.productId ? getStockFor(b.productId, 'central') : 0;
                          const totalPool = hubStock + b.incomingQty;
                          const remaining = totalPool - assigned;

                          return (
                            <tr key={b.id} className="hover:bg-slate-50/30 transition-colors group">
                              <td className="p-4 pl-6 w-[220px]">
                                <div className="flex items-center gap-3">
                                  <button onClick={() => setBatch(batch.filter(item => item.id !== b.id))} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                  <div className="flex-1 min-w-0">
                                    <input 
                                      className="block font-black text-sm bg-transparent border-none p-0 outline-none w-full focus:text-primary transition-colors truncate"
                                      value={b.name}
                                      onChange={e => updateEntry(b.id, { name: e.target.value })}
                                    />
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <select 
                                        className="text-[8px] font-black text-slate-300 uppercase tracking-widest bg-slate-100/50 px-1.5 py-0.5 rounded-md outline-none cursor-pointer"
                                        value={b.unit}
                                        onChange={e => updateEntry(b.id, { unit: e.target.value })}
                                      >
                                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <div className="relative">
                                    <input 
                                      type="number"
                                      className="w-20 bg-slate-100/50 border border-slate-200 rounded-xl px-2 py-3 text-center text-sm font-black text-slate-900 outline-none focus:border-primary-200 focus:bg-white transition-all"
                                      placeholder="0"
                                      value={b.incomingQty || ''}
                                      onChange={e => updateEntry(b.id, { incomingQty: Number(e.target.value) })}
                                    />
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 bg-white text-[7px] font-black text-slate-400 uppercase leading-none">Add</span>
                                  </div>
                                  <p className="text-[8px] font-black text-slate-300 uppercase mt-2">Hub: {hubStock}</p>
                                </div>
                              </td>
                              {stores.map(s => (
                                <td key={s.id} className="p-2 bg-primary-50/10 border-x border-primary-50/50 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <input 
                                      type="number"
                                      className="w-16 bg-white border border-primary-100/60 rounded-xl px-2 py-3 text-center text-sm font-black text-primary outline-none focus:ring-4 focus:ring-primary-100 transition-all shadow-sm"
                                      placeholder="0"
                                      value={b.distribution[s.id] || ''}
                                      onChange={e => updateDistribution(b.id, s.id, Number(e.target.value))}
                                    />
                                    <p className="text-[7px] font-black text-primary-300 uppercase mt-1.5">Bal: {b.productId ? getStockFor(b.productId, s.id) : 0}</p>
                                  </div>
                                </td>
                              ))}
                              <td className="p-4 pr-6 text-right">
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${remaining >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                  <div className="text-right">
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Bal</p>
                                    <p className="text-base font-black">{remaining}</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 lg:p-12 bg-slate-900 text-white flex flex-col lg:flex-row items-center justify-between gap-8 shrink-0 z-[120] border-t border-slate-800">
               <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-primary/20 text-primary rounded-[1.5rem] flex items-center justify-center border border-primary/20">
                    <Layers size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">{batch.length} Rows Pending</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                       Ready for Hub Distribution Sync
                    </p>
                  </div>
               </div>
               <div className="flex gap-4 w-full lg:w-auto">
                  <button onClick={() => setModalOpen(false)} className="flex-1 lg:flex-none py-4 px-10 font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest text-xs">Discard</button>
                  <button 
                    disabled={batch.length === 0 || batch.some((b: StockEntry) => {
                       const hubStock = b.productId ? getStockFor(b.productId, 'central') : 0;
                       const totalPool = (hubStock as number) + (b.incomingQty as number);
                       const assigned = (Object.values(b.distribution) as number[]).reduce((acc: number, val: number) => acc + (val || 0), 0);
                       return totalPool - assigned < 0;
                    })}
                    onClick={handleFinishAssignment}
                    className="flex-[3] lg:flex-none py-5 px-16 bg-primary text-white rounded-2xl font-black text-base uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 hover:bg-primary-600 transition-all disabled:opacity-20 active:scale-95"
                  >
                    Commit Dispatch
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignment;
