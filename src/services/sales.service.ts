import { supabase } from '../../supabaseClient';
import { Sale } from '../../types';


/* ================= GET SALES ================= */

export async function getSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }

  return (data || []).map(mapSaleFromDb);
}

/* ================= ADD SALE ================= */

export async function addSale(sale: Omit<Sale, 'id'>): Promise<Sale> {
  const payload = mapSaleToDb(sale);

  const { data, error } = await supabase
    .from('sales')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error adding sale:', error);
    throw error;
  }

  return mapSaleFromDb(data);
}

/* ================= UPDATE SALE ================= */

export async function updateSale(sale: Sale): Promise<void> {
  const payload = mapSaleToDb(sale);

  const { error } = await supabase
    .from('sales')
    .update(payload)
    .eq('id', sale.id);

  if (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
}

/* ================= DELETE SALE ================= */

export async function deleteSale(id: string): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting sale:', error);
    throw error;
  }
}

/* ================= HELPERS ================= */

/**
 * Convert DB row → App Sale type
 */
function mapSaleFromDb(row: any): Sale {
  return {
    id: row.id,
    date: row.date,
    storeId: row.store_id,
    amount: row.amount,
    morningShift: row.morning_shift,
    afternoonShift: row.afternoon_shift,
    receiptImage: row.receipt_image || '',
    created_at: row.created_at
  };
}

/**
 * Convert App Sale type → DB insert/update payload
 */
function mapSaleToDb(sale: Partial<Sale>) {
  return {
    date: sale.date,
    store_id: sale.storeId,
    amount: sale.amount,
    morning_shift: sale.morningShift,
    afternoon_shift: sale.afternoonShift,
    receipt_image: sale.receiptImage || null
  };
}
