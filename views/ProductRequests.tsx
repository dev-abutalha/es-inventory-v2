import {
  AlertCircle,
  Camera,
  ClipboardList,
  Download,
  Image as ImageIcon,
  List,
  Maximize2,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ProductRequest,
  ProductRequestItem,
  RequestStatus,
  Store,
  User,
  UserRole,
} from "../types";

import {
  addProductRequest,
  getProductRequests,
  updateProductRequest,
} from "../src/services/productRequests.service";
import { getStores } from "../src/services/stores.service";

const UNIT_OPTIONS = ["kg", "Unidad", "Caja"];

const ProductRequests = ({ user }: { user: User }) => {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [isModalOpen, setModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<ProductRequest | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [requestMode, setRequestMode] = useState<"list" | "image">("list");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin =
    user.role === UserRole.ADMIN || user.role === UserRole.CENTRAL_ADMIN;

  const [newRequest, setNewRequest] = useState({
    items: [
      { description: "", quantity: 1, unit: "pcs" },
    ] as ProductRequestItem[],
    receiptImage: "",
    note: "",
  });

  /* ================= VIEW MODE ITEM EDIT (ADMIN) ================= */

  const handleAddViewItem = () => {
    if (!viewRequest) return;

    setViewRequest({
      ...viewRequest,
      items: [
        ...(viewRequest.items || []),
        { description: "", quantity: 1, unit: "pcs" },
      ],
    });
  };

  const handleUpdateViewItem = (
    idx: number,
    field: keyof ProductRequestItem,
    value: any,
  ) => {
    if (!viewRequest || !viewRequest.items) return;

    const updatedItems = [...viewRequest.items];
    updatedItems[idx] = { ...updatedItems[idx], [field]: value };

    setViewRequest({
      ...viewRequest,
      items: updatedItems,
    });
  };

  const handleRemoveViewItem = (idx: number) => {
    if (!viewRequest || !viewRequest.items) return;

    setViewRequest({
      ...viewRequest,
      items: viewRequest.items.filter((_, i) => i !== idx),
    });
  };

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function load() {
      const [reqs, storeList] = await Promise.all([
        getProductRequests(),
        getStores(),
      ]);
      setRequests(reqs);
      setStores(storeList);
    }
    load();
  }, []);

  /* ================= FILTER ================= */

  const filteredRequests = useMemo(() => {
    const list = isAdmin
      ? requests
      : requests.filter((r) => r.storeId === user.assigned_store_id);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [requests, isAdmin, user.assigned_store_id]);

  /* ================= IMAGE ================= */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewRequest({ ...newRequest, receiptImage: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNewRequest({ ...newRequest, receiptImage: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ================= LIST MODE ================= */

  const addItem = () => {
    setNewRequest({
      ...newRequest,
      items: [
        ...newRequest.items,
        { description: "", quantity: 1, unit: "pcs" },
      ],
    });
  };

  const updateItem = (
    idx: number,
    field: keyof ProductRequestItem,
    val: any,
  ) => {
    const items = [...newRequest.items];
    items[idx] = { ...items[idx], [field]: val };
    setNewRequest({ ...newRequest, items });
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    try {
      setLoading(true);

      const payload: Omit<ProductRequest, "id"> = {
        date: new Date().toISOString().split("T")[0],
        storeId: user.assigned_store_id || "central",
        items:
          requestMode === "list" && newRequest.items.some((i) => i.description)
            ? newRequest.items
            : undefined,
        receiptImage:
          requestMode === "image" ? newRequest.receiptImage : undefined,
        status: RequestStatus.PENDING,
        note: newRequest.note,
      };

      await addProductRequest(payload);
      const updatedRequests = await getProductRequests();
      setRequests(updatedRequests);

      // reset form
      setModalOpen(false);
      setNewRequest({
        items: [{ description: "", quantity: 1, unit: "pcs" }],
        receiptImage: "",
        note: "",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to save request:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ================= ADMIN ================= */

  const handleAdminStatusUpdate = async (status: RequestStatus) => {
    if (!viewRequest) return;
    await updateProductRequest({ ...viewRequest, status });
    setRequests(await getProductRequests());
    setViewRequest(null);
  };

  const handlePrintRequest = () => {
    if (!viewRequest) return;
    const storeName =
      stores.find((s) => s.id === viewRequest.storeId)?.name || "Unknown Store";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml =
      viewRequest.items
        ?.map(
          (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 900;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; text-transform: uppercase; font-size: 10px;">${item.unit}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; width: 40px;"><div style="width: 24px; height: 24px; border: 2px solid #333; margin: auto; border-radius: 4px;"></div></td>
      </tr>
    `,
        )
        .join("") ||
      '<tr><td colspan="4" style="padding: 30px; text-align: center; color: #999; font-style: italic;">No itemized list provided for this request.</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Supply Order - ${storeName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #000; padding: 40px; line-height: 1.4; }
            .header { border-bottom: 4px solid #399535; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -1px; }
            .meta { font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background: #f0f0f0; padding: 12px; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #000; border: 1px solid #ddd; }
            td { border: 1px solid #ddd; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; }
            .sig-box { flex: 1; border-top: 2px solid #000; padding-top: 10px; }
            .sig-label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #666; }
            .note-box { margin-top: 30px; padding: 20px; border: 1px solid #eee; border-left: 5px solid #399535; font-size: 12px; }
            @media print { .no-print { display: none; } button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Supply Pick List</h1>
              <div class="meta">Order ID: ${viewRequest.id} | Generated: ${new Date().toLocaleString()}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 900; font-size: 18px;">${storeName}</div>
              <div class="meta">Store Destination</div>
            </div>
          </div>
          
          <div style="margin-bottom: 30px; display: flex; justify-content: space-between;">
             <div>
               <div class="meta">Request Date</div>
               <div style="font-weight: 700;">${viewRequest.date}</div>
             </div>
             <div style="text-align: right;">
               <div class="meta">Status</div>
               <div style="font-weight: 700; color: #399535;">${viewRequest.status}</div>
             </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Product Description</th>
                <th style="text-align: center; width: 15%;">Quantity</th>
                <th style="text-align: center; width: 15%;">Unit</th>
                <th style="text-align: center; width: 20%;">Picked [✓]</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${viewRequest.note
        ? `
            <div class="note-box">
              <strong style="text-transform: uppercase; font-size: 10px; margin-bottom: 8px; display: block;">Manager Notes:</strong>
              ${viewRequest.note}
            </div>
          `
        : ""
      }

          <div class="footer">
            <div class="sig-box">
              <div style="height: 40px;"></div>
              <div class="sig-label">Warehouse Dispatch Signature & Date</div>
            </div>
            <div class="sig-box">
              <div style="height: 40px;"></div>
              <div class="sig-label">Store Receiving Signature & Date</div>
            </div>
          </div>

          <script>
            window.onload = function() { 
              setTimeout(() => {
                window.print(); 
                window.close(); 
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  /* ================= UI (UNCHANGED) ================= */

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            Supply Requests
          </h1>
          <p className="text-slate-500 font-medium">
            Request stock from the Hub via photo or itemized list.
          </p>
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
        {filteredRequests.map((req) => (
          <div
            key={req.id}
            onClick={() => setViewRequest(JSON.parse(JSON.stringify(req)))} // Deep clone for local editing
            className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:border-primary-200 transition-all cursor-pointer"
          >
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {req.date}
                  </p>
                  <p className="text-lg font-black text-slate-900 leading-none">
                    {stores.find((s) => s.id === req.storeId)?.name}
                  </p>
                </div>
                <span
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${req.status === RequestStatus.PENDING
                      ? "bg-amber-50 text-amber-600 border-amber-100"
                      : req.status === RequestStatus.APPROVED
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-rose-50 text-rose-600 border-rose-100"
                    }`}
                >
                  {req.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {req.items?.slice(0, 3).map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-1 text-xs font-bold text-slate-600"
                  >
                    <span className="truncate max-w-[150px]">
                      {item.description}
                    </span>
                    <span className="text-slate-400 font-black shrink-0">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
                {(req.items?.length || 0) > 3 && (
                  <p className="text-[10px] font-black text-primary uppercase">
                    +{req.items!.length - 3} more items...
                  </p>
                )}

                {req.receiptImage && (
                  <div className="w-full h-32 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center overflow-hidden relative group/img">
                    <img
                      src={req.receiptImage}
                      className="w-full h-full object-cover"
                    />
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
              <p className="text-[10px] font-black text-primary uppercase tracking-widest group-hover:underline">
                View Full Details
              </p>
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
                <div
                  className={`p-3 rounded-2xl ${viewRequest.status === RequestStatus.PENDING
                      ? "bg-amber-100 text-amber-600"
                      : viewRequest.status === RequestStatus.APPROVED
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-rose-100 text-rose-600"
                    }`}
                >
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-none">
                    Request Details
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {stores.find((s) => s.id === viewRequest.storeId)?.name} •{" "}
                    {viewRequest.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewRequest(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar grid grid-cols-1  gap-10">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Items Requested
                    </h3>
                    {isAdmin &&
                      viewRequest.status === RequestStatus.PENDING && (
                        <button
                          onClick={handleAddViewItem}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase hover:bg-primary/20 transition-all"
                        >
                          + Add Item
                        </button>
                      )}
                  </div>
                  <div className="space-y-3">
                    {viewRequest.items && viewRequest.items.length > 0 ? (
                      viewRequest.items.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          {isAdmin &&
                            viewRequest.status === RequestStatus.PENDING ? (
                            <>
                              <input
                                className="flex-[3] bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-100"
                                value={item.description}
                                onChange={(e) =>
                                  handleUpdateViewItem(
                                    idx,
                                    "description",
                                    e.target.value,
                                  )
                                }
                              />
                              <input
                                type="number"
                                className="flex-1 bg-slate-50 border-none rounded-xl px-2 py-3 text-xs font-black text-center outline-none"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateViewItem(
                                    idx,
                                    "quantity",
                                    Number(e.target.value),
                                  )
                                }
                              />
                              <select
                                className="flex-1 bg-slate-50 border-none rounded-xl px-2 py-3 text-[9px] font-black outline-none uppercase"
                                value={item.unit}
                                onChange={(e) =>
                                  handleUpdateViewItem(
                                    idx,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleRemoveViewItem(idx)}
                                className="p-2 text-rose-300 hover:text-rose-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <div className="w-full flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="font-bold text-slate-800">
                                {item.description}
                              </span>
                              <span className="font-black text-primary text-sm">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs font-bold text-slate-400 italic bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                          No itemized list provided. Refer to snapshot.
                        </p>
                        {isAdmin &&
                          viewRequest.status === RequestStatus.PENDING && (
                            <button
                              onClick={handleAddViewItem}
                              className="w-full py-4 border-2 border-dashed border-primary/20 text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all"
                            >
                              + Itemize Manually to Fulfill
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {viewRequest.note && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Request Note
                    </h3>
                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 text-sm font-bold text-amber-900 leading-relaxed">
                      {viewRequest.note}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  Reference Snapshot
                </h3>
                {viewRequest.receiptImage ? (
                  <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-md group bg-slate-50 p-2">
                    <img
                      src={viewRequest.receiptImage}
                      className="w-full h-auto max-h-[400px] object-contain rounded-2xl"
                    />
                    <button
                      onClick={() => setZoomedImage(viewRequest.receiptImage!)}
                      className="absolute bottom-4 right-4 p-4 bg-primary text-white shadow-2xl rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-primary-600 transition-all active:scale-95"
                    >
                      <Maximize2 size={18} /> Tap to Zoom
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <div className="h-36 w-full md:w-1/3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon size={48} className="mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        No photo provided
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-4 shrink-0">
              {isAdmin && (
                <div className="flex gap-4">
                  <button
                    onClick={handlePrintRequest}
                    className="flex-1 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer size={18} /> Print Pick List / PDF
                  </button>
                  <button
                    className="flex-1 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    onClick={() => {
                      const csv = [
                        ["Description", "Quantity", "Unit"],
                        ...(viewRequest.items?.map((i) => [
                          i.description,
                          i.quantity,
                          i.unit,
                        ]) || []),
                      ]
                        .map((r) => r.join(","))
                        .join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `order_${viewRequest.id}.csv`;
                      a.click();
                    }}
                  >
                    <Download size={18} /> Export CSV
                  </button>
                </div>
              )}

              {isAdmin && viewRequest.status === RequestStatus.PENDING && (
                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      handleAdminStatusUpdate(RequestStatus.REJECTED)
                    }
                    className="flex-1 py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() =>
                      handleAdminStatusUpdate(RequestStatus.APPROVED)
                    }
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 transition-all"
                  >
                    Approve Supply
                  </button>
                </div>
              )}
            </div>

            {viewRequest.status !== RequestStatus.PENDING && (
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col items-center justify-center shrink-0">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  This request was {viewRequest.status.toLowerCase()} on{" "}
                  {viewRequest.date}
                </p>
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                  Updates made during approval are visible to the manager
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ZOOMED IMAGE LIGHTBOX */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-6"
          onClick={() => setZoomedImage(null)}
        >
          <button className="absolute top-10 right-10 p-4 text-white hover:bg-white/10 rounded-full transition-all">
            <X size={40} />
          </button>
          <img
            src={zoomedImage}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
          />
          <p className="mt-8 text-white/50 font-black text-xs uppercase tracking-[0.3em]">
            Snapshot View • Click anywhere to exit
          </p>
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
                <h2 className="text-2xl font-black text-slate-900">
                  Request Hub Supply
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="flex bg-slate-100 p-1.5 rounded-3xl mb-8 w-fit mx-auto">
                <button
                  onClick={() => setRequestMode("list")}
                  className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${requestMode === "list" ? "bg-white text-primary shadow-sm" : "text-slate-400"}`}
                >
                  <List size={16} /> Itemized List
                </button>
                <button
                  onClick={() => setRequestMode("image")}
                  className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${requestMode === "image" ? "bg-white text-primary shadow-sm" : "text-slate-400"}`}
                >
                  <Camera size={16} /> Snapshot Request
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className='lg:col-span-2'>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Request Details
                  </h3>
                  <div className="space-y-6">
                    {requestMode === "image" ? (
                      <div className="space-y-4">
                        {newRequest.receiptImage ? (
                          <div className="relative w-full rounded-[3rem] overflow-hidden border-4 border-slate-100 shadow-lg bg-slate-50 min-h-[300px] flex items-center justify-center">
                            <img
                              src={newRequest.receiptImage}
                              className="w-full h-auto max-h-[400px] object-contain"
                            />
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
                            <span className="text-sm font-black text-slate-900 mb-1">
                              Upload Photo of List
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Snap a photo of handwritten notes
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
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {newRequest.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex gap-3 items-center bg-slate-50 p-2 rounded-3xl border border-slate-100 group"
                          >
                            <input
                              className="flex-[2] bg-white border-none rounded-2xl px-4 py-3 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary-100"
                              placeholder="Item name..."
                              value={item.description}
                              onChange={(e) =>
                                updateItem(idx, "description", e.target.value)
                              }
                            />
                            <div className="flex flex-1 items-center gap-1">
                              <input
                                type="number"
                                className="w-full bg-white border-none rounded-2xl px-2 py-3 text-sm font-black text-center shadow-sm outline-none"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(
                                    idx,
                                    "quantity",
                                    Number(e.target.value),
                                  )
                                }
                              />
                              <select
                                className="bg-white border-none rounded-2xl px-2 py-3 text-[10px] font-black uppercase shadow-sm outline-none cursor-pointer"
                                value={item.unit}
                                onChange={(e) =>
                                  updateItem(idx, "unit", e.target.value)
                                }
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() =>
                                setNewRequest({
                                  ...newRequest,
                                  items: newRequest.items.filter(
                                    (_, i) => i !== idx,
                                  ),
                                })
                              }
                              className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={addItem}
                          className="w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:border-primary hover:text-primary transition-all"
                        >
                          + Add New Entry
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col lg:col-span-1">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Additional Notes
                  </h3>
                  <textarea
                    className="w-full flex-1 bg-slate-50 border-none rounded-[2.5rem] p-8 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-50 min-h-[200px]"
                    placeholder="Any special instructions for the hub team?"
                    value={newRequest.note}
                    onChange={(e) =>
                      setNewRequest({ ...newRequest, note: e.target.value })
                    }
                  />
                  <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center gap-4">
                    <AlertCircle className="text-primary shrink-0" size={24} />
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                      Hub staff will be notified instantly and will review stock
                      availability across all Barcelona locations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-4 font-black text-slate-400"
              >
                Cancel
              </button>
              <button
                disabled={
                  (requestMode === "image" && !newRequest.receiptImage) ||
                  (requestMode === "list" &&
                    !newRequest.items[0].description) ||
                  loading
                }
                onClick={handleSave}
                className="flex-3 p-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-700 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                ) : (
                  "Confirm & Submit Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductRequests;
