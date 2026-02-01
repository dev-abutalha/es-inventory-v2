import { supabase } from '../../supabaseClient';
import { Product, Store } from '../../types'; // Added Store import

export const dataService = {
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getStores(): Promise<Store[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*') // This includes is_central column
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getStoreById(id: string): Promise<Store | null> {
    if (!id) return null;
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }
};