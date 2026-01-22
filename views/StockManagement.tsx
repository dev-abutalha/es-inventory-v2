
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Warehouse, 
  Check, 
  X,
  DollarSign,
  Layers,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { db } from '../db';
import { Product, Stock, User, UserRole } from '../types';

const UNIT_OPTIONS = ['pcs', 'kg', 'lb', 'box', 'pack', 'liter', 'meter'];

const StockManagement = ({ user }: { user: User }) => {
  const [products, setProducts] = useState(db.getProducts());
  const [stock, setStock] = useState(db.getStock());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // New Product / Editing state
  const [formData, setFormData] = useState<Partial<Product & { currentHubStock: number }>>({
    name: '',
    unit: 'pcs',
    costPrice: 0,
    sellingPrice: 0,
    minStockLevel: 5,
    currentHubStock: 0
  });

  const isAnyAdmin = user.role === UserRole.ADMIN || user.role === UserRole.CENTRAL_ADMIN;

  const getHubStock = (productId: string) => {
    return stock.find(s => s.productId === productId && s.storeId === 'central')?.quantity || 0;
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

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

  const handleSave = () => {
    if (!formData.name) return;

    let finalProductId = editingProduct?.id;
    if (editingProduct) {
      // Update existing product
      const all = db.getProducts().map(item => item.id === editingProduct.id ? { ...editingProduct, ...formData } as Product : item);
      db.save('rf_products', all);
      
      // Update Stock (Central Hub)
      const current = getHubStock(editingProduct.id);
      const delta = (formData.currentHubStock || 0) - current;
      if (delta !== 0) db.updateStock(editingProduct.id, 'central', delta);
    } else {
      // Create new product
      finalProductId = `p_${Date.now()}`;
      const p: Product = {
        id: finalProductId,
        name: formData.name,
        unit: formData.unit || 'pcs',
        costPrice: formData.costPrice || 0,
        sellingPrice: formData.sellingPrice || 0,
        minStockLevel: formData.minStockLevel || 5
      };
      db.addProduct(p);
      if (formData.currentHubStock && formData.currentHubStock > 0) {
        db.updateStock(finalProductId, 'central', formData.currentHubStock);
      }
    }

    setProducts(db.getProducts());
    setStock(db.getStock());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this product? It will be removed from all catalogs.')) {
      db.deleteProduct(id);
      setProducts(db.getProducts());
      setStock(db.getStock());
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Master Inventory</h1>
          <p className="text-slate-500 font-medium">Global control of products, prices, and hub supply levels.</p>
        </div>
        {isAnyAdmin && (
          <button 
            onClick={handleOpenAdd}
            className="bg-primary text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95"
          >
            <Plus size={20} /> Register New Product
          </button>
        )}
      </div>

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

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Information</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unit</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hub Stock (Central)</th>
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
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-none">{p.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">ID: {p.id.split('_').pop()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">{p.unit}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${hubQty <= p.minStockLevel ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-primary-50 border-primary-100 text-primary-600'}`}>
                         <Warehouse size={14} />
                         <span className="text-lg font-black">{hubQty}</span>
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
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-300 font-bold italic">No catalog entries match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Product Name</label>
                <input 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                  placeholder="e.g. Organic Tomato"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unit</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Alert Level (Min)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                    value={formData.minStockLevel}
                    onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1.5">Hub Stock (Current Quantity)</label>
                <div className="relative">
                  <Warehouse size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/30" />
                  <input 
                    type="number"
                    className="w-full pl-14 pr-5 py-5 bg-primary-50/50 border-2 border-primary-50 rounded-2xl text-2xl font-black text-primary outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                    value={formData.currentHubStock}
                    onChange={e => setFormData({...formData, currentHubStock: Number(e.target.value)})}
                  />
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Updates here reflect immediately in the Assignment Matrix</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cost €</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                    value={formData.costPrice}
                    onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sale €</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-primary-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-primary outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
              <button 
                onClick={handleSave}
                disabled={!formData.name}
                className="flex-2 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {editingProduct ? 'Commit Changes' : 'Register Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
