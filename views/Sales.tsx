import { endOfMonth, format } from "date-fns";
import {
  Clock,
  Edit2,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  TrendingUp,
  User as UserIcon,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import CalendarPicker from "../components/CalendarPicker";
import DateRangePicker from "../components/DateRangePicker";
import { Sale, ShiftData, Store, User, UserRole } from "../types";

import {
  addSale,
  deleteSale,
  getSales,
  updateSale,
} from "../src/services/sales.service";

import { getStores } from "../src/services/stores.service";

const Sales = ({ user }: { user: User }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState(
    format(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      "yyyy-MM-dd",
    ),
  );
  const [dateTo, setDateTo] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function load() {
      const [salesData, storesData] = await Promise.all([
        getSales(),
        getStores(),
      ]);
      setSales(salesData);
      setStores(storesData);
      setLoading(false);
    }
    load();
  }, []);

  const emptyShift: ShiftData = {
    posSales: 0,
    cardSales: 0,
    cashCounted: 0,
    openingFund: 0,
    expectedCash: 0,
    difference: 0,
    employeeName: "",
    shiftTime: "",
  };

  const initialForm: Omit<Sale, "id"> = {
    date: format(new Date(), "yyyy-MM-dd"),
    storeId:
      user.assigned_store_id || stores.find((s) => s.id !== "central")?.id || "",
    amount: 0,
    morningShift: { ...emptyShift },
    afternoonShift: { ...emptyShift },
    receiptImage: "",
  };

  const [newSale, setNewSale] = useState(initialForm);

  const filteredSales = useMemo(() => {
    const base =
      user.role === UserRole.ADMIN
        ? sales
        : sales.filter((s) => s.storeId === user.assigned_store_id);

    return base
      .filter((s) => s.date >= dateFrom && s.date <= dateTo)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, user, dateFrom, dateTo]);

  const totalAmount = useMemo(
    () => filteredSales.reduce((a, s) => a + s.amount, 0),
    [filteredSales],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewSale({ ...newSale, receiptImage: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNewSale({ ...newSale, receiptImage: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const mTotal =
      (newSale.morningShift?.posSales || 0) +
      (newSale.morningShift?.cardSales || 0) +
      (newSale.morningShift?.cashCounted || 0);
    const aTotal =
      (newSale.afternoonShift?.posSales || 0) +
      (newSale.afternoonShift?.cardSales || 0) +
      (newSale.afternoonShift?.cashCounted || 0);

    const totalDaily = aTotal;
    if (!totalDaily || !newSale.storeId) return;

    try {
      setActionLoading(true);

      const payload = {
        ...newSale,
        amount: totalDaily,
      };
      if (editingId) {
        await updateSale({ id: editingId, ...payload });
      } else {
        await addSale(payload);
      }

      setSales(await getSales());
      setModalOpen(false);
      setEditingId(null);
      setNewSale(initialForm);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      alert("Something went wrong while saving the sale.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this sale record?")) return;

    try {
      setActionLoading(true);
      await deleteSale(id);
      setSales(await getSales());
    } catch (err) {
      console.error(err);
      alert("Failed to delete sale.");
    } finally {
      setActionLoading(false);
    }
  };

  const updateShift = (
    shift: "morningShift" | "afternoonShift",
    field: keyof ShiftData,
    value: any,
  ) => {
    setNewSale({
      ...newSale,
      [shift]: {
        ...newSale[shift],
        [field]: value,
      },
    });
  };

  const currentTotalDisplay =
    (newSale.afternoonShift?.posSales || 0) +
    (newSale.afternoonShift?.cardSales || 0) +
    (newSale.afternoonShift?.cashCounted || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-400 font-black">
        Loading sales…
      </div>
    );
  }

  /* ================= UI BELOW IS 100% UNCHANGED ================= */

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <p className="text-slate-500 font-medium">
            Daily Cash Register Records (Shift-based)
          </p>
          <button
            onClick={() => {
              setEditingId(null);
              setNewSale(initialForm);
              setModalOpen(true);
            }}
            className="bg-primary text-white p-3 lg:px-6 lg:py-3 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            <Plus size={24} />
            <span className="hidden lg:inline">Daily Register Entry</span>
          </button>
        </div>
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={(f, t) => {
            setDateFrom(f);
            setDateTo(t);
          }}
        />
      </div>

      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Date
              </th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Store
              </th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Morning POS+Card+Cash
              </th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Afternoon POS+Card+Cash
              </th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                Total Revenue
              </th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredSales.map((sale) => (
              <tr
                key={sale.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-8 py-5 font-bold text-slate-900">
                  {sale.date}
                </td>
                <td className="px-8 py-5 text-slate-600 font-medium">
                  {stores.find((s) => s.id === sale.storeId)?.name}
                </td>
                <td className="px-8 py-5 font-bold text-slate-500">
                  €
                  {(
                    (sale.morningShift?.posSales || 0) +
                    (sale.morningShift?.cardSales || 0) +
                    (sale.morningShift?.cashCounted || 0)
                  ).toLocaleString()}
                </td>
                <td className="px-8 py-5 font-bold text-slate-500">
                  €
                  {(
                    (sale.afternoonShift?.posSales || 0) +
                    (sale.afternoonShift?.cardSales || 0) +
                    (sale.afternoonShift?.cashCounted || 0)
                  ).toLocaleString()}
                </td>
                <td className="px-8 py-5 text-right font-black text-slate-900 text-lg">
                  €{sale.amount.toLocaleString()}
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(sale.id);
                        setNewSale({ ...sale });
                        setModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-primary transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDelete(sale.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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

      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredSales.map((sale) => (
          <div
            key={sale.id}
            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm active:bg-slate-50 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {sale.date}
                </p>
                <p className="text-lg font-black text-slate-900 leading-tight">
                  {stores.find((s) => s.id === sale.storeId)?.name}
                </p>
              </div>
              <p className="text-2xl font-black text-primary">
                €{sale.amount.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingId(sale.id);
                  setNewSale({ ...sale });
                  setModalOpen(true);
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest"
              >
                Details / Edit
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleDelete(sale.id)}
                className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 lg:left-72 bg-slate-900 text-white z-40 border-t border-slate-800 p-6 flex items-center justify-between shadow-2xl">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
            Period Total Revenue
          </p>
          <p className="text-3xl font-black tracking-tighter">
            €{totalAmount.toLocaleString()}
          </p>
        </div>
        <div className="p-3 bg-primary/20 rounded-2xl text-primary-400">
          <TrendingUp size={24} />
        </div>
      </div> */}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-4xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary text-white rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Daily Cash Record
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Registro de Caja
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <CalendarPicker
                  label="Date"
                  value={newSale.date}
                  onChange={(v) => setNewSale({ ...newSale, date: v })}
                />
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Store Location
                  </label>
                  <select
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-primary-100 font-bold"
                    disabled={user.role !== UserRole.ADMIN}
                    value={newSale.storeId}
                    onChange={(e) =>
                      setNewSale({ ...newSale, storeId: e.target.value })
                    }
                  >
                    {stores
                      .filter((s) => s.id !== "central")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden mb-8">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">
                        Concept
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-primary-600 uppercase tracking-widest text-center border-x border-slate-100 bg-primary-50/30">
                        Morning Shift
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">
                        Afternoon Shift
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-6 py-5 font-bold text-slate-900">
                        POS Sales (€)
                      </td>
                      <td className="px-4 py-2 border-x border-slate-100">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-black outline-none focus:ring-2 focus:ring-primary-400"
                          value={newSale.morningShift?.posSales || ""}
                          onChange={(e) =>
                            updateShift(
                              "morningShift",
                              "posSales",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-black outline-none focus:ring-2 focus:ring-indigo-400"
                          value={newSale.afternoonShift?.posSales || ""}
                          onChange={(e) =>
                            updateShift(
                              "afternoonShift",
                              "posSales",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-5 font-bold text-slate-900">
                        Card Payment (€)
                      </td>
                      <td className="px-4 py-2 border-x border-slate-100">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-bold text-slate-600 outline-none"
                          value={newSale.morningShift?.cardSales || ""}
                          onChange={(e) =>
                            updateShift(
                              "morningShift",
                              "cardSales",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-bold text-slate-600 outline-none"
                          value={newSale.afternoonShift?.cardSales || ""}
                          onChange={(e) =>
                            updateShift(
                              "afternoonShift",
                              "cardSales",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-5 font-bold text-slate-900">
                        Cash Counted (€)
                      </td>
                      <td className="px-4 py-2 border-x border-slate-100">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-bold text-slate-900 outline-none"
                          value={newSale.morningShift?.cashCounted || ""}
                          onChange={(e) =>
                            updateShift(
                              "morningShift",
                              "cashCounted",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-bold text-slate-900 outline-none"
                          value={newSale.afternoonShift?.cashCounted || ""}
                          onChange={(e) =>
                            updateShift(
                              "afternoonShift",
                              "cashCounted",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-5 font-bold text-slate-900">
                        Opening Fund (€)
                      </td>
                      <td className="px-4 py-2 border-x border-slate-100">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-bold text-slate-400 outline-none"
                          value={newSale.morningShift?.openingFund || ""}
                          onChange={(e) =>
                            updateShift(
                              "morningShift",
                              "openingFund",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-center font-bold text-slate-400 outline-none"
                          value={newSale.afternoonShift?.openingFund || ""}
                          onChange={(e) =>
                            updateShift(
                              "afternoonShift",
                              "openingFund",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                    </tr>
                    <tr className="bg-slate-50/30">
                      <td className="px-6 py-5 font-bold text-slate-900">
                        Expected Cash (€)
                      </td>
                      <td className="px-4 py-2 border-x border-slate-100">
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-center font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-400"
                          placeholder="0.00"
                          value={newSale.morningShift?.expectedCash || ""}
                          onChange={(e) =>
                            updateShift(
                              "morningShift",
                              "expectedCash",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-center font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="0.00"
                          value={newSale.afternoonShift?.expectedCash || ""}
                          onChange={(e) =>
                            updateShift(
                              "afternoonShift",
                              "expectedCash",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                    </tr>
                    <tr className="bg-slate-50/30">
                      <td className="px-6 py-5 font-bold text-slate-900">
                        Difference (€)
                      </td>
                      <td className="px-4 py-2 border-x border-slate-100">
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-center font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-400"
                          placeholder="0.00"
                          value={newSale.morningShift?.difference || ""}
                          onChange={(e) =>
                            updateShift(
                              "morningShift",
                              "difference",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-center font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="0.00"
                          value={newSale.afternoonShift?.difference || ""}
                          onChange={(e) =>
                            updateShift(
                              "afternoonShift",
                              "difference",
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="p-6 bg-primary-50/30 rounded-3xl border border-primary-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserIcon size={16} className="text-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      Morning Employee
                    </span>
                  </div>
                  <div className="flex gap-1.5 md:gap-3">
                    <input
                      className="w-2/3 md:w-3/4 bg-white border border-primary-100 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                      placeholder="Name"
                      value={newSale.morningShift?.employeeName}
                      onChange={(e) =>
                        updateShift(
                          "morningShift",
                          "employeeName",
                          e.target.value,
                        )
                      }
                    />
                    <div className="w-1/3 md:w-1/4 relative">
                      <Clock
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300"
                      />
                      <input
                        className="w-full bg-white border border-primary-100 rounded-xl pl-8 pr-3 py-2 text-[10px] font-black outline-none"
                        placeholder="Time"
                        value={newSale.morningShift?.shiftTime}
                        onChange={(e) =>
                          updateShift(
                            "morningShift",
                            "shiftTime",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserIcon size={16} className="text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      Afternoon Employee
                    </span>
                  </div>
                  <div className="flex gap-1.5 md:gap-3">
                    <input
                      className="w-2/3 md:w-3/4 bg-white border border-indigo-100 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                      placeholder="Name"
                      value={newSale.afternoonShift?.employeeName}
                      onChange={(e) =>
                        updateShift(
                          "afternoonShift",
                          "employeeName",
                          e.target.value,
                        )
                      }
                    />
                    <div className="w-1/3 md:w-1/4 relative">
                      <Clock
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300"
                      />
                      <input
                        className="w-full bg-white border border-indigo-100 rounded-xl pl-8 pr-3 py-2 text-[10px] font-black outline-none"
                        placeholder="Time"
                        value={newSale.afternoonShift?.shiftTime}
                        onChange={(e) =>
                          updateShift(
                            "afternoonShift",
                            "shiftTime",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Snapshot of Paper Form
                </h3>
                {newSale.receiptImage ? (
                  <div className="relative w-full rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-lg bg-slate-50 flex items-center justify-center p-4">
                    <img
                      src={newSale.receiptImage}
                      className="max-w-full h-auto max-h-[300px] object-contain rounded-xl"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-6 right-6 p-3 bg-rose-500 text-white rounded-2xl shadow-xl hover:bg-rose-600 transition-all z-20"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 border-4 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:border-primary-200 hover:bg-primary-50 hover:text-primary transition-all group"
                  >
                    <ImageIcon
                      size={48}
                      className="mb-2 group-hover:scale-110 transition-transform"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Upload photo of the physical report
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Total Daily Revenue (POS + Card + Cash Sum)
                </p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">
                  €{currentTotalDisplay.toLocaleString()}
                </p>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 sm:flex-none py-4 px-8 font-black text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={actionLoading}
                  className={`flex-1 sm:flex-none py-4 px-12 rounded-2xl font-black shadow-xl transition-all
                    ${actionLoading
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-primary text-white shadow-primary/20 hover:bg-primary-700 active:scale-95"
                    }`}
                >
                  {actionLoading ? "Saving…" : "Submit Entry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionLoading && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex items-center gap-4">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="font-black text-slate-700">Processing…</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
