import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, Search, Plus, Edit3, Trash2, Warehouse, 
  Check, X, DollarSign, Layers, TrendingUp, AlertCircle, Loader2
} from 'lucide-react';

import {
  getProducts,
  updateProduct,
  deleteProduct,
  getStock,
  adjustStock,
  createProductWithStock
} from '../src/services/stock.service';

import { getStores } from '../src/services/stores.service';
import { Product, Stock, User, UserRole, Store as StoreType } from '../types';

const UNIT_OPTIONS = ["kg", "Unidad", "Caja"];

const StockManagement = ({ user }: { user: User }) => {
  // --- State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [centralStore, setCentralStore] = useState<StoreType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Selection and Alerts
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState<Partial<Product & { currentHubStock: number }>>({
    name: '',
    unit: 'pcs',
    costPrice: 0,
    sellingPrice: 0,
    minStockLevel: 5,
    currentHubStock: 0
  });

  // --- Effects ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // --- Data Fetching ---
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodData, stockData, storesData] = await Promise.all([
        getProducts(), 
        getStock(),
        getStores()
      ]);

      const hub = storesData.find((s: any) => s.is_central === true);
      setCentralStore(hub || null);
      
      setProducts(prodData);
      setStock(stockData);
    } catch (error) {
      console.error("Error loading inventory:", error);
      setAlert({ msg: "Failed to sync with master hub", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isAnyAdmin = user.role === UserRole.ADMIN || user.role === UserRole.CENTRAL_ADMIN;

  // --- Helpers ---
  const getHubStock = (productId: string) => {
    if (!centralStore) return 0;
    return stock.find(s => s.product_id === productId && s.store_id === centralStore.id)?.quantity || 0;
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  // --- Selection Logic ---
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // --- Actions ---
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({ name: '', unit: 'pcs', costPrice: 0, sellingPrice: 0, minStockLevel: 5, currentHubStock: 0 });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({ 
      ...p, 
      currentHubStock: getHubStock(p.id) 
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !centralStore) {
      setAlert({ msg: "No Central Hub identified.", type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        const current = getHubStock(editingProduct.id);
        const delta = (formData.currentHubStock || 0) - current;
        if (delta !== 0) {
          await adjustStock(editingProduct.id, centralStore.id, delta);
        }
        setAlert({ msg: "Product updated successfully", type: 'success' });
      } else {
        await createProductWithStock(formData, formData.currentHubStock || 0, centralStore.id);
        setAlert({ msg: "New product registered", type: 'success' });
      }

      await fetchInitialData();
      setModalOpen(false);
    } catch (error) {
      setAlert({ msg: "Operation failed. Check database constraints.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id?: string) => {
    if (id) {
      setSelectedIds([id]);
    }
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = async () => {
    try {
      setIsSaving(true);
      setShowDeleteConfirm(false);
      await Promise.all(selectedIds.map(id => deleteProduct(id)));
      await fetchInitialData();
      setAlert({ msg: `Successfully deleted ${selectedIds.length} items`, type: 'success' });
      setSelectedIds([]);
    } catch (error: any) {
      setAlert({ msg: "Failed to delete. Items may be linked to transfers.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="p-10 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <span className="font-bold text-slate-500">Connecting to Master Hub...</span>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 relative">
      
      {/* CUSTOM MINI ALERT (TOAST) */}
      {alert && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border font-black text-sm
            ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
              alert.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 
              'bg-amber-50 border-amber-100 text-amber-600'}`}>
            {alert.type === 'success' ? <Check size={18}/> : <AlertCircle size={18}/>}
            {alert.msg}
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 text-center mb-2">Confirm Deletion</h3>
                <p className="text-slate-500 text-center font-medium text-sm mb-8">
                    Are you sure you want to delete {selectedIds.length} item(s)? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setShowDeleteConfirm(false); setSelectedIds([]); }}
                        className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleBulkDelete}
                        className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95"
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Master Inventory</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 font-medium">Control hub supply for:</p>
            {centralStore ? (
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-tighter flex items-center gap-1">
                 {centralStore.name}
              </span>
            ) : (
              <span className="text-rose-500 text-xs font-bold underline flex items-center gap-1">
                <AlertCircle size={12} /> No Central Hub configured!
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && isAnyAdmin && (
            <button 
              onClick={() => confirmDelete()}
              className="bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl flex items-center gap-2 font-black hover:bg-rose-100 transition-all active:scale-95"
            >
              <Trash2 size={18} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          {isAnyAdmin && (
            <button 
              onClick={handleOpenAdd}
              disabled={!centralStore}
              className="bg-primary text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <Plus size={20} /> Register New Product
            </button>
          )}
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-xl group">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Quick search master catalog..." 
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-sm font-bold focus:ring-4 focus:ring-primary-50 transition-all outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="pl-8 py-5 w-10">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary focus:ring-primary cursor-pointer"
                    checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Information</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unit</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hub Stock ({centralStore?.name || 'Central'})</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cost Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sale Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Margin</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => {
                const hubQty = getHubStock(p.id);
                const margin = p.sellingPrice > 0 ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(0) : '0';
                const isSelected = selectedIds.includes(p.id);
                
                return (
                  <tr key={p.id} className={`${isSelected ? 'bg-primary-50/40' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className="pl-8 py-5">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary focus:ring-primary cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(p.id)}
                      />
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-none">{p.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">ID: {p.id.toString().slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                        {p.unit}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${hubQty <= p.minStockLevel ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-primary-50 border-primary-100 text-primary-600'}`}>
                         <Warehouse size={14} />
                         <span className="text-lg font-black">{hubQty}</span>
                         <span className="text-[10px] font-bold opacity-60 uppercase">{p.unit}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-slate-700">€{p.costPrice.toFixed(2)}</td>
                    <td className="px-8 py-5 text-center font-black text-primary">€{p.sellingPrice.toFixed(2)}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{margin}%</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenEdit(p)} className="p-2 text-slate-400 hover:text-primary transition-colors"><Edit3 size={16} /></button>
                        <button onClick={() => confirmDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT MODAL SECTION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary text-white rounded-2xl"><Layers size={24} /></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingProduct ? 'Edit Product' : 'Register Product'}</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400" /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Product Name</label>
                  <input 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-primary-50 transition-all disabled:opacity-50"
                    placeholder="e.g. Organic Tomato"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unit</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-100 border-none rounded-2xl px-4 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-primary-50 appearance-none disabled:opacity-50"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    {UNIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1.5">
                   Stock ({formData.unit}) at {centralStore?.name || 'Central Hub'}
                </label>
                <div className="relative">
                  <Warehouse size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/30" />
                  <input 
                    type="number"
                    disabled={isSaving}
                    className="w-full pl-14 pr-5 py-5 bg-primary-50/50 border-2 border-primary-50 rounded-2xl text-2xl font-black text-primary outline-none focus:ring-4 focus:ring-primary-100 transition-all disabled:opacity-50"
                    value={formData.currentHubStock}
                    onChange={e => setFormData({...formData, currentHubStock: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cost €</label>
                  <input 
                    type="number"
                    step="0.01"
                    disabled={isSaving}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-primary-50 transition-all disabled:opacity-50"
                    value={formData.costPrice}
                    onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sale €</label>
                  <input 
                    type="number"
                    step="0.01"
                    disabled={isSaving}
                    className="w-full bg-primary-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-primary outline-none focus:ring-4 focus:ring-primary-100 transition-all disabled:opacity-50"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                disabled={isSaving}
                onClick={() => setModalOpen(false)} 
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.name || isSaving}
                className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  editingProduct ? 'Commit Changes' : 'Register Product'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;