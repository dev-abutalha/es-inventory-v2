
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Store, 
  Search, 
  X, 
  Layers, 
  Trash2, 
  Check,
  RotateCcw,
  Truck,
  DollarSign,
  ChevronDown,
  Warehouse,
  PlusCircle,
  AlertCircle,
  Edit3
} from 'lucide-react';

import {
  getProducts,
  getStores,
  getStock,
  createProduct,
  adjustStock,
  createTransfer,
} from "../src/services/assignment.service";


import { Product, Store as StoreType, User, UserRole } from '../types';

const UNIT_OPTIONS = ['pcs', 'kg', 'lb', 'box', 'pack', 'liter', 'meter'];

interface MatrixRow {
  id: string; 
  productId: string | null; 
  name: string;
  unit: string;
  incomingQty: number;
  costPrice: number;
  sellingPrice: number;
  distribution: Record<string, number>;
}

const Assignment = ({ user }: { user: User }) => {

const [products, setProducts] = useState<Product[]>([]);
const [stores, setStores] = useState<StoreType[]>([]);
const [stock, setStock] = useState<any[]>([]);


  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Matrix State
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);

  // Main View Inline Edit State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const isAnyAdmin = user.role === UserRole.ADMIN || user.role === UserRole.CENTRAL_ADMIN;

  useEffect(() => {
    (async () => {
      setProducts(await getProducts());
      setStores((await getStores()).filter(s => s.code !== "central"));
      setStock(await getStock());
    })();
  }, []);

  const getStockFor = (productId: string, storeId: string) =>
    stock.find(
      s => s.product_id === productId && s.store_id === storeId
    )?.quantity || 0;


  const createEmptyRow = (): MatrixRow => ({
    id: `row_${Math.random().toString(36).substr(2, 9)}`,
    productId: null,
    name: '',
    unit: 'pcs',
    incomingQty: 0,
    costPrice: 0,
    sellingPrice: 0,
    distribution: stores.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {})
  });

  const handleOpenModal = () => {
    setMatrix([createEmptyRow()]);
    setModalOpen(true);
  };

  const addRow = () => {
    setMatrix([...matrix, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    setMatrix(matrix.filter(r => r.id !== id));
  };

  const updateRow = (idx: number, updates: Partial<MatrixRow>) => {
    const newMatrix = [...matrix];
    newMatrix[idx] = { ...newMatrix[idx], ...updates };
    setMatrix(newMatrix);
  };

  const updateRowDistribution = (idx: number, storeId: string, qty: number) => {
    const newMatrix = [...matrix];
    newMatrix[idx].distribution = { ...newMatrix[idx].distribution, [storeId]: Math.max(0, qty) };
    setMatrix(newMatrix);
  };

  const selectExistingProduct = (idx: number, p: Product) => {
    const newMatrix = [...matrix];
    newMatrix[idx] = {
      ...newMatrix[idx],
      productId: p.id,
      name: p.name,
      unit: p.unit,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice
    };
    setMatrix(newMatrix);
    setActiveSearchIdx(null);
  };




  const handleFinishAssignment = async () => {
    for (const row of matrix) {
      if (!row.name) continue;

      let productId = row.productId;

      // NEW PRODUCT
      if (!productId) {
        const newProduct = await createProduct({
          name: row.name,
          unit: row.unit,
          costPrice: row.costPrice,
          sellingPrice: row.sellingPrice,
          minStockLevel: 5,
        });
        productId = newProduct.id;
      }

      // HUB STOCK
      if (row.incomingQty > 0) {
        await adjustStock(productId!, "central", row.incomingQty);
      }

      // DISTRIBUTION
      for (const [storeId, qty] of Object.entries(row.distribution)) {
        if (qty > 0) {
          await adjustStock(productId!, "central", -qty);
          await adjustStock(productId!, storeId, qty);

          await createTransfer({
            productId: productId!,
            quantity: qty,
            fromStoreId: "central",
            toStoreId: storeId,
          });
        }
      }
    }

    setProducts(await getProducts());
    setStock(await getStock());
    setModalOpen(false);
  };





  const startEditing = (p: Product) => {
    const currentValues: Record<string, number> = {};
    stores.forEach(s => { currentValues[s.id] = getStockFor(p.id, s.id); });
    setEditValues(currentValues);
    setEditingProductId(p.id);
  };

  const saveInlineEdit = (productId: string) => {
    Object.entries(editValues).forEach(([storeId, qty]) => {
      const current = getStockFor(productId, storeId);
      const delta = (qty as number) - (current as number);
      if (delta !== 0) db.updateStock(productId, storeId, delta);
    });
    setStock(db.getStock());
    setEditingProductId(null);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Assignment Center</h1>
          <p className="text-slate-500 font-medium tracking-tight">Supply logistics for the Barcelona retail network.</p>
        </div>
        {isAnyAdmin && (
          <button 
            onClick={handleOpenModal}
            className="bg-primary text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95"
          >
            <Layers size={20} /> 
            Bulk Supply Matrix
          </button>
        )}
      </div>

      <div className="relative max-w-xl group">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Quick filter hub inventory..." 
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-sm font-bold focus:ring-4 focus:ring-primary-50 transition-all outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
          const inHub = getStockFor(p.id, 'central');
          const totalInStores = stores.reduce((acc, s) => acc + getStockFor(p.id, s.id), 0);
          const isEditing = editingProductId === p.id;
          
          return (
            <div key={p.id} className={`bg-white rounded-[2.5rem] border flex flex-col transition-all group overflow-hidden ${isEditing ? 'border-primary ring-4 ring-primary-50 scale-[1.02] shadow-2xl z-20' : 'border-slate-100 shadow-sm hover:border-primary-200'}`}>
              <div className="p-8 pb-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-4 rounded-2xl transition-all ${isEditing ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white'}`}>
                    <Package size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Hub Stock</p>
                    <p className={`text-3xl font-black ${inHub === 0 ? 'text-slate-200' : 'text-slate-900'} tracking-tighter leading-none`}>
                      {inHub} <span className="text-[10px] uppercase font-bold tracking-widest">{p.unit}</span>
                    </p>
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">{p.name}</h3>
                
                {isEditing ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2"><Truck size={12} /> Local Shop Levels</p>
                    {stores.map(s => (
                      <div key={s.id} className="flex justify-between items-center px-4 py-2 rounded-xl bg-primary-50 border border-primary-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase truncate max-w-[120px]">{s.name}</span>
                        <input 
                          type="number"
                          className="w-16 bg-white border-none rounded-lg px-2 py-1 text-right text-xs font-black text-primary outline-none focus:ring-2 focus:ring-primary shadow-sm"
                          value={editValues[s.id]}
                          onChange={e => setEditValues({...editValues, [s.id]: Number(e.target.value)})}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 px-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Store size={16} className="text-slate-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Field Stock</span>
                     </div>
                     <span className="text-sm font-black text-slate-900">{totalInStores} {p.unit}</span>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mt-auto px-8 py-4 bg-primary text-white flex gap-2">
                   <button onClick={() => setEditingProductId(null)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Cancel</button>
                   <button onClick={() => saveInlineEdit(p.id)} className="flex-[2] py-3 bg-white text-primary rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                     <Check size={14} /> Commit
                   </button>
                </div>
              ) : (
                <div className="mt-auto px-8 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-50">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {p.id.split('_').pop()}</p>
                   {isAnyAdmin && (
                     <button 
                       onClick={() => startEditing(p)}
                       className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                     >
                        <Edit3 size={14} /> Adjust Shops
                     </button>
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-[3rem] w-full max-w-[98vw] h-full sm:h-[94vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-6 lg:p-10 border-b border-slate-100 bg-white shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-primary text-white rounded-[1.5rem] shadow-lg shadow-primary/20"><Warehouse size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Bulk Supply Matrix</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Excel-Style Supply pipeline</p>
                </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setMatrix([createEmptyRow()])} className="px-6 py-3 text-rose-500 font-black text-[10px] uppercase hover:bg-rose-50 rounded-xl transition-all">Clear Sheet</button>
                 <button onClick={() => setModalOpen(false)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 hover:text-rose-500 transition-all"><X size={24} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/20 p-4 lg:p-10">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-x-auto min-w-full no-scrollbar">
                <table className="w-full text-left border-collapse table-auto min-w-[1200px]">
                  <thead className="sticky top-0 z-40">
                    <tr className="bg-slate-900 text-white">
                      <th className="p-5 pl-8 text-[9px] font-black uppercase tracking-widest w-[40px]">#</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-widest w-[300px]">Product Name (Existing or New)</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-widest w-[120px] text-center bg-slate-800">New Supply Hub</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-widest w-[100px] text-center">Unit</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-widest w-[100px] text-center border-l border-slate-800">Cost €</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-widest w-[100px] text-center">Sale €</th>
                      {stores.map(s => (
                        <th key={s.id} className="p-5 text-[9px] font-black uppercase tracking-widest text-center bg-primary-900/20 border-l border-slate-800/50">
                          {s.name.replace('Store ', '')}
                        </th>
                      ))}
                      <th className="p-5 pr-8 text-[9px] font-black uppercase tracking-widest text-right bg-slate-800">Remaining Hub</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrix.map((row, idx) => {
                      // Explicitly typing reduce to avoid unknown type errors
                      const assigned = (Object.values(row.distribution) as number[]).reduce((acc: number, val: number) => acc + (val || 0), 0);
                      const hubStock = row.productId ? Number(getStockFor(row.productId, 'central')) : 0;
                      const totalAvailable = hubStock + (Number(row.incomingQty) || 0);
                      const remaining = totalAvailable - assigned;
                      const isNew = !row.productId;

                      return (
                        <tr key={row.id} className={`group transition-colors ${isNew && row.name ? 'bg-primary-50/10' : ''}`}>
                          <td className="p-4 pl-8">
                             <button onClick={() => removeRow(row.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                          </td>
                          <td className="p-4 relative">
                             <div className="relative">
                               <input 
                                 className={`w-full bg-slate-50/50 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-primary/20 ${isNew ? 'text-primary' : 'text-slate-900'}`}
                                 placeholder="Type name..."
                                 value={row.name}
                                 onChange={e => {
                                   updateRow(idx, { name: e.target.value, productId: null });
                                   setActiveSearchIdx(idx);
                                 }}
                               />
                               {activeSearchIdx === idx && row.name && !row.productId && (
                                 <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                                    {products.filter(p => p.name.toLowerCase().includes(row.name.toLowerCase())).slice(0, 5).map(p => (
                                      <button key={p.id} onClick={() => selectExistingProduct(idx, p)} className="w-full px-5 py-4 text-left hover:bg-primary-50 flex items-center justify-between group/opt">
                                         <div>
                                            <p className="text-xs font-black text-slate-900">{p.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Existing • Hub: {getStockFor(p.id, 'central')}</p>
                                         </div>
                                         <Plus size={14} className="text-primary opacity-0 group-hover/opt:opacity-100" />
                                      </button>
                                    ))}
                                    <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System will register "{row.name}" as New</span>
                                    </div>
                                 </div>
                               )}
                             </div>
                          </td>
                          <td className="p-4 bg-slate-50/30">
                             <div className="flex flex-col items-center">
                                <input 
                                  type="number"
                                  className="w-24 bg-white border border-slate-200 rounded-xl px-2 py-3 text-center text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-primary-50"
                                  placeholder="+0"
                                  value={row.incomingQty || ''}
                                  onChange={e => updateRow(idx, { incomingQty: Number(e.target.value) })}
                                />
                                {!isNew && <span className="text-[8px] font-black text-slate-300 uppercase mt-1">Current: {hubStock}</span>}
                             </div>
                          </td>
                          <td className="p-4">
                             <select 
                               className="w-full bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-400 cursor-pointer"
                               value={row.unit}
                               onChange={e => updateRow(idx, { unit: e.target.value })}
                             >
                               {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                             </select>
                          </td>
                          <td className="p-4 border-l border-slate-50">
                             <input 
                               type="number"
                               className={`w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-center text-xs font-black outline-none ${!isNew ? 'opacity-30' : ''}`}
                               placeholder="0"
                               value={row.costPrice || ''}
                               onChange={e => updateRow(idx, { costPrice: Number(e.target.value) })}
                             />
                          </td>
                          <td className="p-4">
                             <input 
                               type="number"
                               className={`w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-center text-xs font-black outline-none ${!isNew ? 'opacity-30' : 'text-primary'}`}
                               placeholder="0"
                               value={row.sellingPrice || ''}
                               onChange={e => updateRow(idx, { sellingPrice: Number(e.target.value) })}
                             />
                          </td>
                          {stores.map(s => (
                            <td key={s.id} className="p-4 border-l border-slate-50 bg-primary-50/5">
                               <div className="flex flex-col items-center">
                                  <input 
                                    type="number"
                                    className="w-20 bg-white border border-primary-100/50 rounded-xl px-2 py-2 text-center text-xs font-black text-primary outline-none focus:ring-4 focus:ring-primary-50 shadow-sm"
                                    placeholder="0"
                                    value={row.distribution[s.id] || ''}
                                    onChange={e => updateRowDistribution(idx, s.id, Number(e.target.value))}
                                  />
                                  <span className="text-[7px] font-black text-primary-200 uppercase mt-1">Store: {row.productId ? getStockFor(row.productId, s.id) : 0}</span>
                               </div>
                            </td>
                          ))}
                          <td className="p-4 pr-8 text-right bg-slate-50/30">
                             <div className={`inline-flex flex-col items-end px-4 py-2 rounded-2xl border ${remaining < 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                <span className="text-[8px] font-black uppercase opacity-60">Balance</span>
                                <span className="text-sm font-black leading-none mt-1">{remaining}</span>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <button 
                onClick={addRow}
                className="mt-8 flex items-center gap-3 px-8 py-5 bg-white border-2 border-dashed border-slate-200 text-slate-400 rounded-3xl font-black text-xs uppercase tracking-widest hover:border-primary hover:text-primary hover:bg-primary-50 transition-all w-full justify-center group"
              >
                <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" /> Add Row to Sheet
              </button>
            </div>

            <div className="p-8 lg:p-12 bg-slate-900 text-white flex flex-col lg:flex-row items-center justify-between gap-8 shrink-0 border-t border-slate-800">
               <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-primary/20 text-primary rounded-3xl flex items-center justify-center border border-primary/20 shadow-2xl">
                    <Truck size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight leading-none">{matrix.filter(r => r.name).length} Ready for Pipeline</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                       <Warehouse size={12} /> Auto-registration for new items enabled
                    </p>
                  </div>
               </div>
               <div className="flex gap-4 w-full lg:w-auto">
                  <button onClick={() => setModalOpen(false)} className="flex-1 lg:flex-none py-5 px-10 font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest text-[10px]">Discard Session</button>
                  <button 
                    disabled={matrix.length === 0 || !matrix.some(r => r.name) || matrix.some(r => {
                      if (!r.name) return false;
                      const hubStock = r.productId ? Number(getStockFor(r.productId, 'central')) : 0;
                      const totalPool = hubStock + (Number(r.incomingQty) || 0);
                      // Explicitly typing reduce to avoid unknown type errors
                      const assigned = (Object.values(r.distribution) as number[]).reduce((acc: number, val: number) => acc + (val || 0), 0);
                      return (totalPool - assigned) < 0;
                    })}
                    onClick={handleFinishAssignment}
                    className="flex-[2] lg:flex-none py-5 px-16 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 hover:bg-primary-600 transition-all disabled:opacity-20 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Check size={20} strokeWidth={3} /> Commit Supply Matrix
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
