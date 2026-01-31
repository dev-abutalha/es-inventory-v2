
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Receipt, 
  BarChart3, 
  LogOut,
  Store,
  CreditCard,
  Users as UsersIcon,
  MoreHorizontal,
  PackageCheck,
  ClipboardList,
  Trash2,
  Package
} from 'lucide-react';
import { db } from './db';
import { User, UserRole } from './types';

// Views
import Dashboard from './views/Dashboard';
import Stores from './views/Stores';
import Purchases from './views/Purchases';
import Sales from './views/Sales';
import Expenses from './views/Expenses';
import Reports from './views/Reports';
import Users from './views/Users';
import Login from './views/Login';
import Assignment from './views/Assignment';
import ProductRequests from './views/ProductRequests';
import Wastage from './views/Wastage';
import StockManagement from './views/StockManagement';

const NavItem = ({ to, icon: Icon, label, active, onClick }: any) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' 
        : 'text-slate-600 hover:bg-slate-100 font-medium'
    }`}
  >
    <Icon size={20} />
    <span className="text-sm">{label}</span>
  </Link>
);

const BottomTab = ({ to, icon: Icon, label, active }: any) => (
  <Link
    to={to}
    className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-all ${
      active ? 'text-primary' : 'text-slate-400'
    }`}
  >
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[10px] font-black uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </Link>
);

const Sidebar = ({ isOpen, setOpen, user, onLogout }: any) => {
  const location = useLocation();
  const isSuperAdmin = user.role === UserRole.ADMIN;
  const isCentralAdmin = user.role === UserRole.CENTRAL_ADMIN;
  const isAnyAdmin = isSuperAdmin || isCentralAdmin;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-slate-100 z-[70] transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 px-2">
              <img className="w-[150px] " src="https://esnaturalbarcelona.com/wp-content/uploads/2025/03/logo_esnatural_low.webp" alt="" srcset="" />
          </div>

          <nav className="flex flex-col gap-1.5 flex-1 custom-scrollbar overflow-y-auto pr-2">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} onClick={() => setOpen(false)} />
            
            <div className="mt-6 mb-2 px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Operations</div>
            
            {(isSuperAdmin || user.role === UserRole.STORE_MANAGER) && (
              <NavItem to="/sales" icon={ShoppingCart} label="Sales" active={location.pathname === '/sales'} onClick={() => setOpen(false)} />
            )}
            
            {isSuperAdmin && (
              <NavItem to="/purchases" icon={CreditCard} label="Purchases" active={location.pathname === '/purchases'} onClick={() => setOpen(false)} />
            )}

            <NavItem to="/requests" icon={ClipboardList} label="Product Requests" active={location.pathname === '/requests'} onClick={() => setOpen(false)} />
            <NavItem to="/wastage" icon={Trash2} label="Wastage (Mermas)" active={location.pathname === '/wastage'} onClick={() => setOpen(false)} />
            
            {isAnyAdmin && (
              <>
                <div className="mt-8 mb-2 px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Logistics Hub</div>
                <NavItem to="/assignment" icon={PackageCheck} label="Assign to Store" active={location.pathname === '/assignment'} onClick={() => setOpen(false)} />
                <NavItem to="/stock" icon={Package} label="Stock Management" active={location.pathname === '/stock'} onClick={() => setOpen(false)} />
                <NavItem to="/stores" icon={Store} label="Store Locations" active={location.pathname === '/stores'} onClick={() => setOpen(false)} />
                <NavItem to="/users" icon={UsersIcon} label="Staff Directory" active={location.pathname === '/users'} onClick={() => setOpen(false)} />
              </>
            )}

            {isSuperAdmin && (
              <>
                <div className="mt-8 mb-2 px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Financial Hub</div>
                <NavItem to="/expenses" icon={Receipt} label="Expenses" active={location.pathname === '/expenses'} onClick={() => setOpen(false)} />
                <NavItem to="/reports" icon={BarChart3} label="Analytics" active={location.pathname === '/reports'} onClick={() => setOpen(false)} />
              </>
            )}

            {!isAnyAdmin && (
                <NavItem to="/expenses" icon={Receipt} label="My Expenses" active={location.pathname === '/expenses'} onClick={() => setOpen(false)} />
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-50">
            <button 
              /* Fixed: Changed handleLogout to correctly use the onLogout prop passed from AppContent */
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 font-bold transition-all duration-200"
            >
              <LogOut size={20} />
              <span className="text-sm">Log out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header = ({ user }: any) => {
  const location = useLocation();
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    const title = path.substring(1).charAt(0).toUpperCase() + path.substring(2).replace('-', ' ');
    return title || 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between lg:px-10">
      <div className="lg:hidden w-8">
         <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary/20">R</div>
      </div>
      
      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest lg:text-lg lg:normal-case lg:tracking-normal">{getPageTitle()}</h2>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-black text-slate-900 leading-none">{user.name}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{user.role.replace('_', ' ')}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-primary font-black border-2 border-white shadow-sm overflow-hidden text-xs">
          {user.name[0]}
        </div>
      </div>
    </header>
  );
};

const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(db.getActiveUser());
  const location = useLocation();
  
  const isSuperAdmin = user?.role === UserRole.ADMIN;
  const isCentralAdmin = user?.role === UserRole.CENTRAL_ADMIN;
  const isAnyAdmin = isSuperAdmin || isCentralAdmin;

  const handleLogout = () => {
    db.logout();
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={() => setUser(db.getActiveUser())} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} setOpen={setSidebarOpen} user={user} onLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col lg:ml-72 mb-20 lg:mb-0 overflow-x-hidden">
        <Header user={user} />
        
        <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route 
              path="/stores" 
              element={isAnyAdmin ? <Stores user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/purchases" 
              element={isSuperAdmin ? <Purchases user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/sales" 
              element={(isSuperAdmin || !isAnyAdmin) ? <Sales user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/expenses" 
              element={!isCentralAdmin ? <Expenses user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/reports" 
              element={isSuperAdmin ? <Reports user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/users" 
              element={isAnyAdmin ? <Users /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/assignment" 
              element={isAnyAdmin ? <Assignment user={user} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/stock" 
              element={isAnyAdmin ? <StockManagement user={user} /> : <Navigate to="/" replace />} 
            />
            <Route path="/requests" element={<ProductRequests user={user} />} />
            <Route path="/wastage" element={<Wastage user={user} />} />
          </Routes>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-[60] flex items-center justify-around px-2 lg:hidden h-20 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
        <BottomTab to="/" icon={LayoutDashboard} label="Home" active={location.pathname === '/'} />
        {(isSuperAdmin || !isAnyAdmin) && (
          <BottomTab to="/sales" icon={ShoppingCart} label="Sales" active={location.pathname === '/sales'} />
        )}
        <BottomTab to="/wastage" icon={Trash2} label="Wastage" active={location.pathname === '/wastage'} />
        {isSuperAdmin && (
          <BottomTab to="/purchases" icon={CreditCard} label="Purchases" active={location.pathname === '/purchases'} />
        )}
        <button 
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center flex-1 gap-1 py-2 text-slate-400"
        >
          <MoreHorizontal size={22} />
          <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">Menu</span>
        </button>
      </nav>
    </div>
  );
};

const App = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;
