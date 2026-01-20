
import React, { useState, useMemo } from 'react';
import { Package, Plus, ArrowRight, Store, Warehouse, Search, X, Check, ArrowDownToLine, Send, AlertTriangle } from 'lucide-react';
import { db } from '../db';
import { Product, Store as StoreType, User, StockTransfer } from '../types';

const UNIT_OPTIONS = ['pcs', 'kg', 'lb', 'box', 'pack', 'liter', 'meter'];

const Assignment = ({ user }: { user: User }) => {
  const [products, setProducts] = useState(db.getProducts());
  const [stores, setStores] = useState(db.getStores().filter(s => s.id !== 'central'));
  const [stock, setStock] = useState(db.getStock());
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for creating/adding stock
  const [formProduct, setFormProduct] = useState<Partial<Product>>({
    name: '', unit: 'pcs', costPrice: 0, sellingPrice: 0, minStockLevel: 5
  });
  // Added explicit number type to resolve unknown type issues in calculations
  const [addQty, setAddQty] = useState<number>(0);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [activeStep, setActiveStep] = useState<'details' | 'distribution'>('details');

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const getStockFor = (productId: string, storeId: string) => {
    return stock.find(s => s.productId === productId && s.storeId === storeId)?.quantity || 0;
  };

  const handleOpenAdd = () => {
    setFormProduct({ name: '', unit: 'pcs', costPrice: 0, sellingPrice: 0, minStockLevel: 5 });
    setAddQty(0);
    setDistribution({});
    setActiveStep('details');
    setModalOpen(true);
  };

  const handleFinishAssignment = () => {
    let productId = formProduct.id;
    
    // 1. Save/Create product if new
    if (!productId) {
      productId = `p_${Date.now()}`;
      const p: Product = { ...formProduct as Product, id: productId };
      db.addProduct(p);
      setProducts(db.getProducts());
    }

    // 2. Add units to Central
    // Fix: Explicitly cast addQty to number for comparison and function call
    if ((addQty as number) > 0) {
      db.updateStock(productId!, 'central', addQty as number);
    }

    // 3. Process Distributions (Transfers from Central to Stores)
    // Fix: Explicitly cast Object.entries result to resolve unknown type for qty
    (Object.entries(distribution) as [string, number][]).forEach(([storeId, qty]) => {
      if (qty > 0) {
        const transfer: StockTransfer = {
          id: `tr_${Date.now()}_${storeId}`,
          date: new Date().toISOString().split('T')[0],
          productId: productId!,
          quantity: qty,
          fromStoreId: 'central',
          toStoreId: storeId
        };
        db.addTransfer(transfer);
      }
    });

    setStock(db.getStock());
    setModalOpen(false);
  };

  // Fix: Add explicit number types and casts to resolve unknown type errors in arithmetic operations
  const currentHubStock: number = formProduct.id ? (getStockFor(formProduct.id, 'central') as number) : 0;
  const assignedTotal: number = Object.values(distribution).reduce((a: number, b: number) => a + b, 0);
  const totalPool: number = currentHubStock + (addQty as number);
  const remainingInCentral: number = totalPool - assignedTotal;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Assignment Center</h1>
          <p className="text-slate-500 font-medium">Add stock to inventory and assign to stores instantly.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95"
        >
          <Plus size={20} /> Add & Assign Stock
        </button>
      </div>

      <div className="relative max-w-xl">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search inventory..." 
          className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm font-bold focus:ring-4 focus:ring-primary-50"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(p => {
          const inCentral = getStockFor(p.id, 'central');
          return (
            <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-primary-200 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-primary-50 group-hover:text-primary transition-colors">
                  <Package size={24} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Central Hub</p>
                  <p className="text-2xl font-black text-slate-900 leading-none">{inCentral} <span className="text-[10px] uppercase text-slate-400">{p.unit || 'pcs'}</span></p>
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-4">{p.name}</h3>
              
              <div className="space-y-2 mb-6 flex-1">
                {stores.map(s => {
                  const qty = getStockFor(p.id, s.id);
                  if (qty === 0) return null;
                  return (
                    <div key={s.id} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>{s.name}</span>
                      <span className="text-slate-900">{qty} {p.unit || 'pcs'}</span>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => {
                  setFormProduct(p);
                  setAddQty(0);
                  setDistribution({});
                  setActiveStep('distribution');
                  setModalOpen(true);
                }}
                className="w-full py-4 bg-slate-50 text-slate-400 hover:bg-primary hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Assign Units
              </button>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] relative">
            
            {/* Top Right Close Button */}
            <button 
              onClick={() => setModalOpen(false)} 
              className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors z-[110] text-slate-400"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>

            {/* Left Panel: Product/Entry Details */}
            <div className="md:w-5/12 p-10 bg-slate-50 border-r border-slate-100 flex flex-col">
              <h2 className="text-2xl font-black text-slate-900 mb-8">Stock Entry</h2>
              
              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {!formProduct.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">New Product Name</label>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-4 focus:ring-primary-50"
                        placeholder="e.g. Apple Red"
                        value={formProduct.name}
                        onChange={e => setFormProduct({...formProduct, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantity Unit</label>
                      <div className="grid grid-cols-4 gap-2">
                        {UNIT_OPTIONS.map(u => (
                          <button
                            key={u}
                            onClick={() => setFormProduct({...formProduct, unit: u})}
                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formProduct.unit === u ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border-slate-100 hover:border-primary-200'}`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-50 text-primary rounded-2xl flex items-center justify-center">
                      <Package size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900">{formProduct.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{formProduct.unit || 'pcs'}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-300 uppercase">On Hand</p>
                       <p className="text-lg font-black text-slate-900">{currentHubStock} {formProduct.unit}</p>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">New Stock Incoming</label>
                    {activeStep === 'distribution' && (
                      <button 
                        onClick={() => setActiveStep('details')}
                        className="text-[9px] font-black text-primary uppercase hover:underline"
                      >
                        Edit Product Details
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm focus-within:ring-4 focus-within:ring-primary-50 transition-all">
                      <div className="flex items-end gap-2">
                        <input 
                          type="number" 
                          className="flex-1 bg-transparent text-4xl font-black text-slate-900 outline-none placeholder:text-slate-100"
                          placeholder="0"
                          value={addQty || ''}
                          onChange={e => setAddQty(Number(e.target.value))}
                        />
                        <span className="text-xl font-black text-slate-300 uppercase pb-2">{formProduct.unit || 'pcs'}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Additional units to hub pool</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-primary uppercase">Current Distribution Pool</span>
                    <span className={`text-[10px] font-black uppercase ${remainingInCentral < 0 ? 'text-rose-600' : 'text-primary-400'}`}>
                      {remainingInCentral >= 0 ? 'Total Pool' : 'Exceeds Available'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-4xl font-black ${remainingInCentral < 0 ? 'text-rose-600' : 'text-primary'}`}>
                      {remainingInCentral}
                    </p>
                    <span className="text-xs font-black text-slate-400 uppercase">{formProduct.unit || 'pcs'}</span>
                  </div>
                  <div className="mt-3 flex gap-4 text-[9px] font-bold text-slate-400 uppercase">
                    <div>Hub: {currentHubStock}</div>
                    <div>+ New: {addQty}</div>
                    <div>- Move: {assignedTotal}</div>
                  </div>
                </div>

                {remainingInCentral < 0 && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider animate-pulse border border-rose-100">
                    <AlertTriangle size={14} /> You cannot assign more than {totalPool} {formProduct.unit}
                  </div>
                )}
              </div>

              {activeStep === 'details' && (
                <button 
                  disabled={!formProduct.name || (addQty <= 0 && currentHubStock <= 0)}
                  onClick={() => setActiveStep('distribution')}
                  className="mt-8 w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all shrink-0 shadow-xl"
                >
                  Proceed to Assign <ArrowRight size={16} />
                </button>
              )}
            </div>

            {/* Right Panel: Distribution List */}
            <div className={`md:w-7/12 flex flex-col transition-all ${activeStep === 'details' ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
              <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Store Assignment List</h3>
                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase">
                    <Send size={12} /> Moving: {assignedTotal} {formProduct.unit || 'pcs'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {stores.map(store => (
                    <div key={store.id} className="p-5 bg-white border border-slate-100 rounded-3xl hover:border-primary shadow-sm transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary transition-colors">
                          <Store size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{store.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">On hand: {getStockFor(formProduct.id || '', store.id)} {formProduct.unit}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <label className="text-[9px] font-black text-slate-300 uppercase">Assign Qty</label>
                        <input 
                          type="number"
                          className="w-24 bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-black text-slate-900 outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                          placeholder="0"
                          min="0"
                          value={distribution[store.id] || ''}
                          onChange={e => {
                            const val = Math.max(0, Number(e.target.value));
                            setDistribution({...distribution, [store.id]: val});
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                <button 
                  disabled={totalPool <= 0 || remainingInCentral < 0 || (addQty === 0 && assignedTotal === 0)}
                  onClick={handleFinishAssignment}
                  className="flex-3 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 disabled:opacity-50 active:scale-95 transition-all"
                >
                  Commit Entry & Distribute
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
