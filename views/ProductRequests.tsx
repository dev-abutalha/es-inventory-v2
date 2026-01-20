
import React, { useState, useMemo, useRef } from 'react';
import { ClipboardList, Plus, Image as ImageIcon, X, Check, FileText, AlertCircle, Trash2, Camera, List, Maximize2, Search } from 'lucide-react';
import { db } from '../db';
import { User, UserRole, RequestStatus, ProductRequest, ProductRequestItem } from '../types';

const UNIT_OPTIONS = ['pcs', 'kg', 'lb', 'box', 'pack', 'liter', 'meter'];

const ProductRequests = ({ user }: { user: User }) => {
  const [requests, setRequests] = useState(db.getRequests());
  const [isModalOpen, setModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<ProductRequest | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [requestMode, setRequestMode] = useState<'list' | 'image'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user.role === UserRole.ADMIN;
  const stores = db.getStores();

  const [newRequest, setNewRequest] = useState({
    items: [{ description: '', quantity: 1, unit: 'pcs' }] as ProductRequestItem[],
    receiptImage: '',
    note: ''
  });

  const filteredRequests = useMemo(() => {
    const list = isAdmin ? requests : requests.filter(r => r.storeId === user.assignedStoreId);
    return list.sort((a,b) => b.date.localeCompare(a.date));
  }, [requests, isAdmin, user.assignedStoreId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRequest({ ...newRequest, receiptImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNewRequest({...newRequest, receiptImage: ''});
    // Reset file input value so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addItem = () => {
    setNewRequest({...newRequest, items: [...newRequest.items, { description: '', quantity: 1, unit: 'pcs' }]});
  };

  const updateItem = (idx: number, field: keyof ProductRequestItem, val: any) => {
    const items = [...newRequest.items];
    items[idx] = { ...items[idx], [field]: val };
    setNewRequest({...newRequest, items});
  };

  const handleSave = () => {
    const req: ProductRequest = {
      id: `req_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      storeId: user.assignedStoreId || 'central',
      items: requestMode === 'list' && newRequest.items.some(i => i.description) ? newRequest.items : undefined,
      receiptImage: requestMode === 'image' ? newRequest.receiptImage : undefined,
      status: RequestStatus.PENDING,
      note: newRequest.note
    };
    db.addRequest(req);
    setRequests(db.getRequests());
    setModalOpen(false);
    setNewRequest({ items: [{ description: '', quantity: 1, unit: 'pcs' }], receiptImage: '', note: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateStatus = (req: ProductRequest, status: RequestStatus) => {
    db.updateRequest({ ...req, status });
    setRequests(db.getRequests());
    if (viewRequest?.id === req.id) {
        setViewRequest({ ...req, status });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Supply Requests</h1>
          <p className="text-slate-500 font-medium">Request stock from the Hub via photo or itemized list.</p>
        </div>
        {!isAdmin && (
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-primary text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95"
          >
            <Plus size={20} /> Create Request
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.map(req => (
          <div key={req.id} 
               onClick={() => setViewRequest(req)}
               className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:border-primary-200 transition-all cursor-pointer">
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{req.date}</p>
                    <p className="text-lg font-black text-slate-900 leading-none">{stores.find(s => s.id === req.storeId)?.name}</p>
                 </div>
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    req.status === RequestStatus.PENDING ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    req.status === RequestStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-rose-50 text-rose-600 border-rose-100'
                 }`}>
                    {req.status}
                 </span>
              </div>

              <div className="space-y-2 mb-4">
                 {req.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-1 text-xs font-bold text-slate-600">
                       <span className="truncate max-w-[150px]">{item.description}</span>
                       <span className="text-slate-400 font-black shrink-0">{item.quantity} {item.unit}</span>
                    </div>
                 ))}
                 {(req.items?.length || 0) > 3 && (
                    <p className="text-[10px] font-black text-primary uppercase">+{req.items!.length - 3} more items...</p>
                 )}
                 
                 {req.receiptImage && (
                    <div className="w-full h-32 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center overflow-hidden relative group/img">
                       <img src={req.receiptImage} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <Search size={20} className="text-white" />
                       </div>
                    </div>
                 )}
              </div>

              {req.note && (
                <div className="p-4 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-500 border border-slate-100 truncate">
                   {req.note}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50/50 text-center border-t border-slate-50">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest group-hover:underline">View Full Details</p>
            </div>
          </div>
        ))}
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                    viewRequest.status === RequestStatus.PENDING ? 'bg-amber-100 text-amber-600' :
                    viewRequest.status === RequestStatus.APPROVED ? 'bg-emerald-100 text-emerald-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-none">Request Details</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {stores.find(s => s.id === viewRequest.storeId)?.name} • {viewRequest.date}
                    </p>
                  </div>
                </div>
                <button onClick={() => setViewRequest(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Items Requested</h3>
                        <div className="space-y-2">
                            {viewRequest.items ? (
                                viewRequest.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="font-bold text-slate-800">{item.description}</span>
                                        <span className="font-black text-primary text-sm">{item.quantity} {item.unit}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs font-bold text-slate-400 italic bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                                    No itemized list provided. Refer to snapshot.
                                </p>
                            )}
                        </div>
                    </div>

                    {viewRequest.note && (
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Request Note</h3>
                            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 text-sm font-bold text-amber-900 leading-relaxed">
                                {viewRequest.note}
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Reference Snapshot</h3>
                    {viewRequest.receiptImage ? (
                        <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-md group bg-slate-50 p-2">
                            <img src={viewRequest.receiptImage} className="w-full h-auto max-h-[400px] object-contain rounded-2xl" />
                            <button 
                                onClick={() => setZoomedImage(viewRequest.receiptImage!)}
                                className="absolute bottom-4 right-4 p-4 bg-primary text-white shadow-2xl rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-primary-600 transition-all active:scale-95"
                            >
                                <Maximize2 size={18} /> Tap to Zoom
                            </button>
                        </div>
                    ) : (
                        <div className="h-[300px] bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center text-slate-300">
                            <ImageIcon size={48} className="mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No photo provided</p>
                        </div>
                    )}
                </div>
             </div>

             {isAdmin && viewRequest.status === RequestStatus.PENDING && (
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                    <button onClick={() => updateStatus(viewRequest, RequestStatus.REJECTED)} className="flex-1 py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Reject Request</button>
                    <button onClick={() => updateStatus(viewRequest, RequestStatus.APPROVED)} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all">Approve Supply</button>
                </div>
             )}

             {viewRequest.status !== RequestStatus.PENDING && (
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-center shrink-0">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">This request was {viewRequest.status.toLowerCase()} on {viewRequest.date}</p>
                </div>
             )}
          </div>
        </div>
      )}

      {/* ZOOMED IMAGE LIGHTBOX */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-6" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-10 right-10 p-4 text-white hover:bg-white/10 rounded-full transition-all">
                <X size={40} />
            </button>
            <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300" />
            <p className="mt-8 text-white/50 font-black text-xs uppercase tracking-[0.3em]">Snapshot View • Click anywhere to exit</p>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary text-white rounded-2xl">
                    <ClipboardList size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Request Hub Supply</h2>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="flex bg-slate-100 p-1.5 rounded-3xl mb-8 w-fit mx-auto">
                    <button 
                      onClick={() => setRequestMode('list')}
                      className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${requestMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      <List size={16} /> Itemized List
                    </button>
                    <button 
                      onClick={() => setRequestMode('image')}
                      className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${requestMode === 'image' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      <Camera size={16} /> Snapshot Request
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Request Details</h3>
                      <div className="space-y-6">
                        {requestMode === 'image' ? (
                          <div className="space-y-4">
                            {newRequest.receiptImage ? (
                                <div className="relative w-full rounded-[3rem] overflow-hidden border-4 border-slate-100 shadow-lg bg-slate-50 min-h-[300px] flex items-center justify-center">
                                  <img src={newRequest.receiptImage} className="w-full h-auto max-h-[400px] object-contain" />
                                  <button 
                                    onClick={clearImage} 
                                    className="absolute top-4 right-4 p-3 bg-rose-500 text-white rounded-2xl shadow-xl hover:bg-rose-600 transition-all active:scale-95 z-20"
                                  >
                                    <X size={20} />
                                  </button>
                                </div>
                            ) : (
                                <button 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="w-full flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-[3rem] p-10 hover:bg-slate-50 hover:border-primary-300 transition-all min-h-[300px]"
                                >
                                  <div className="p-6 bg-primary-50 text-primary-400 rounded-[2rem] mb-4">
                                    <ImageIcon size={48} />
                                  </div>
                                  <span className="text-sm font-black text-slate-900 mb-1">Upload Photo of List</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Snap a photo of handwritten notes</span>
                                </button>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {newRequest.items.map((item, idx) => (
                              <div key={idx} className="flex gap-3 items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 group">
                                <input 
                                  className="flex-[2] bg-white border-none rounded-2xl px-4 py-3 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary-100" 
                                  placeholder="Item name..." 
                                  value={item.description} 
                                  onChange={e => updateItem(idx, 'description', e.target.value)} 
                                />
                                <div className="flex flex-1 items-center gap-1">
                                  <input 
                                    type="number" 
                                    className="w-full bg-white border-none rounded-2xl px-2 py-3 text-sm font-black text-center shadow-sm outline-none" 
                                    value={item.quantity} 
                                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} 
                                  />
                                  <select 
                                    className="bg-white border-none rounded-2xl px-2 py-3 text-[10px] font-black uppercase shadow-sm outline-none cursor-pointer"
                                    value={item.unit}
                                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                                  >
                                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                  </select>
                                </div>
                                <button onClick={() => setNewRequest({...newRequest, items: newRequest.items.filter((_, i) => i !== idx)})} className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"><X size={18} /></button>
                              </div>
                            ))}
                            <button onClick={addItem} className="w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:border-primary hover:text-primary transition-all">+ Add New Entry</button>
                          </div>
                        )}
                      </div>
                   </div>

                   <div className="flex flex-col">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Additional Notes</h3>
                      <textarea 
                        className="w-full flex-1 bg-slate-50 border-none rounded-[2.5rem] p-8 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-50 min-h-[200px]" 
                        placeholder="Any special instructions for the hub team?"
                        value={newRequest.note}
                        onChange={e => setNewRequest({...newRequest, note: e.target.value})}
                      />
                      <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center gap-4">
                        <AlertCircle className="text-primary shrink-0" size={24} />
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">Hub staff will be notified instantly and will review stock availability across all Barcelona locations.</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-4 font-black text-slate-400">Cancel</button>
                <button 
                  disabled={(requestMode === 'image' && !newRequest.receiptImage) || (requestMode === 'list' && !newRequest.items[0].description)}
                  onClick={handleSave} 
                  className="flex-3 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 disabled:opacity-50 active:scale-95 transition-all"
                >
                  Confirm & Submit Request
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductRequests;
