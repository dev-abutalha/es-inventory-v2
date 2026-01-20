
import React, { useState, useMemo } from 'react';
import { Package, Search, Filter } from 'lucide-react';
import { db } from '../db';
import { User, UserRole } from '../types';

const Inventory = ({ user }: { user: User }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>(user.role === UserRole.ADMIN ? 'all' : (user.assignedStoreId || 'all'));

  const stores = db.getStores();
  const products = db.getProducts();
  const stock = db.getStock();

  const isAdmin = user.role === UserRole.ADMIN;

  const filteredStock = useMemo(() => {
    return products.map(product => {
      const productStock = stock.filter(s => s.productId === product.id);
      let relevantStock = selectedStore === 'all' 
        ? productStock.reduce((acc, s) => acc + s.quantity, 0)
        : productStock.find(s => s.storeId === selectedStore)?.quantity || 0;

      return { ...product, totalStock: relevantStock };
    }).filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, stock, searchTerm, selectedStore]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search catalog..." 
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-50 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <Filter size={18} className="text-slate-400 ml-2" />
            <select 
              className="flex-1 bg-transparent border-none outline-none font-bold text-slate-900 text-sm"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="all">All Store Locations</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStock.map(item => (
                <tr key={item.id}>
                  <td className="px-8 py-5 font-bold text-slate-900">{item.name}</td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      item.totalStock <= 0 ? 'bg-rose-50 text-rose-600' :
                      item.totalStock < item.minStockLevel ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {item.totalStock <= 0 ? 'Out' : item.totalStock < item.minStockLevel ? 'Low' : 'OK'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 text-lg">
                    {item.totalStock} <span className="text-[10px] uppercase text-slate-400 font-normal">{item.unit || 'pcs'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredStock.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-lg font-black text-slate-900">{item.name}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                item.totalStock <= 0 ? 'bg-rose-50 text-rose-600' :
                item.totalStock < item.minStockLevel ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {item.totalStock <= 0 ? 'Out of Stock' : item.totalStock < item.minStockLevel ? 'Critical Low' : 'Adequate'}
              </span>
            </div>
            <div className="text-right">
               <p className="text-2xl font-black text-slate-900">{item.totalStock}</p>
               <p className="text-[9px] font-black text-slate-300 uppercase">{item.unit || 'pcs'} Available</p>
            </div>
          </div>
        ))}
        {filteredStock.length === 0 && <p className="text-center py-20 text-slate-400 font-bold italic">Stock catalog is empty.</p>}
      </div>
    </div>
  );
};

export default Inventory;
