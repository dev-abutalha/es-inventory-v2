import { supabase } from '../../supabaseClient';
import { Product, Stock } from '../../types';

/* ================= PRODUCTS ================= */

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (error) throw error;

  return data.map(p => ({
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
    .from('products')
    .insert({
      name: payload.name,
      unit: payload.unit,
      cost_price: payload.costPrice,
      selling_price: payload.sellingPrice,
      min_stock_level: payload.minStockLevel
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    unit: data.unit,
    costPrice: data.cost_price,
    sellingPrice: data.selling_price,
    minStockLevel: data.min_stock_level
  };
}

export async function updateProduct(id: string, payload: any) {
  await supabase
    .from('products')
    .update({
      name: payload.name,
      unit: payload.unit,
      cost_price: payload.costPrice,
      selling_price: payload.sellingPrice,
      min_stock_level: payload.minStockLevel
    })
    .eq('id', id);
}

export async function deleteProduct(id: string) {
  await supabase.from('products').delete().eq('id', id);
}

/* ================= STOCK ================= */

export async function getStock(): Promise<Stock[]> {
  const { data, error } = await supabase.from('stock').select('*');
  if (error) throw error;
  return data;
}

export async function adjustStock(
  productId: string,
  storeId: string,
  qtyDelta: number
) {
  const { data: existing } = await supabase
    .from('stock')
    .select('*')
    .eq('product_id', productId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('stock')
      .update({ quantity: existing.quantity + qtyDelta })
      .eq('product_id', productId)
      .eq('store_id', storeId);
  } else {
    await supabase.from('stock').insert({
      product_id: productId,
      store_id: storeId,
      quantity: qtyDelta
    });
  }
}


/* ================= PRODUCT SERVICE UPDATES ================= */

export async function createProductWithStock(payload: any, initialQty?: number, storeId?: string, supplier?: string) {
  const { data, error } = await supabase.rpc('create_product_with_stock', {
    p_name: payload.name || payload?.description,
    p_unit: payload.unit, // Now explicitly passing the unit type
    p_cost_price: payload.costPrice || payload?.cost,
    p_selling_price: payload.sellingPrice,
    p_min_stock_level: payload.minStockLevel || 5,
    p_initial_qty: initialQty || payload?.quantity,
    p_store_id: storeId,
    // supplier: supplier 
  });

  if (error) throw error;
  return data;
}