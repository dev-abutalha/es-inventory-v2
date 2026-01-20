
export enum UserRole {
  ADMIN = 'ADMIN',
  STORE_MANAGER = 'STORE_MANAGER'
}

export interface Store {
  id: string;
  name: string;
  location: string;
}

export interface PurchaseItem {
  description: string;
  quantity: number;
  unit: string;
  cost: number;
}

export interface Purchase {
  id: string;
  date: string;
  storeId: string;
  supplier: string;
  items?: PurchaseItem[]; // Optional if price-only receipt is used
  receiptImage?: string; // Base64 or URL
  totalCost: number;
  isQuickEntry?: boolean;
}

export interface ShiftData {
  posSales: number;
  cardSales: number;
  cashCounted: number;
  openingFund: number;
  employeeName: string;
  shiftTime: string;
}

export interface Sale {
  id: string;
  date: string;
  storeId: string;
  amount: number; // This will be the sum of morning and afternoon POS sales
  morningShift: ShiftData;
  afternoonShift: ShiftData;
  receiptImage?: string; // Base64 or URL
}

export interface Expense {
  id: string;
  date: string;
  storeId: string;
  category: string;
  description: string;
  amount: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  password?: string;
  role: UserRole;
  assignedStoreId?: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string; // e.g. kg, lb, pcs, box
  costPrice: number;
  sellingPrice: number;
  minStockLevel: number;
}

export interface Stock {
  productId: string;
  storeId: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  date: string;
  productId: string;
  quantity: number;
  fromStoreId: string;
  toStoreId: string;
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface ProductRequestItem {
  description: string;
  quantity: number;
  unit: string;
}

export interface ProductRequest {
  id: string;
  date: string;
  storeId: string;
  items?: ProductRequestItem[];
  receiptImage?: string; // Image of handwritten list or items
  status: RequestStatus;
  note?: string;
}
