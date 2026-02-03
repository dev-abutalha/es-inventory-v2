import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Mail, Phone, MapPin, 
  Trash2, Edit3, Globe, Building2, X, Check 
} from 'lucide-react';
import { supplierService } from '../src/services/suppliers.service';
import { Supplier } from '../types';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    category: 'General'
  });

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await supplierService.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error("Error loading suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supplierService.createSupplier(formData);
      setIsModalOpen(false);
      setFormData({ name: '', contact_person: '', email: '', phone: '', address: '', category: 'General' });
      loadSuppliers();
    } catch (err) {
      alert("Error saving supplier");
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 font-black text-slate-400 animate-pulse">Loading Partners...</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Supplier Network</h1>
          <p className="text-slate-500 font-medium">Manage your supply chain and vendor contacts.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl hover:bg-primary transition-all active:scale-95"
        >
          <Plus size={20} /> Add New Supplier
        </button>
      </div>

      {/* SEARCH */}
      <div className="relative max-w-md">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search by name or category..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-primary-50 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* SUPPLIER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-primary-200 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-slate-50 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary rounded-2xl transition-colors">
                <Building2 size={24} />
              </div>
              <span className="px-4 py-1.5 bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-full">
                {supplier.category || 'General'}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-1">{supplier.name}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{supplier.contact_person || 'No Contact Person'}</p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={16} className="text-slate-300" />
                <span className="text-sm font-medium">{supplier.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={16} className="text-slate-300" />
                <span className="text-sm font-medium">{supplier.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={16} className="text-slate-300" />
                <span className="text-sm font-medium truncate">{supplier.address || 'No address set'}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-50">
              <button className="flex-1 py-3 px-4 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-xl transition-all flex items-center justify-center gap-2">
                <Edit3 size={16} /> <span className="text-[10px] font-black uppercase">Edit</span>
              </button>
              <button 
                onClick={async () => {
                  if(confirm('Delete supplier?')) {
                    await supplierService.deleteSupplier(supplier.id);
                    loadSuppliers();
                  }
                }}
                className="py-3 px-4 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 uppercase">New Partner</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Company Name</label>
                  <input required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-primary-50" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Contact Person</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-primary-50" 
                    value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Category</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-primary-50"
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>General</option>
                    <option>Fruits/Veg</option>
                    <option>Packaging</option>
                    <option>Dairy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Email</label>
                  <input type="email" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-primary-50" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Phone</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-primary-50" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Address</label>
                <textarea rows={2} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-primary-50" 
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-200">
                Register Supplier
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;