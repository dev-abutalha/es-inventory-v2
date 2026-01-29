import React, { useState, useEffect } from 'react';
import { Store, Plus, MapPin, X, Trash2, Edit2, UserCircle } from 'lucide-react';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [newStore, setNewStore] = useState({ name: '', location: '', managerId: '' });

  const isAdmin = user.role === UserRole.ADMIN;
  const managers = users.filter(u => u.role === UserRole.STORE_MANAGER);

  // Load data once
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [storesData, usersData] = await Promise.all([
          getStores(),
          getUsers(),
        ]);
        setStores(storesData);
        setUsers(usersData);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load stores/users');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingStore(null);
    setNewStore({ name: '', location: '', managerId: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (store: StoreType) => {
    const currentManager = managers.find(m => m.assignedStoreId === store.id);
    setEditingStore(store);
    setNewStore({ 
      name: store.name, 
      location: store.location, 
      managerId: currentManager?.id || '' 
    });
    setModalOpen(true);
  };

  const handleDeleteStore = async (id: string) => {
    if (id === 'central') {
      alert("Cannot delete Central Office.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this store?")) return;

    try {
      await deleteStore(id);
      setStores(await getStores());
      // Optional: refresh users if needed
      setUsers(await getUsers());
    } catch (err: any) {
      alert(err.message || 'Failed to delete store');
    }
  };

  const handleSaveStore = async () => {
    if (!newStore.name.trim()) {
      alert('Store name is required');
      return;
    }

    try {
      let storeId: string;

      if (editingStore) {
        storeId = editingStore.id;
        await updateStore({
          ...editingStore,
          name: newStore.name,
          location: newStore.location,
        });
      } else {
        const newStoreData = {
          name: newStore.name,
          location: newStore.location,
        };
        const created = await addStore(newStoreData);
        storeId = created.id;
      }

      // Handle manager assignment
      await assignManagerToStore(
        newStore.managerId || null,
        storeId
      );

      // Refresh data
      setStores(await getStores());
      setUsers(await getUsers());
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save store');
    }
  };

  const getStoreManager = (storeId: string) => {
    return users.find(u => u.assignedStoreId === storeId && u.role === UserRole.STORE_MANAGER);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading stores...</div>;
  }

  if (errorMsg) {
    return <div className="p-8 text-center text-rose-600">{errorMsg}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Store Management</h1>
          <p className="text-slate-500">Configure your retail locations in Barcelona.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={handleOpenAdd}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-primary-700 shadow-sm transition-colors"
          >
            <Plus size={20} /> Add New Store
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map(store => {
          const manager = getStoreManager(store.id);
          return (
            <div 
              key={store.id} 
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-primary-200 transition-all flex flex-col group relative"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
                  <Store size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{store.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <MapPin size={14} className="text-slate-400" />
                    {store.location || 'Barcelona'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                  <UserCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Store Manager</p>
                  <p className="text-sm font-semibold text-slate-700">{manager ? manager.name : 'Unassigned'}</p>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {store.id}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenEdit(store)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit Store"
                  >
                    <Edit2 size={16} />
                  </button>
                  {isAdmin && store.id !== 'central' && (
                    <button 
                      onClick={() => handleDeleteStore(store.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Store"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {editingStore ? 'Edit Store Details' : 'Add New Store'}
              </h2>
              <button onClick={() => setModalOpen(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Store Name</label>
                <input 
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400" 
                  placeholder="e.g. Store Barceloneta"
                  value={newStore.name}
                  onChange={e => setNewStore({...newStore, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location / District</label>
                <input 
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400" 
                  placeholder="e.g. Carrer de la Marina"
                  value={newStore.location}
                  onChange={e => setNewStore({...newStore, location: e.target.value})}
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Manager</label>
                  <select 
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={newStore.managerId}
                    onChange={e => setNewStore({...newStore, managerId: e.target.value})}
                  >
                    <option value="">No Manager Assigned</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.assignedStoreId && m.assignedStoreId !== editingStore?.id 
                          ? ` (Current: ${stores.find(s => s.id === m.assignedStoreId)?.name})` 
                          : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400 italic">
                    Assigning a manager will remove them from their previous store.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setModalOpen(false)} 
                className="flex-1 py-2 font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveStore} 
                className="flex-1 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary-700 transition-colors"
              >
                {editingStore ? 'Update Store' : 'Create Store'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;