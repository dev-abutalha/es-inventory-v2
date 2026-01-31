import { supabase } from '../../supabaseClient';
import { ProductRequest, RequestStatus } from '../../types';

/* ================= GET ================= */

export async function getProductRequests(): Promise<ProductRequest[]> {
  const { data, error } = await supabase
    .from('product_requests')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map(mapRowToRequest);
}

/* ================= ADD ================= */

export async function addProductRequest(payload: Omit<ProductRequest, 'id'>) {
  const { error } = await supabase
    .from('product_requests')
    .insert({
      date: payload.date,
      store_id: payload.storeId,
      status: payload.status,
      items: payload.items ?? null,
      receipt_image: payload.receiptImage ?? null,
      note: payload.note ?? null
    });

  if (error) throw error;
}

/* ================= UPDATE ================= */

export async function updateProductRequest(request: ProductRequest) {
  const { error } = await supabase
    .from('product_requests')
    .update({
      status: request.status,
      items: request.items ?? null,
      receipt_image: request.receiptImage ?? null,
      note: request.note ?? null
    })
    .eq('id', request.id);

  if (error) throw error;
}

/* ================= DELETE (optional) ================= */

export async function deleteProductRequest(id: string) {
  const { error } = await supabase
    .from('product_requests')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/* ================= MAPPER ================= */

function mapRowToRequest(row: any): ProductRequest {
  return {
    id: row.id,
    date: row.date,
    storeId: row.store_id,
    status: row.status as RequestStatus,
    items: row.items ?? undefined,
    receiptImage: row.receipt_image ?? undefined,
    note: row.note ?? ''
  };
}
