// src/services/stores.service.ts
import { supabase } from '../../supabaseClient'; // adjust path
import { Store as StoreType } from '../../types'; // adjust path

export async function getStores(): Promise<StoreType[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }
  return data || [];
}

export async function addStore(newStore: Omit<StoreType, 'id'>): Promise<StoreType> {
  const { data, error } = await supabase
    .from('stores')
    .insert(newStore)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('No store returned after insert');

  return data;
}

export async function updateStore(updatedStore: StoreType): Promise<void> {
  const { error } = await supabase
    .from('stores')
    .update({
      name: updatedStore.name,
      location: updatedStore.location,
    })
    .eq('id', updatedStore.id);

  if (error) throw error;
}

export async function deleteStore(id: string): Promise<void> {
  if (id === 'central') {
    throw new Error("Cannot delete Central Office");
  }

  const { error } = await supabase.from('stores').delete().eq('id', id);

  if (error) throw error;
}