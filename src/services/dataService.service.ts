import { supabase } from '../../supabaseClient';
import { Product, Stock } from '../../types';

export const dataService = {
  /**
   * Fetch all active products
   */
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch all store locations
   */
  async getStores(): Promise<Store[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch specific store by ID
   */
  async getStoreById(id: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching store ${id}:`, error);
      return null;
    }

    return data;
  },

  /**
   * Optional: Fetch product categories if you use them for filtering
   */
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};