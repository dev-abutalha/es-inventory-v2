import { endOfMonth, format } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CreditCard,
  DollarSign,
  Package,
  Receipt,
  Send,
  ShoppingCart,
  Store as StoreIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DateRangePicker from "../components/DateRangePicker";
import { db } from "../db";
import { RequestStatus, User, UserRole } from "../types";

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
    <div
      className={`p-4 rounded-3xl ${color === "emerald" ? "bg-emerald-50 text-emerald-600" : color === "primary" ? "bg-primary-50 text-primary-600" : color === "rose" ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}
    >
      <Icon size={24} />
    </div>
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
        {title}
      </p>
      <h3 className="text-2xl font-black text-slate-900 leading-none mt-1.5">
        {value}
      </h3>
    </div>
  </div>
);

const Dashboard = ({ user }: { user: User }) => {
  const isSuperAdmin = user.role === UserRole.ADMIN;
  const isCentralAdmin = user.role === UserRole.CENTRAL_ADMIN;
  const isAnyAdmin = isSuperAdmin || isCentralAdmin;

  const [dateFrom, setDateFrom] = useState(
    format(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      "yyyy-MM-dd",
    ),
  );
  const [dateTo, setDateTo] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const stores = db.getStores();
  const sales = db.getSales();
  const purchases = db.getPurchases();
  const expenses = db.getExpenses();
  const requests = db.getRequests();
  const stock = db.getStock();
  const transfers = db.getTransfers();

  const isWithinRange = (date: string) => date >= dateFrom && date <= dateTo;

  const filteredSales = useMemo(() => {
    // If manager, filter by store. If super admin, all. If central admin, none (no money visibility).
    if (isCentralAdmin) return [];
    const list = isSuperAdmin
      ? sales
      : sales.filter((s) => s.storeId === user.assignedStoreId);
    return list.filter((s) => isWithinRange(s.date));
  }, [
    sales,
    isSuperAdmin,
    isCentralAdmin,
    user.assignedStoreId,
    dateFrom,
    dateTo,
  ]);

  const totalSales = useMemo(
    () => filteredSales.reduce((acc, s) => acc + s.amount, 0),
    [filteredSales],
  );
  const totalPurchases = useMemo(
    () =>
      purchases
        .filter((p) => isWithinRange(p.date))
        .reduce((acc, p) => acc + p.totalCost, 0),
    [purchases, dateFrom, dateTo],
  );
  const totalExpenses = useMemo(
    () =>
      expenses
        .filter((e) => isWithinRange(e.date))
        .reduce((acc, e) => acc + e.amount, 0),
    [expenses, dateFrom, dateTo],
  );
  const netProfit = totalSales - totalPurchases - totalExpenses;

  const storeSummaries = useMemo(() => {
    const activeStores = isAnyAdmin
      ? stores.filter((s) => s.id !== "central")
      : stores.filter((s) => s.id === user.assignedStoreId);
    return activeStores.map((store) => {
      // Money stats only for Super Admin
      const storeSales = isSuperAdmin
        ? sales
            .filter((s) => s.storeId === store.id && isWithinRange(s.date))
            .reduce((acc, s) => acc + s.amount, 0)
        : 0;
      const storeStock = stock
        .filter((s) => s.store_id === store.id) // Changed from storeId to store_id
        .reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
      const pendingReqs = requests.filter(
        (r) => r.storeId === store.id && r.status === RequestStatus.PENDING,
      ).length;
      const recentAssignment = transfers
        .filter((t) => t.toStoreId === store.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      return {
        ...store,
        revenue: storeSales,
        stockCount: storeStock,
        pendingReqs,
        lastAssign: recentAssignment,
      };
    });
  }, [
    stores,
    sales,
    stock,
    requests,
    transfers,
    isSuperAdmin,
    isAnyAdmin,
    user.assignedStoreId,
    dateFrom,
    dateTo,
  ]);

  const chartData = useMemo(() => {
    return storeSummaries.map((s) => ({
      name: s.name.split(" ")[1] || s.name,
      Sales: s.revenue,
    }));
  }, [storeSummaries]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            Business Overview
          </h1>
          <p className="text-slate-500 font-medium">
            Real-time status of Barcelona multi-store network.
          </p>
        </div>
        {/* Hide money date range if central admin has nothing to filter by date except logistics maybe, but user said "mony thing" */}
        {!isCentralAdmin && (
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />
        )}
      </div>

      {/* ONLY SUPER ADMIN SEES FINANCIAL STATS */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Revenue"
            value={`€${totalSales.toLocaleString()}`}
            icon={ShoppingCart}
            color="emerald"
          />
          <StatCard
            title="OpEx Costs"
            value={`€${totalExpenses.toLocaleString()}`}
            icon={Receipt}
            color="rose"
          />
          <StatCard
            title="Supply Spend"
            value={`€${totalPurchases.toLocaleString()}`}
            icon={CreditCard}
            color="primary"
          />
          <StatCard
            title="Est. Profit"
            value={`€${netProfit.toLocaleString()}`}
            icon={DollarSign}
            color="indigo"
          />
        </div>
      )}

      {/* CENTRAL ADMIN & OTHERS SEE LOGISTICS VIEW */}
      <div
        className={`grid grid-cols-1 ${isSuperAdmin ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-8`}
      >
        <div
          className={`${isSuperAdmin ? "lg:col-span-2" : "lg:col-span-2"} space-y-8`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {storeSummaries.map((store) => (
              <div
                key={store.id}
                className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative group hover:border-primary-200 transition-all"
              >
                {store.pendingReqs > 0 && (
                  <div className="absolute top-6 right-6 flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 animate-bounce">
                    <AlertCircle size={12} /> {store.pendingReqs}{" "}
                    {isAnyAdmin ? "New Request" : "Request Pending"}
                  </div>
                )}

                <div className="flex items-center gap-5 mb-8">
                  <div className="p-4 bg-slate-50 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary transition-colors rounded-[1.5rem]">
                    <StoreIcon size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 leading-none">
                      {store.name}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      {store.location}
                    </p>
                  </div>
                </div>

                <div
                  className={`grid ${isSuperAdmin ? "grid-cols-2" : "grid-cols-1"} gap-6 pt-6 border-t border-slate-50`}
                >
                  {isSuperAdmin && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Sales Revenue
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        €{store.revenue.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Inventory Level
                    </p>
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-primary-400" />
                      <p className="text-2xl font-black text-slate-900">
                        {store.stockCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Latest Hub Assignment
                  </p>
                  {store.lastAssign ? (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-primary">
                          <Send size={14} />
                        </div>
                        <p className="text-xs font-black text-slate-700">
                          {store.lastAssign.quantity} units assigned
                        </p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">
                        {store.lastAssign.date}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-300 italic">
                      No recent assignments
                    </p>
                  )}
                </div>

                <Link
                  to="/requests"
                  className="mt-8 flex items-center justify-between w-full p-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all"
                >
                  Manage Store Details <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>

          {/* Performance chart only for Super Admin */}
          {isSuperAdmin && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">
                Sales Performance Chart
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc", radius: 20 }}
                      contentStyle={{
                        borderRadius: "24px",
                        border: "none",
                        boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.15)",
                        padding: "16px",
                      }}
                    />
                    <Bar
                      dataKey="Sales"
                      fill="#399535"
                      radius={[12, 12, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Recent sales sidebar only for Super Admin */}
        {isSuperAdmin && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  Recent Sales
                </h3>
                <Calendar size={18} className="text-slate-300" />
              </div>
              <div className="space-y-4">
                {filteredSales.slice(0, 10).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex justify-between items-center p-5 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-primary-100 transition-all"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none mb-2">
                        {stores.find((s) => s.id === sale.storeId)?.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          {sale.date}
                        </span>
                        {sale.receiptImage && (
                          <span className="p-1 bg-emerald-50 text-emerald-500 rounded-md">
                            <Check size={8} />
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-black text-primary tracking-tighter">
                      €{sale.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                {filteredSales.length === 0 && (
                  <p className="text-center py-20 text-slate-400 text-[10px] font-black uppercase tracking-widest italic">
                    No transactions in range
                  </p>
                )}
              </div>
              {filteredSales.length > 0 && (
                <Link
                  to="/sales"
                  className="block mt-8 text-center text-[10px] font-black text-primary uppercase hover:underline"
                >
                  View all sales log
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
