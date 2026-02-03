// create purchases

import { supabase } from "@/supabaseClient";
import { Purchase } from "@/types";

export async function createPurchase(
  purchaseData: Purchase,
): Promise<Purchase> {
  const { data, error } = await supabase
    .from("purchases")
    .insert({
      date: purchaseData.date,
      store_id: purchaseData.storeId,
      total_cost: purchaseData.totalCost,
      receipt_image: purchaseData.receiptImage,
      is_quick_entry: purchaseData.isQuickEntry ?? false,
      items: purchaseData.items,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating purchase:", error);
    throw error;
  }

  return data as Purchase;
}

// get all Purchases

export async function getPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return data || [];
}
