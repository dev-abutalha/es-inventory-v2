// src/services/assignment.service.ts
import { supabase } from "../../supabaseClient";
import { Product, Stock, Store, StockTransfer } from "../../types";

/* ================= PRODUCTS ================= */

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from<Product>("products")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function createProduct(payload: {
  name: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockLevel?: number;
}): Promise<Product> {
  const { data, error } = await supabase
    .from<Product>("products")
    .insert({
      name: payload.name,
      unit: payload.unit,
      cost_price: payload.costPrice,       // DB column
      selling_price: payload.sellingPrice, // DB column
      min_stock_level: payload.minStockLevel || 5
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data!.id,
    name: data!.name,
    unit: data!.unit,
    costPrice: data!.cost_price,
    sellingPrice: data!.selling_price,
    minStockLevel: data!.min_stock_level,
    created_at: data!.created_at
  };
}

/* ================= STOCK ================= */

export async function getStock(): Promise<Stock[]> {
  const { data, error } = await supabase
    .from<Stock>("stock")
    .select("*");

  if (error) throw error;
  return data || [];
}

export async function adjustStock(
  productId: string,
  storeId: string,
  qtyDelta: number
): Promise<void> {
  const { data: existing } = await supabase
    .from<Stock>("stock")
    .select("*")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .single();

  if (existing) {
    await supabase
      .from("stock")
      .update({ quantity: existing.quantity + qtyDelta })
      .eq("product_id", productId)
      .eq("store_id", storeId);
  } else {
    await supabase.from("stock").insert({
      product_id: productId,
      store_id: storeId,
      quantity: qtyDelta,
    });
  }
}

/* ================= TRANSFERS ================= */

export async function createTransfer(payload: {
  productId: string;
  quantity: number;
  fromStoreId: string;
  toStoreId: string;
}): Promise<StockTransfer> {
  const { data, error } = await supabase
    .from<StockTransfer>("transfers")
    .insert({
      product_id: payload.productId,
      quantity: payload.quantity,
      from_store_id: payload.fromStoreId,
      to_store_id: payload.toStoreId,
      date: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data!.id,
    date: data!.date,
    productId: data!.product_id,
    quantity: data!.quantity,
    fromStoreId: data!.from_store_id,
    toStoreId: data!.to_store_id,
    created_at: data!.created_at,
  };
}

/* ================= STORES ================= */

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from<Store>("stores")
    .select("*");

  if (error) throw error;
  return data || [];
}
