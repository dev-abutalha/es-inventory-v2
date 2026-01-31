import {
  Check,
  Edit3,
  Layers,
  Package,
  Plus,
  PlusCircle,
  Search,
  Store,
  Trash2,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  adjustStock,
  createProduct,
  createTransfer,
  getProducts,
  getStock,
  getStores,
} from "../src/services/assignment.service";

import { Product, Store as StoreType, User, UserRole } from "../types";

const UNIT_OPTIONS = ["pcs", "kg", "lb", "box", "pack", "liter", "meter"];

interface MatrixRow {
  id: string;
  productId: string | null;
  name: string;
  unit: string;
  incomingQty: number;
  costPrice: number;
  sellingPrice: number;
  distribution: Record<string, number>;
}

const Assignment = ({ user }: { user: User }) => {
  // --- State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [allStores, setAllStores] = useState<StoreType[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Derived State ---
  const centralStore = useMemo(
    () => allStores.find((s) => s.is_central || s.code === "central"),
    [allStores],
  );
  const localStores = useMemo(
    () => allStores.filter((s) => !s.is_central && s.code !== "central"),
    [allStores],
  );
  const centralId = centralStore?.id || "central";
  const isAnyAdmin =
    user.role === UserRole.ADMIN || user.role === UserRole.CENTRAL_ADMIN;

  // --- Initial Data Load ---
  const fetchData = async () => {
    const [p, s, st] = await Promise.all([
      getProducts(),
      getStores(),
      getStock(),
    ]);
    setProducts(p);
    setAllStores(s);
    setStock(st);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Helpers ---
  const getStockFor = (productId: string, storeId: string) =>
    stock.find((s) => s.product_id === productId && s.store_id === storeId)
      ?.quantity || 0;

  const createEmptyRow = (): MatrixRow => ({
    id: `row_${Math.random().toString(36).substr(2, 9)}`,
    productId: null,
    name: "",
    unit: "pcs",
    incomingQty: 0,
    costPrice: 0,
    sellingPrice: 0,
    distribution: localStores.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {}),
  });

  // --- Matrix Actions ---
  const handleOpenModal = () => {
    setMatrix([createEmptyRow()]);
    setModalOpen(true);
  };

  const updateRow = (idx: number, updates: Partial<MatrixRow>) => {
    const newMatrix = [...matrix];
    newMatrix[idx] = { ...newMatrix[idx], ...updates };
    setMatrix(newMatrix);
  };

  const updateRowDistribution = (idx: number, storeId: string, qty: number) => {
    const newMatrix = [...matrix];
    newMatrix[idx].distribution = {
      ...newMatrix[idx].distribution,
      [storeId]: Math.max(0, qty),
    };
    setMatrix(newMatrix);
  };

  const selectExistingProduct = (idx: number, p: Product) => {
    updateRow(idx, {
      productId: p.id,
      name: p.name,
      unit: p.unit,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
    });
    setActiveSearchIdx(null);
  };

  // --- Submission Logics ---
  const handleFinishAssignment = async () => {
    if (isProcessing) return; // Prevent double clicks

    setIsProcessing(true); // Start Loader
    try {
      for (const row of matrix) {
        if (!row.name) continue;

        let productId = row.productId;

        // NEW PRODUCT: Only create if it doesn't have an ID yet
        if (!productId) {
          const newProduct = await createProduct({
            name: row.name,
            unit: row.unit,
            costPrice: row.costPrice,
            sellingPrice: row.sellingPrice,
            minStockLevel: 5,
          });
          productId = newProduct.id;
        }

        // HUB STOCK ADJUSTMENT
        if (row.incomingQty > 0) {
          await adjustStock(productId!, centralId, row.incomingQty);
        }

        // DISTRIBUTION LOGIC
        const distributionEntries = Object.entries(row.distribution) as [string, number][];
        for (const [storeId, qty] of distributionEntries) {
          if (qty > 0) {
            await adjustStock(productId!, centralId, -qty);
            await adjustStock(productId!, storeId, qty);
            await createTransfer({
              productId: productId!,
              quantity: qty,
              fromStoreId: centralId,
              toStoreId: storeId,
            });
          }
        }
      }

      await fetchData();
      setModalOpen(false);
      // alert("Assignment successfully committed!");
    } catch (error) {
      console.error("Assignment failed:", error);
      alert("Error during assignment. Check console for details.");
    } finally {
      setIsProcessing(false); // Stop Loader
    }
  };

  const saveInlineEdit = async (productId: string) => {
    for (const [storeId, qty] of Object.entries(editValues)) {
      const delta = Number(qty) - getStockFor(productId, storeId);
      if (delta !== 0) {
        await adjustStock(productId, centralId, -delta);
        await adjustStock(productId, storeId, delta);
        if (delta > 0) {
          await createTransfer({
            productId,
            quantity: delta,
            fromStoreId: centralId,
            toStoreId: storeId,
          });
        }
      }
    }
    await fetchData();
    setEditingProductId(null);
  };

  return (
    <div className="space-y-8 pb-20 p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Assignment Center
          </h1>
          <p className="text-slate-500 font-medium">
            Supply logistics for the Barcelona retail network.
          </p>
        </div>
        {isAnyAdmin && (
          <button
            onClick={handleOpenModal}
            className="bg-primary text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black shadow-xl hover:bg-primary-700 transition-all"
          >
            <Layers size={20} /> Bulk Supply Matrix
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-xl group">
        <Search
          size={20}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary"
        />
        <input
          type="text"
          placeholder="Quick filter hub inventory..."
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-sm font-bold outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products
          .filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .map((p) => {
            const inHub = getStockFor(p.id, centralId);
            const totalInStores = localStores.reduce(
              (acc, s) => acc + getStockFor(p.id, s.id),
              0,
            );
            const isEditing = editingProductId === p.id;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-[2.5rem] border flex flex-col transition-all overflow-hidden ${isEditing ? "border-primary ring-4 ring-primary-50 z-20" : "border-slate-100"}`}
              >
                <div className="p-8 pb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`p-4 rounded-2xl ${isEditing ? "bg-primary text-white" : "bg-slate-50 text-slate-400"}`}
                    >
                      <Package size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Hub Stock
                      </p>
                      <p className="text-3xl font-black text-slate-900">
                        {inHub}{" "}
                        <span className="text-xs uppercase">{p.unit}</span>
                      </p>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-6">
                    {p.name}
                  </h3>

                  {isEditing ? (
                    <div className="space-y-2">
                      {localStores.map((s) => (
                        <div
                          key={s.id}
                          className="flex justify-between items-center px-4 py-2 rounded-xl bg-primary-50 border border-primary-100"
                        >
                          <span className="text-[9px] font-black text-slate-500 uppercase truncate w-1/2">
                            {s.name}
                          </span>
                          <input
                            type="number"
                            className="w-20 bg-white rounded-lg px-2 py-1 text-right text-xs font-black text-primary outline-none"
                            value={editValues[s.id] ?? 0}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                [s.id]: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 px-6 bg-slate-50 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Store size={16} className="text-slate-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">
                          Field Stock
                        </span>
                      </div>
                      <span className="text-sm font-black">
                        {totalInStores} {p.unit}
                      </span>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-auto px-8 py-4 bg-primary text-white flex gap-2">
                    <button
                      onClick={() => setEditingProductId(null)}
                      className="flex-1 py-3 bg-white/10 rounded-xl font-black text-[10px] uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveInlineEdit(p.id)}
                      className="flex-[2] py-3 bg-white text-primary rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2"
                    >
                      <Check size={14} /> Commit
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto px-8 py-4 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-400">
                      ID: ...{p.id.slice(-6)}
                    </p>
                    {isAnyAdmin && (
                      <button
                        onClick={() => {
                          const initial = {};
                          localStores.forEach(
                            (s) => (initial[s.id] = getStockFor(p.id, s.id)),
                          );
                          setEditValues(initial);
                          setEditingProductId(p.id);
                        }}
                        className="flex items-center gap-2 text-[10px] font-black text-primary uppercase hover:underline"
                      >
                        <Edit3 size={14} /> Adjust Shops
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Bulk Matrix Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-[3rem] w-full max-w-[98vw] h-full sm:h-[94vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 lg:p-10 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-primary text-white rounded-[1.5rem]">
                  <Warehouse size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">
                    Bulk Supply Matrix
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Excel-Style Supply pipeline
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setMatrix([createEmptyRow()])}
                  className="px-6 py-3 text-rose-500 font-black text-[10px] uppercase"
                >
                  Clear
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-3 bg-slate-100 rounded-2xl"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 lg:p-10">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="sticky top-0 z-40 bg-slate-900 text-white">
                    <tr>
                      <th className="p-5 pl-8 text-[9px] uppercase w-[40px]">
                        #
                      </th>
                      <th className="p-5 text-[9px] uppercase w-[300px]">
                        Product Name
                      </th>
                      <th className="p-5 text-[9px] uppercase w-[120px] text-center bg-slate-800">
                        New Supply
                      </th>
                      <th className="p-5 text-[9px] uppercase w-[100px] text-center">
                        Unit
                      </th>
                      <th className="p-5 text-[9px] uppercase w-[100px] text-center">
                        Cost €
                      </th>
                      <th className="p-5 text-[9px] uppercase w-[100px] text-center">
                        Sale €
                      </th>
                      {localStores.map((s) => (
                        <th
                          key={s.id}
                          className="p-5 text-[9px] uppercase text-center bg-primary-900/20"
                        >
                          {s.name}
                        </th>
                      ))}
                      <th className="p-5 pr-8 text-[9px] uppercase text-right bg-slate-800">
                        Remaining
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrix.map((row, idx) => {
                      const distributionValues = Object.values(row.distribution) as number[];
                        
                        const assigned = distributionValues.reduce(
                          (a, b) => a + (Number(b) || 0),
                          0
                        );
                      const hubStock = row.productId
                        ? getStockFor(row.productId, centralId)
                        : 0;
                      const remaining =
                        hubStock + (row.incomingQty || 0) - assigned;

                      return (
                        <tr key={row.id} className="group">
                          <td className="p-4 pl-8">
                            <button
                              onClick={() =>
                                setMatrix(matrix.filter((r) => r.id !== row.id))
                              }
                              className="text-slate-200 hover:text-rose-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                          <td className="p-4 relative">
                            <input
                              className={`w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black outline-none ${!row.productId ? "text-primary" : "text-slate-900"}`}
                              value={row.name}
                              onChange={(e) => {
                                updateRow(idx, {
                                  name: e.target.value,
                                  productId: null,
                                });
                                setActiveSearchIdx(idx);
                              }}
                            />
                            {activeSearchIdx === idx &&
                              row.name &&
                              !row.productId && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border z-50">
                                  {products
                                    .filter((p) =>
                                      p.name
                                        .toLowerCase()
                                        .includes(row.name.toLowerCase()),
                                    )
                                    .slice(0, 5)
                                    .map((p) => (
                                      <button
                                        key={p.id}
                                        onClick={() =>
                                          selectExistingProduct(idx, p)
                                        }
                                        className="w-full px-5 py-4 text-left hover:bg-primary-50 flex justify-between"
                                      >
                                        <span className="text-xs font-black">
                                          {p.name} (Hub:{" "}
                                          {getStockFor(p.id, centralId)})
                                        </span>
                                        <Plus
                                          size={14}
                                          className="text-primary"
                                        />
                                      </button>
                                    ))}
                                </div>
                              )}
                          </td>
                          <td className="p-4 bg-slate-50/30">
                            <input
                              type="number"
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-3 text-center text-sm font-black"
                              value={row.incomingQty || ""}
                              onChange={(e) =>
                                updateRow(idx, {
                                  incomingQty: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="p-4">
                            <select
                              className="w-full bg-transparent text-[10px] font-black uppercase"
                              value={row.unit}
                              onChange={(e) =>
                                updateRow(idx, { unit: e.target.value })
                              }
                            >
                              {UNIT_OPTIONS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4">
                            <input
                              type="number"
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-center text-xs"
                              value={row.costPrice || ""}
                              onChange={(e) =>
                                updateRow(idx, {
                                  costPrice: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="number"
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-center text-xs"
                              value={row.sellingPrice || ""}
                              onChange={(e) =>
                                updateRow(idx, {
                                  sellingPrice: Number(e.target.value),
                                })
                              }
                            />
                          </td>
                          {localStores.map((s) => (
                            <td key={s.id} className="p-4 bg-primary-50/5">
                              <input
                                type="number"
                                className="w-20 bg-white border border-primary-100 rounded-xl px-2 py-2 text-center text-xs font-black text-primary"
                                value={row.distribution[s.id] || ""}
                                onChange={(e) =>
                                  updateRowDistribution(
                                    idx,
                                    s.id,
                                    Number(e.target.value),
                                  )
                                }
                              />
                            </td>
                          ))}
                          <td className="p-4 pr-8 text-right">
                            <div
                              className={`px-4 py-2 rounded-2xl text-sm font-black ${remaining < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}
                            >
                              {remaining}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setMatrix([...matrix, createEmptyRow()])}
                className="mt-8 flex items-center gap-3 px-8 py-5 border-2 border-dashed border-slate-200 text-slate-400 rounded-3xl font-black text-xs uppercase w-full justify-center hover:border-primary hover:text-primary hover:bg-primary-50 transition-all"
              >
                <PlusCircle size={20} /> Add Row
              </button>
            </div>

            <div className="p-8 lg:p-12 bg-slate-900 text-white flex flex-col lg:flex-row items-center justify-between gap-8 border-t border-slate-800">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-3xl flex items-center justify-center border border-primary/20">
                  <Truck size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black">
                    {matrix.filter((r) => r.name).length} Ready
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">
                    Auto-registration enabled
                  </p>
                </div>
              </div>
              <div className="flex gap-4 w-full lg:w-auto">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-5 px-10 font-black text-slate-500 hover:text-white uppercase text-[10px]"
                >
                  Discard
                </button>
                <button
                  disabled={
                    isProcessing || 
                    matrix.length === 0 || 
                    !matrix.some((r) => r.name) || 
                    matrix.some((r) => {
                      // 1. Ensure hub is treated as a number
                      const hub: number = r.productId 
                        ? Number(getStockFor(r.productId, centralId)) 
                        : 0;

                      // 2. Explicitly type the distribution values as numbers
                      const distributionValues = Object.values(r.distribution) as number[];
                      const assigned = distributionValues.reduce(
                        (a, b) => a + (Number(b) || 0), 
                        0
                      );

                      // 3. Use parentheses to group the math before the comparison
                      const totalAvailable = hub + (Number(r.incomingQty) || 0);
                      return (totalAvailable - assigned) < 0;
                    })
                  }
                  onClick={handleFinishAssignment}
                  className="flex-[2] py-5 px-16 bg-primary text-white rounded-2xl font-black text-sm uppercase shadow-2xl disabled:opacity-20 flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Processing Supply...
                    </>
                  ) : (
                    <>
                      <Check size={20} /> Commit Supply Matrix
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignment;
