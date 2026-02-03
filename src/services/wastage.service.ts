import { supabase } from "../../supabaseClient";
import { WastageReport } from "../../types";

export const wastageService = {
  async getReports(storeId?: string) {
    let query = supabase
      .from("wastage_reports")
      .select(
        `
        id,
        date,
        store_id,
        responsible,
        total_wastage,
        receipt_image,
        items:wastage_items(
          id,
          time,
          product_id,
          product_name,
          reason,
          quantity,
          unit,
          unit_price,
          total
        )
      `,
      )
      .order("date", { ascending: false });

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 🔥 Normalize DB → Frontend
    return (data || []).map((report) => ({
      id: report.id,
      date: report.date,
      storeId: report.store_id,
      responsible: report.responsible,
      totalWastage: report.total_wastage,
      receiptImage: report.receipt_image,
      items: (report.items || []).map((item) => ({
        id: item.id,
        time: item.time,
        productId: item.product_id,
        productName: item.product_name,
        reason: item.reason,
        quantity: item.quantity,
        unit: item.unit, // ✅ ADD
        unitPrice: item.unit_price,
        total: item.total,
      })),
    }));
  },

  async createReport(reportData: Omit<WastageReport, "id">) {
    const { data: report, error } = await supabase
      .from("wastage_reports")
      .insert({
        date: reportData.date,
        store_id: reportData.storeId,
        responsible: reportData.responsible,
        total_wastage: reportData.totalWastage,
        receipt_image: reportData.receiptImage,
      })
      .select()
      .single();

    if (error) throw error;

    const items = reportData.items.map(item => ({
      wastage_id: report.id,
      time: item.time,
      product_id: item.productId || null,
      product_name: item.productName,
      reason: item.reason,
      quantity: item.quantity,
      unit: item.unit,              // ✅ ADD
      unit_price: item.unitPrice,
      total: item.total
    }));


    const { error: itemsError } = await supabase
      .from("wastage_items")
      .insert(items);

    if (itemsError) throw itemsError;

    return report;
  },

  async updateReport(id: string, reportData: Omit<WastageReport, "id">) {
    // 1️⃣ Update main report
    const { error } = await supabase
      .from("wastage_reports")
      .update({
        date: reportData.date,
        store_id: reportData.storeId,
        responsible: reportData.responsible,
        total_wastage: reportData.totalWastage,
        receipt_image: reportData.receiptImage,
      })
      .eq("id", id);

    if (error) throw error;

    // 2️⃣ Replace items (simplest & safest)
    await supabase.from("wastage_items").delete().eq("wastage_id", id);

    const items = reportData.items.map((item) => ({
      wastage_id: id,
      time: item.time,
      product_id: item.productId || null,
      product_name: item.productName,
      reason: item.reason,
      quantity: item.quantity,
      unit: item.unit, // ✅ IMPORTANT
      unit_price: item.unitPrice,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from("wastage_items")
      .insert(items);

    if (itemsError) throw itemsError;
  },

  async deleteReport(id: string) {
    const { error } = await supabase
      .from("wastage_reports")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
