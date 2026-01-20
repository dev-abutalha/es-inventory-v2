
import React, { useState } from 'react';
import { UserPlus, Edit2, Trash2, Shield, X, Users as UsersIcon } from 'lucide-react';
import { db } from '../db';
import { User, UserRole } from '../types';

const Users = () => {
  const [users, setUsers] = useState(db.getUsers());
  const stores = db.getStores();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    name: '',
    password: '',
    role: UserRole.STORE_MANAGER,
    assignedStoreId: ''
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      password: '',
      role: UserRole.STORE_MANAGER,
      assignedStoreId: stores.find(s => s.id !== 'central')?.id || ''
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (formData.username && formData.password && formData.name) {
      if (editingUser) {
        const updated = { ...editingUser, ...formData } as User;
        db.updateUser(updated);
      } else {
        const newUser: User = {
          id: `u_${Date.now()}`,
          ...(formData as User)
        };
        db.addUser(newUser);
      }
      setUsers(db.getUsers());
      setModalOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      db.deleteUser(id);
      setUsers(db.getUsers());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">Manage staff accounts and store assignments.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-primary-700 shadow-sm transition-colors"
        >
          <UserPlus size={20} /> Add Staff Account
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Store</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {u.name[0]}
                    </div>
                    <span className="font-bold text-slate-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-sm">{u.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' : 'bg-primary-50 text-primary-600'
                  }`}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {u.role === UserRole.ADMIN ? 'All Access' : (stores.find(s => s.id === u.assignedStoreId)?.name || 'N/A')}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingUser(u);
                        setFormData({ ...u });
                        setModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      disabled={u.id === 'u_admin'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Add New Staff'}</h2>
              <button onClick={() => setModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input 
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400" 
                  value={formData.name}
                  placeholder="e.g. Maria García"
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                  <input 
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400" 
                    value={formData.username}
                    placeholder="Username"
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                  <input 
                    type="password"
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400" 
                    value={formData.password}
                    placeholder="••••••••"
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                <select 
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.STORE_MANAGER}>Store Manager</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                </select>
              </div>
              {formData.role === UserRole.STORE_MANAGER && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign to Store</label>
                  <select 
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={formData.assignedStoreId}
                    onChange={e => setFormData({...formData, assignedStoreId: e.target.value})}
                  >
                    {stores.filter(s => s.id !== 'central').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 font-bold text-slate-600">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary-700 transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
