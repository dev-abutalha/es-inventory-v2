import { supabase } from "../../supabaseClient";
import {
  Sale,
  Store,
  Purchase,
  Expense,
  ProductRequest,
  Stock,
  StockTransfer,
  Product,
  WastageReport,
} from "../../types";

/* ================= STORES ================= */
export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

/* ================= SALES ================= */
export async function getSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;

  // Mapping DB snake_case to Frontend camelCase
  return (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    storeId: row.store_id,
    amount: row.amount,
    morningShift: row.morning_shift,
    afternoonShift: row.afternoon_shift,
    receiptImage: row.receipt_image,
    created_at: row.created_at,
  }));
}

/* ================= PURCHASES ================= */
export async function getPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    storeId: row.store_id,
    totalCost: row.total_cost,
    receiptImage: row.receipt_image,
    isQuickEntry: row.is_quick_entry,
  }));
}

/* ================= EXPENSES ================= */
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    storeId: row.store_id,
  }));
}

/* ================= REQUESTS ================= */
export async function getRequests(): Promise<ProductRequest[]> {
  const { data, error } = await supabase
    .from("product_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    storeId: row.store_id,
    receiptImage: row.receipt_image,
  }));
}

/* ================= STOCK ================= */
export async function getStock(): Promise<Stock[]> {
  const { data, error } = await supabase
    .from("stock")
    .select("*");

  if (error) throw error;
  return data || [];
}

/* ================= TRANSFERS ================= */
export async function getTransfers(): Promise<StockTransfer[]> {
  const { data, error } = await supabase
    .from("stock_transfers")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    productId: row.product_id,
    fromStoreId: row.from_store_id,
    toStoreId: row.to_store_id,
  }));
}

/* ================= PRODUCTS ================= */
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
    minStockLevel: row.min_stock_level,
    created_at: row.created_at,
  }));
}

/* ================= WASTAGE ================= */
export async function getWastageReports(): Promise<WastageReport[]> {
  const { data, error } = await supabase
    .from("wastage_reports")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    storeId: row.store_id,
    totalWastage: row.total_wastage,
    receiptImage: row.receipt_image,
  }));
}