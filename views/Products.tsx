
import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Package, 
  DollarSign, 
  Save, 
  MoreVertical,
  Edit3
} from 'lucide-react';
import { db } from '../db';
import { Product, User } from '../types';

const UNIT_OPTIONS = ['pcs', 'kg', 'lb', 'box', 'pack', 'liter', 'meter'];

// Added 'key' to props type to resolve property 'key' does not exist error
const ProductCard = ({ product, onUpdate, onDelete }: { product: Product, onUpdate: (p: Product) => void, onDelete: (id: string) => void, key?: React.Key }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState(product);

  const margin = product.sellingPrice > 0 ? (((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100).toFixed(0) : '0';

  const handleSave = () => {
    onUpdate(edited);
    setIsEditing(false);
  };

  return (
    <div className={`bg-white rounded-[2.5rem] border-2 p-8 transition-all flex flex-col h-full relative group ${isEditing ? 'border-primary shadow-2xl scale-[1.02] z-10' : 'border-slate-100 shadow-sm hover:border-slate-300'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-3xl transition-colors ${isEditing ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
          <Package size={24} />
        </div>
        <div className="flex gap-2">
           {!isEditing ? (
             <>
                <button onClick={() => setIsEditing(true)} className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"><Edit3 size={16} /></button>
                <button onClick={() => onDelete(product.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
             </>
           ) : (
             <button onClick={handleSave} className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20"><Save size={16} /></button>
           )}
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {isEditing ? (
          <>
            <input 
              className="w-full text-xl font-black text-slate-900 border-b-2 border-primary outline-none pb-1"
              value={edited.name}
              onChange={e => setEdited({...edited, name: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Unit</label>
                  <select 
                    className="w-full bg-slate-50 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none"
                    value={edited.unit}
                    onChange={e => setEdited({...edited, unit: e.target.value})}
                  >
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Min. Stock</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 rounded-xl px-3 py-2 text-xs font-black outline-none"
                    value={edited.minStockLevel}
                    onChange={e => setEdited({...edited, minStockLevel: Number(e.target.value)})}
                  />
               </div>
            </div>
          </>
        ) : (
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{product.name}</h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">{product.unit}</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Target stock: {product.minStockLevel}</span>
            </div>
          </div>
        )}
      </div>

      <div className={`mt-8 pt-8 border-t ${isEditing ? 'border-primary/10' : 'border-slate-50'} grid grid-cols-2 gap-6`}>
         <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cost Price</p>
            {isEditing ? (
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300">€</span>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full pl-4 font-black text-slate-900 border-b border-slate-200 outline-none focus:border-primary"
                  value={edited.costPrice}
                  onChange={e => setEdited({...edited, costPrice: Number(e.target.value)})}
                />
              </div>
            ) : (
              <p className="text-xl font-black text-slate-900">€{product.costPrice.toFixed(2)}</p>
            )}
         </div>
         <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale Price</p>
            {isEditing ? (
              <div className="relative">
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-primary-300">€</span>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full pr-4 text-right font-black text-primary border-b border-primary-200 outline-none focus:border-primary"
                  value={edited.sellingPrice}
                  onChange={e => setEdited({...edited, sellingPrice: Number(e.target.value)})}
                />
              </div>
            ) : (
              <p className="text-xl font-black text-primary">€{product.sellingPrice.toFixed(2)}</p>
            )}
         </div>
      </div>

      {!isEditing && (
        <div className="absolute top-8 right-16">
           <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
             {margin}% Margin
           </div>
        </div>
      )}
    </div>
  );
};

const Products = ({ user }: { user: User }) => {
  const [products, setProducts] = useState(db.getProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', costPrice: 0, sellingPrice: 0, minStockLevel: 5, unit: 'pcs'
  });

  const handleSaveNew = () => {
    if (newProduct.name) {
      const p: Product = {
        id: `p_${Date.now()}`,
        ...(newProduct as Product)
      };
      db.addProduct(p);
      setProducts(db.getProducts());
      setIsAdding(false);
      setNewProduct({ name: '', costPrice: 0, sellingPrice: 0, minStockLevel: 5, unit: 'pcs' });
    }
  };

  const handleUpdate = (p: Product) => {
    // This is a simplified update, in real app we'd have a db.updateProduct
    const all = db.getProducts().map(item => item.id === p.id ? p : item);
    db.save('rf_products', all);
    setProducts(all);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this product from the master catalog?')) {
      db.deleteProduct(id);
      setProducts(db.getProducts());
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Master Catalog</h1>
          <p className="text-slate-500 font-medium">Configure global products, units, and profit margins.</p>
        </div>
        <div className="relative w-full max-w-md group">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search catalog items..." 
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-sm font-bold focus:ring-4 focus:ring-primary-50 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {/* ADD CARD */}
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] p-12 flex flex-col items-center justify-center gap-6 text-slate-300 hover:border-primary hover:text-primary hover:bg-primary-50 transition-all min-h-[350px] group"
          >
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
              <Plus size={48} strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <span className="block font-black text-sm uppercase tracking-[0.3em] mb-2">New Entry</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Register a fresh product</p>
            </div>
          </button>
        ) : (
          <div className="bg-white border-2 border-primary rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 min-h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
               <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Quick Register</h4>
               <button onClick={() => setIsAdding(false)} className="text-slate-300 hover:text-rose-500"><X size={20} /></button>
            </div>
            <div className="space-y-6 flex-1">
               <input 
                 autoFocus
                 className="w-full text-xl font-black text-slate-900 border-b-2 border-primary-100 outline-none pb-2 focus:border-primary transition-colors placeholder:text-slate-200"
                 placeholder="Product Name..."
                 value={newProduct.name}
                 onChange={e => setNewProduct({...newProduct, name: e.target.value})}
               />
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unit</label>
                    <select 
                      className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-primary-100"
                      value={newProduct.unit}
                      onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                    >
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Min. Goal</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-primary-100"
                      value={newProduct.minStockLevel}
                      onChange={e => setNewProduct({...newProduct, minStockLevel: Number(e.target.value)})}
                    />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cost €</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-primary-100"
                      value={newProduct.costPrice}
                      onChange={e => setNewProduct({...newProduct, costPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sale €</label>
                    <input 
                      type="number"
                      className="w-full bg-primary-50 rounded-2xl px-4 py-3 text-sm font-black text-primary outline-none focus:ring-2 focus:ring-primary-200"
                      value={newProduct.sellingPrice}
                      onChange={e => setNewProduct({...newProduct, sellingPrice: Number(e.target.value)})}
                    />
                  </div>
               </div>
            </div>
            <button 
              onClick={handleSaveNew}
              disabled={!newProduct.name}
              className="w-full py-4 bg-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 disabled:opacity-30 transition-all mt-8"
            >
              Confirm Creation
            </button>
          </div>
        )}

        {filtered.map(p => (
          <ProductCard key={p.id} product={p} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
};

export default Products;
