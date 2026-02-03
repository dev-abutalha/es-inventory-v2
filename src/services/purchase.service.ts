// create purchases

import { supabase } from "@/supabaseClient";
import { Purchase } from "@/types";
import { createProductWithStock } from "./stock.service";

export async function createPurchase(
  purchaseData: Purchase,
): Promise<Purchase> {
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      date: purchaseData.date,
      store_id: purchaseData.store_id,
      total_cost: purchaseData.total_cost,
      receipt_image: purchaseData.receipt_image,
      is_quick_entry: purchaseData.is_quick_entry ?? false,
    })
    .select()
    .single();

  if (purchaseError) throw purchaseError;

  for (const item of purchaseData.purchase_items || []) {
    const product = await createProductWithStock(item, item.quantity, '237a8825-84b3-4cba-a80b-ef28494cd565', item?.supplier);

    const { error: purchaseItemError } = await supabase
      .from("purchase_items")
      .insert({
        purchase_id: purchase.id,
        product_id: product.id,
        quantity: item.quantity,
      });

    if (purchaseItemError) throw purchaseItemError
  }

  return purchase;
}

// get all Purchases

export async function getPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select(`
      *,
      purchase_items(
        quantity,
        product:product_id(
          id,
          name,
          unit,
          cost_price,
          selling_price,
          supplier
        )
      )
    `)
    .order("date", { ascending: false });

  if (error) throw error;
  return data || [];
}
