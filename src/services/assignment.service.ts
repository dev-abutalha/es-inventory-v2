// src/services/assignment.service.ts
import { supabase } from "../../supabaseClient";
import { Product, Stock, Store, StockTransfer } from "../../types";

/* ================= PRODUCTS ================= */

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) throw error;
  
  // Mapping DB columns to CamelCase if necessary
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    costPrice: p.cost_price,
    sellingPrice: p.selling_price,
    minStockLevel: p.min_stock_level,
    created_at: p.created_at
  }));
}

export async function createProduct(payload: any): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: payload.name,
      unit: payload.unit,
      cost_price: payload.costPrice,
      selling_price: payload.sellingPrice,
      min_stock_level: payload.minStockLevel || 5
    })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    costPrice: data.cost_price,
    sellingPrice: data.selling_price
  };
}

/* ================= STOCK ================= */

export async function getStock(): Promise<Stock[]> {
  const { data, error } = await supabase
    .from("stock")
    .select("*");

  if (error) throw error;
  return data || [];
}

export async function adjustStock(
  productId: string,
  storeId: string,
  qtyDelta: number
): Promise<void> {
  // Use RPC or Upsert for atomic adjustments
  const { data: existing } = await supabase
    .from("stock")
    .select("*")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

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

export const createTransfer = async (transferData: any) => {
  const { data, error } = await supabase
    .from('stock_transfers') // <-- Change 'transfers' to 'stock_transfers'
    .insert([
      {
        product_id: transferData.productId,
        quantity: transferData.quantity,
        from_store_id: transferData.fromStoreId,
        to_store_id: transferData.toStoreId,
        status: 'completed', // or whatever your default status is
        created_at: new Date().toISOString(),
      },
    ]);

  if (error) throw error;
  return data;
};

/* ================= STORES ================= */

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*") // This will now include id, name, is_central, etc.
    .order('name');

  if (error) throw error;
  return data || [];
}