
import React, { useState } from 'react';
import { ArrowRightLeft, Warehouse, Store, Plus, Calendar, Package } from 'lucide-react';
import { db } from '../db';
import { User, StockTransfer } from '../types';

const Transfers = ({ user }: { user: User }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const products = db.getProducts();
  const stores = db.getStores();
  const transfers = db.getTransfers();
  const stock = db.getStock();

  const [newTransfer, setNewTransfer] = useState({
    productId: '',
    quantity: 1,
    fromStoreId: 'central',
    toStoreId: stores.find(s => s.id !== 'central')?.id || ''
  });

  const handleTransfer = () => {
    if (newTransfer.productId && newTransfer.quantity > 0) {
      const transfer: StockTransfer = {
        id: `tr_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        ...newTransfer
      };
      db.addTransfer(transfer);
      setModalOpen(false);
      window.location.reload(); // Refresh to show new stock
    }
  };

  const getStoreName = (id: string) => stores.find(s => s.id === id)?.name || id;
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || id;

  const getCentralStock = (productId: string) => {
    return stock.find(s => s.productId === productId && s.storeId === 'central')?.quantity || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock Transfers</h1>
          <p className="text-slate-500">Move goods from Central Warehouse to Retail Stores.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-blue-700 shadow-sm"
        >
          <Plus size={20} /> Create Transfer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Transfer History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Qty</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.sort((a,b) => b.date.localeCompare(a.date)).map(tr => (
                  <tr key={tr.id} className="text-sm">
                    <td className="px-6 py-4 text-slate-500 font-medium">{tr.date}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{getProductName(tr.productId)}</td>
                    <td className="px-6 py-4 font-bold text-blue-600">{tr.quantity}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft size={12} className="text-slate-300" />
                        <span className="text-slate-700">{getStoreName(tr.toStoreId)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">No transfers recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Warehouse Status</h3>
            <div className="space-y-4">
              {products.map(p => (
                <div key={p.id} className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-slate-700">{p.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{getCentralStock(p.id)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">New Transfer</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Source (Fixed)</label>
                <div className="w-full bg-slate-100 rounded-lg px-4 py-3 flex items-center gap-3 border border-slate-200">
                  <Warehouse className="text-blue-600" size={18} />
                  <span className="font-bold text-slate-700">Central Warehouse</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination Store</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={newTransfer.toStoreId}
                  onChange={e => setNewTransfer({...newTransfer, toStoreId: e.target.value})}
                >
                  {stores.filter(s => s.id !== 'central').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Product</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={newTransfer.productId}
                  onChange={e => setNewTransfer({...newTransfer, productId: e.target.value})}
                >
                  <option value="">Choose a product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {getCentralStock(p.id)})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity to Transfer</label>
                <input 
                  type="number" 
                  min="1"
                  max={newTransfer.productId ? getCentralStock(newTransfer.productId) : 100}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={newTransfer.quantity}
                  onChange={e => setNewTransfer({...newTransfer, quantity: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 font-bold text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button 
                onClick={handleTransfer}
                disabled={!newTransfer.productId || newTransfer.quantity <= 0}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all disabled:opacity-50"
              >
                Execute Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfers;
