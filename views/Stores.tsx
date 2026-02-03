import React, { useState, useEffect } from 'react';
import { Store, Plus, MapPin, X, Trash2, Edit2, UserCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { 
  getStores, 
  addStore, 
  updateStore, 
  deleteStore 
} from '../src/services/stores.service';
import { 
  getUsers, 
  assignManagerToStore 
} from '../src/services/users.service';
import { User, Store as StoreType, UserRole } from '../types';

const Stores = ({ user }: { user: User }) => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // New loader state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [newStore, setNewStore] = useState({ name: '', location: '', managerId: '', is_central: false });

  const isAdmin = user.role === UserRole.ADMIN;
  const managers = users.filter(u => u.role === UserRole.STORE_MANAGER);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [storesData, usersData] = await Promise.all([
        getStores(),
        getUsers(),
      ]);

      // SORTING: Push is_central stores to the front of the array
      const sortedStores = [...storesData].sort((a: any, b: any) => {
        if (a.is_central && !b.is_central) return -1;
        if (!a.is_central && b.is_central) return 1;
        return 0;
      });

      setStores(sortedStores);
      setUsers(usersData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load stores/users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStore(null);
    setNewStore({ name: '', location: '', managerId: '', is_central: false });
    setModalOpen(true);
  };

  const handleOpenEdit = (store: StoreType) => {
    const currentManager = managers.find(m => m.assigned_store_id === store.id);
    setEditingStore(store);
    setNewStore({ 
      name: store.name, 
      location: store.location, 
      managerId: currentManager?.id || '',
      is_central: (store as any).is_central || false 
    });
    setModalOpen(true);
  };

  const handleSaveStore = async () => {
    if (!newStore.name.trim()) {
      alert('Store name is required');
      return;
    }

    try {
      setIsSaving(true); // START LOADER
      let storeId: string;

      if (editingStore) {
        storeId = editingStore.id;
        await updateStore({
          ...editingStore,
          name: newStore.name,
          location: newStore.location,
          is_central: newStore.is_central 
        } as any);
      } else {
        const created = await addStore({
          name: newStore.name,
          location: newStore.location,
          is_central: newStore.is_central
        } as any);
        storeId = created.id;
      }

      await assignManagerToStore(newStore.managerId || null, storeId);
      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save store');
    } finally {
      setIsSaving(false); // STOP LOADER
    }
  };

  const getStoreManager = (storeId: string) => {
    return users.find(u => u.assigned_store_id === storeId && u.role === UserRole.STORE_MANAGER);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading Network...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Store Management</h1>
          <p className="text-slate-500 font-medium">Configure retail locations and identify the Central Hub.</p>
        </div>
        {isAdmin && (
          <button onClick={handleOpenAdd} className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-primary-700 shadow-lg shadow-primary/20 transition-all">
            <Plus size={20} /> Add New Store
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map(store => {
          const manager =  getStoreManager(store.id);
          const isCentral = (store as any).is_central;

          return (
            <div key={store.id} className={`bg-white p-6 rounded-[2rem] border-2 transition-all flex flex-col group relative ${isCentral ? 'border-amber-200 shadow-amber-200 ' : 'border-slate-100 '}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-2xl ${isCentral ? 'bg-amber-100 text-amber-600' : 'bg-primary-50 text-primary-600'}`}>
                  <Store size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{store.name}</h3>
                    {isCentral && (
                      <span className="flex items-center gap-1 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        <ShieldCheck size={10} /> Central
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                    <MapPin size={12} /> {store.location || 'Barcelona'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-300 border border-slate-100">
                  <UserCircle size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manager</p>
                  <p className="text-sm font-black text-slate-700">{manager ? manager.name : 'Unassigned'}</p>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-300 uppercase">ID: {store.id.toString().slice(-6)}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(store)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                  {isAdmin && !isCentral && (
                    <button onClick={() => deleteStore(store.id).then(loadData)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingStore ? 'Edit Store' : 'New Store'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Store Name</label>
                <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={newStore.name} onChange={e => setNewStore({...newStore, name: e.target.value})} disabled={isSaving} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
                <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={newStore.location} onChange={e => setNewStore({...newStore, location: e.target.value})} disabled={isSaving} />
              </div>

              {/* Hub Toggle */}
              <div className={`p-5 rounded-[1.5rem] flex items-center justify-between transition-all ${newStore.is_central ? 'bg-amber-50 ring-2 ring-amber-200' : 'bg-slate-50'}`}>
                <div className="flex gap-3 items-center">
                  <ShieldCheck className={newStore.is_central ? 'text-amber-500' : 'text-slate-300'} />
                  <div>
                    <p className={`text-sm font-black ${newStore.is_central ? 'text-amber-700' : 'text-slate-600'}`}>Central Hub Status</p>
                    <p className="text-[10px] font-bold text-slate-400">Only one store can be central.</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  className="w-6 h-6 rounded-lg accent-amber-500 cursor-pointer" 
                  checked={newStore.is_central} 
                  onChange={e => setNewStore({...newStore, is_central: e.target.checked})} 
                  disabled={isSaving}
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Assign Manager</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-primary/10" value={newStore.managerId} onChange={e => setNewStore({...newStore, managerId: e.target.value})} disabled={isSaving}>
                    <option value="">No Manager Assigned</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 flex gap-4">
              <button 
                onClick={() => setModalOpen(false)} 
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveStore} 
                disabled={isSaving}
                className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  editingStore ? 'Update Details' : 'Launch Store'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;