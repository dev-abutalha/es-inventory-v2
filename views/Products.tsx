
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { db } from '../db';
import { Product, User } from '../types';

const Products = ({ user }: { user: User }) => {
  const [products, setProducts] = useState(db.getProducts());
  const [isModalOpen, setModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', costPrice: 0, sellingPrice: 0, minStockLevel: 5, unit: 'pcs'
  });

  const handleSave = () => {
    if (newProduct.name) {
      const p: Product = {
        id: `p_${Date.now()}`,
        ...(newProduct as Product)
      };
      const updated = [...products, p];
      setProducts(updated);
      db.save('rf_products', updated);
      setModalOpen(false);
      setNewProduct({ name: '', costPrice: 0, sellingPrice: 0, minStockLevel: 5, unit: 'pcs' });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? This will remove it from the central catalog.')) {
      db.deleteProduct(id);
      setProducts(db.getProducts());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Product Management</h1>
          <p className="text-slate-500">Configure your central product catalog and pricing.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-blue-700 shadow-sm"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cost (€)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Price (€)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Margin (%)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <tr key={p.id}>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.unit || 'pcs'}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-slate-600 font-medium">{p.costPrice.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-slate-900 font-bold">{p.sellingPrice.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-emerald-600 font-bold">
                    {p.sellingPrice > 0 ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(0) : '0'}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold">No products in catalog.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Add New Product</h2>
              <button onClick={() => setModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
                  <input 
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit</label>
                  <select 
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newProduct.unit}
                    onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                    <option value="box">box</option>
                    <option value="pack">pack</option>
                    <option value="liter">liter</option>
                    <option value="meter">meter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Stock Level</label>
                  <input 
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={newProduct.minStockLevel}
                    onChange={e => setNewProduct({...newProduct, minStockLevel: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Price (€)</label>
                  <input 
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={newProduct.costPrice}
                    onChange={e => setNewProduct({...newProduct, costPrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selling Price (€)</label>
                  <input 
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={newProduct.sellingPrice}
                    onChange={e => setNewProduct({...newProduct, sellingPrice: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg font-bold text-slate-600 hover:bg-white transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">Save Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
