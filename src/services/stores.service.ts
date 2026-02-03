// src/services/stores.service.ts
import { supabase } from "../../supabaseClient"; // adjust path
import { Store as StoreType } from "../../types"; // adjust path

export async function getStores(): Promise<StoreType[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching stores:", error);
    throw error;
  }
  return data || [];
}

// Update addStore to handle the initial status if needed
export async function addStore(newStore: any): Promise<StoreType> {
  const { data, error } = await supabase
    .from("stores")
    .insert({
      name: newStore.name,
      location: newStore.location,
      is_central: newStore.is_central || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStore(
  updatedStore: StoreType & { is_central?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from("stores")
    .update({
      name: updatedStore.name,
      location: updatedStore.location,
      is_central: updatedStore.is_central,
    })
    .eq("id", updatedStore.id);

  if (error) throw error;
}

export async function deleteStore(id: string): Promise<void> {
  if (id === "central") {
    throw new Error("Cannot delete Central Office");
  }

  const { error } = await supabase
    .from("stores")
    .update({ is_deleted: true })
    .eq("id", id);

  if (error) throw error;
}
