
import React, { useState, useMemo, useRef } from 'react';
import { Plus, CreditCard, Trash2, Edit2, X, Download, Package, Image as ImageIcon, Check, ListChecks } from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { db } from '../db';
import { User, Purchase, PurchaseItem } from '../types';
import DateRangePicker from '../components/DateRangePicker';
import CalendarPicker from '../components/CalendarPicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '@/src/services/suppliers.service';
import { createPurchase, getPurchases } from '@/src/services/purchase.service';
import toast from 'react-hot-toast';

const UNIT_OPTIONS = ['pcs', 'kg', 'box', 'lb', 'pack', 'liter', 'meter', 'unit'];

const Purchases = ({ user }: { user: User }) => {
  const [purchases, setPurchases] = useState(db.getPurchases());
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickEntry, setQuickEntry] = useState(false);
  const stores = db.getStores();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: suppliersData, isLoading: isSupplierLoading } = useQuery({
    queryKey: ['Supplier'],
    queryFn: () => {
      return supplierService.getSuppliers();
    },
  })

  const { data: purchaseData, isLoading: isPurchaseLoading } = useQuery({
    queryKey: ['Purchase'],
    queryFn: () => {
      return getPurchases();
    },
  })



  const { mutate: addPurchase, isPending } = useMutation({
    mutationFn: createPurchase,
    onSuccess: (res) => {
      if (res?.id) {
        toast.success('Purchase added successfully');
        setModalOpen(false);
      } else {
        toast.error('Failed to add purchase');
      }

      queryClient.invalidateQueries({
        queryKey: ["Purchase"],
      });
    },
  });




  // console.log(suppliersData);

  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const initialForm = {
    date: format(new Date(), 'yyyy-MM-dd'),
    isQuickEntry: false,
    receiptImage: '',
    items: [{ description: '', quantity: 1, unit: 'pcs', cost: 0, sellingPrice: 0 }] as PurchaseItem[],
    totalCost: 0
  };

  const [newPurchase, setNewPurchase] = useState(initialForm);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => p.date >= dateFrom && p.date <= dateTo)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, dateFrom, dateTo]);

  const totalCost = useMemo(() => filteredPurchases.reduce((a, s) => a + s.total_cost, 0), [filteredPurchases]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewPurchase(initialForm);
    setQuickEntry(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Purchase) => {
    setEditingId(p.id);
    setQuickEntry(p.is_quick_entry || false);
    setNewPurchase({
      date: p.date,
      isQuickEntry: p.is_quick_entry || false,
      receiptImage: p.receipt_image || '',
      items: p.purchase_items ? JSON.parse(JSON.stringify(p.purchase_items)) : [],
      totalCost: p.total_cost
    });
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPurchase({ ...newPurchase, receiptImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNewPurchase({ ...newPurchase, receiptImage: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this purchase record permanently?')) {
      db.deletePurchase(id);
      setPurchases(db.getPurchases());
    }
  };

  const handleAddItem = () => {
    setNewPurchase({
      ...newPurchase,
      items: [...(newPurchase.items || []), { description: '', quantity: 1, unit: 'pcs', cost: 0, sellingPrice: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    setNewPurchase({
      ...newPurchase,
      items: (newPurchase.items || []).filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    const updatedItems = [...(newPurchase.items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewPurchase({ ...newPurchase, items: updatedItems });
  };
  console.log('newPurchase', purchaseData);
  const handleSave = () => {
    const totalCostValue = quickEntry
      ? newPurchase.totalCost
      : (newPurchase.items || []).reduce((acc, item) => acc + (item.quantity * item.cost), 0);

    const purchase: Purchase = {
      date: newPurchase.date,
      total_cost: totalCostValue,
      receipt_image: newPurchase.receiptImage,
      is_quick_entry: quickEntry,
      purchase_items: quickEntry ? undefined : newPurchase.items
    };

    if (editingId) {
      db.updatePurchase(purchase);
    } else {
      // db.addPurchase(purchase);
      addPurchase(purchase);
      console.log('purchase', purchase);
    }

    setPurchases(db.getPurchases());
    setNewPurchase(initialForm);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 pb-24 relative overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Purchases</h1>
          <p className="text-slate-500 font-medium">Bulk supply acquisition.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none bg-primary text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-black hover:bg-primary-700 shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            <Plus size={20} /> Add Purchase
          </button>
        </div>
      </div>

      <DateRangePicker from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />

      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {purchaseData?.map((purchase) => (
                purchase.purchase_items?.map((item: any, idx) => (
                  <tr key={`${purchase.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                    {/* Date */}
                    <td className="px-8 py-5 text-slate-900 font-bold text-sm whitespace-nowrap">
                      {new Date(purchase.date).toLocaleDateString()}
                    </td>

                    {/* Supplier */}
                    <td className="px-8 py-5 font-bold text-slate-700">
                      {item.product.supplier}
                    </td>

                    {/* Product Name */}
                    <td className="px-8 py-5 font-bold text-slate-700">
                      {item.product.name}
                    </td>

                    {/* Quantity */}
                    <td className="px-8 py-5 text-slate-900 font-semibold">
                      {item.quantity}
                    </td>

                    {/* Unit */}
                    <td className="px-8 py-5 text-slate-500 font-medium uppercase text-xs">
                      {item.product.unit}
                    </td>

                    {/* Unit Price */}
                    <td className="px-8 py-5 text-right font-bold text-slate-700">
                      €{item.product.cost_price.toFixed(2)}
                    </td>

                    {/* Total Cost */}
                    <td className="px-8 py-5 text-right font-black text-slate-900 text-lg whitespace-nowrap">
                      €{(item.product.cost_price * item.quantity).toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="px-8 py-5">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(purchase)}
                          className="p-2 text-slate-400 hover:text-primary transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-black text-slate-900">Purchase Entry</h2>
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setQuickEntry(false)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!quickEntry ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                  >
                    Itemized
                  </button>
                  <button
                    onClick={() => setQuickEntry(true)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${quickEntry ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                  >
                    Quick Receipt
                  </button>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CalendarPicker label="Date" value={newPurchase.date} onChange={v => setNewPurchase({ ...newPurchase, date: v })} />
                {/* <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Store</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 outline-none font-bold" value={newPurchase.storeId} onChange={e => setNewPurchase({ ...newPurchase, storeId: e.target.value })}>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div> */}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Receipt Image / Photo</label>
                  <div className="space-y-4">
                    {newPurchase.receiptImage ? (
                      <div className="relative w-full h-full min-h-[300px] rounded-[2.5rem] overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center">
                        <img src={newPurchase.receiptImage} className="w-full h-auto max-h-[400px] object-contain" />
                        <button onClick={clearImage} className="absolute top-4 right-4 p-3 bg-rose-500 text-white rounded-2xl shadow-xl z-10"><X size={20} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 hover:bg-slate-50 hover:border-primary-300 transition-all min-h-[300px]"
                      >
                        <div className="w-20 h-20 bg-primary-50 text-primary-400 rounded-[2rem] flex items-center justify-center mb-4">
                          <ImageIcon size={40} />
                        </div>
                        <span className="text-sm font-black text-slate-900 mb-1">Upload Receipt Photo</span>
                        <span className="text-xs font-bold text-slate-400">PNG, JPG or PDF supported</span>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>
                </div>

                <div>
                  {quickEntry ? (
                    <div className="space-y-6">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Quick Pricing</h3>
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Total Amount Paid (€)</label>
                        <input
                          type="number"
                          className="w-full bg-white border-none rounded-3xl px-6 py-8 text-4xl font-black text-primary outline-none shadow-sm placeholder:text-slate-200"
                          placeholder="0.00"
                          value={newPurchase.totalCost || ''}
                          onChange={e => setNewPurchase({ ...newPurchase, totalCost: Number(e.target.value) })}
                        />
                        <p className="mt-4 text-xs font-medium text-slate-400">Use this for fast entry when you have a receipt photo but don't need to list individual items.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Itemized Inventory</h3>
                        <button onClick={handleAddItem} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-primary/20">+ Add Item</button>
                      </div>
                      <div className="space-y-3">
                        {newPurchase.items?.map((item, idx) => (
                          <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-slate-50 p-5 rounded-3xl border border-slate-100">
                            <div className="flex-[3] min-w-[150px]">
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Description</label>
                              <input className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold shadow-sm" placeholder="Item Name" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} />
                            </div>
                            <div className="flex-1 min-w-[80px]">
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Supplier</label>
                              <select
                                className="w-full bg-white border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase shadow-sm outline-none"
                                value={item.supplier}
                                onChange={e => handleItemChange(idx, 'supplier', e.target.value)}
                              >
                                {suppliersData?.map(u => <option key={u?.id} value={u?.name}>{u?.name}</option>)}
                              </select>
                            </div>
                            <div className="flex-1 min-w-[80px]">
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Qty</label>
                              {/* Fixed: Wrapped in an arrow function to access 'e' and pass parameters to handleItemChange correctly */}
                              <input type="number" className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold shadow-sm" placeholder="0" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} />
                            </div>
                            <div className="flex-1 min-w-[80px]">
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Unit</label>
                              <select
                                className="w-full bg-white border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase shadow-sm outline-none"
                                value={item.unit}
                                onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                              >
                                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            <div className="flex-1 min-w-[80px]">
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cost (€)</label>
                              {/* Fixed: Wrapped in an arrow function to access 'e' and pass parameters to handleItemChange correctly */}
                              <input type="number" className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold shadow-sm" placeholder="0.00" value={item.cost} onChange={e => handleItemChange(idx, 'cost', Number(e.target.value))} />
                            </div>
                            <div className="flex-1 min-w-[80px]">
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Selling Price (€)</label>
                              {/* Fixed: Wrapped in an arrow function to access 'e' and pass parameters to handleItemChange correctly */}
                              <input type="number" className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-bold shadow-sm" placeholder="0.00" value={item.sellingPrice} onChange={e => handleItemChange(idx, 'sellingPrice', Number(e.target.value))} />
                            </div>
                            <button onClick={() => handleRemoveItem(idx)} className="p-3 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors shrink-0 mb-1"><Trash2 size={18} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
              <div className="text-center sm:text-left">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Calculated Total</p>
                <p className="text-4xl font-black text-slate-900">€{(quickEntry ? newPurchase.totalCost : (newPurchase.items || []).reduce((a, i) => a + (i.quantity * i.cost), 0)).toFixed(2)}</p>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button onClick={() => setModalOpen(false)} className="flex-1 sm:flex-none py-4 px-8 font-black text-slate-400">Cancel</button>
                <button
                  disabled={isPending}
                  onClick={handleSave}
                  className="flex-1 sm:flex-none py-4 px-10 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {
                    isPending
                      ? 'Saving...'
                      : 'Save Purchase Record'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
