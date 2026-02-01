import { supabase } from '../../supabaseClient';
import { WastageReport } from '../../types';

export const wastageService = {
  async getReports(storeId?: string) {
    let query = supabase
      .from('wastage_reports')
      .select(`
        *,
        items:wastage_items(*)
      `)
      .order('date', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Safety: Ensure items is always an array so frontend doesn't crash
    return (data || []).map(report => ({
      ...report,
      items: report.items || []
    }));
  },

  async createReport(reportData: Omit<WastageReport, 'id'>) {
    // 1. Insert the Main Report
    const { data: report, error: reportError } = await supabase
      .from('wastage_reports')
      .insert([{
        date: reportData.date,
        store_id: reportData.storeId,
        responsible: reportData.responsible,
        total_wastage: reportData.totalWastage,
        receipt_image: reportData.receiptImage
      }])
      .select()
      .single();

    if (reportError) throw reportError;

    // 2. Prepare Items - Ensure we don't send empty strings for IDs
    const itemsToInsert = reportData.items.map(item => ({
      report_id: report.id,
      time: item.time,
      product_id: item.productId || null, // Safety for foreign keys
      product_name: item.productName,
      reason: item.reason,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.total
    }));

    // 3. Insert All Items
    const { error: itemsError } = await supabase
      .from('wastage_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
    return report;
  },

  async deleteReport(id: string) {
    const { error } = await supabase
      .from('wastage_reports')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};