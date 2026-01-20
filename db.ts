
import { Store, Purchase, Sale, Expense, User, UserRole, Product, Stock, StockTransfer, ProductRequest } from './types';

const INITIAL_STORES: Store[] = [
  { id: 'central', name: 'Central Office', location: 'Barcelona Center' },
  { id: 'st_001', name: 'Store Gràcia', location: 'Gràcia' },
  { id: 'st_002', name: 'Store Eixample', location: 'Eixample' },
];

const INITIAL_USERS: User[] = [
  { id: 'u_admin', username: 'admin', name: 'Jordi Admin', password: 'password123', role: UserRole.ADMIN },
  { id: 'u_mgr1', username: 'maria', name: 'Maria Manager', password: 'password123', role: UserRole.STORE_MANAGER, assignedStoreId: 'st_001' },
];

const STORAGE_KEYS = {
  STORES: 'rf_stores',
  PURCHASES: 'rf_purchases',
  SALES: 'rf_sales',
  EXPENSES: 'rf_expenses',
  USERS: 'rf_users',
  ACTIVE_USER: 'rf_active_user',
  PRODUCTS: 'rf_products',
  STOCK: 'rf_stock',
  REPORT_SETTINGS: 'rf_report_settings',
  TRANSFERS: 'rf_transfers',
  REQUESTS: 'rf_requests'
};

export const db = {
  save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  },
  
  load<T>(key: string, fallback: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  },

  getStores(): Store[] { return this.load(STORAGE_KEYS.STORES, INITIAL_STORES); },
  addStore(store: Store) {
    const stores = this.getStores();
    this.save(STORAGE_KEYS.STORES, [...stores, store]);
  },
  updateStore(updatedStore: Store) {
    const stores = this.getStores().map(s => s.id === updatedStore.id ? updatedStore : s);
    this.save(STORAGE_KEYS.STORES, stores);
  },
  deleteStore(id: string) {
    const stores = this.getStores().filter(s => s.id !== id);
    this.save(STORAGE_KEYS.STORES, stores);
    const users = this.getUsers().map(u => u.assignedStoreId === id ? { ...u, assignedStoreId: undefined } : u);
    this.save(STORAGE_KEYS.USERS, users);
  },

  getPurchases(): Purchase[] { return this.load(STORAGE_KEYS.PURCHASES, [] as Purchase[]); },
  addPurchase(purchase: Purchase) {
    const purchases = this.getPurchases();
    this.save(STORAGE_KEYS.PURCHASES, [...purchases, purchase]);
  },
  updatePurchase(updated: Purchase) {
    const purchases = this.getPurchases().map(p => p.id === updated.id ? updated : p);
    this.save(STORAGE_KEYS.PURCHASES, purchases);
  },
  deletePurchase(id: string) {
    const purchases = this.getPurchases().filter(p => p.id !== id);
    this.save(STORAGE_KEYS.PURCHASES, purchases);
  },

  getSales(): Sale[] { return this.load(STORAGE_KEYS.SALES, [] as Sale[]); },
  addSale(sale: Sale) {
    const sales = this.getSales();
    this.save(STORAGE_KEYS.SALES, [...sales, sale]);
  },
  updateSale(updated: Sale) {
    const sales = this.getSales().map(s => s.id === updated.id ? updated : s);
    this.save(STORAGE_KEYS.SALES, sales);
  },
  deleteSale(id: string) {
    const sales = this.getSales().filter(s => s.id !== id);
    this.save(STORAGE_KEYS.SALES, sales);
  },

  getExpenses(): Expense[] { return this.load(STORAGE_KEYS.EXPENSES, [] as Expense[]); },
  addExpense(expense: Expense) {
    const expenses = this.getExpenses();
    this.save(STORAGE_KEYS.EXPENSES, [...expenses, expense]);
  },
  updateExpense(updated: Expense) {
    const expenses = this.getExpenses().map(e => e.id === updated.id ? updated : e);
    this.save(STORAGE_KEYS.EXPENSES, expenses);
  },
  deleteExpense(id: string) {
    const expenses = this.getExpenses().filter(e => e.id !== id);
    this.save(STORAGE_KEYS.EXPENSES, expenses);
  },

  getUsers(): User[] { return this.load(STORAGE_KEYS.USERS, INITIAL_USERS); },
  addUser(user: User) {
    const users = this.getUsers();
    this.save(STORAGE_KEYS.USERS, [...users, user]);
  },
  updateUser(updatedUser: User) {
    const users = this.getUsers().map(u => u.id === updatedUser.id ? updatedUser : u);
    this.save(STORAGE_KEYS.USERS, users);
  },
  deleteUser(id: string) {
    const users = this.getUsers().filter(u => u.id !== id);
    this.save(STORAGE_KEYS.USERS, users);
  },

  getActiveUser(): User | null { return this.load(STORAGE_KEYS.ACTIVE_USER, null as User | null); },
  setActiveUser(user: User | null) { this.save(STORAGE_KEYS.ACTIVE_USER, user); },

  login(username: string, password: string): User | null {
    const users = this.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      this.setActiveUser(user);
      return user;
    }
    return null;
  },
  logout() {
    this.setActiveUser(null);
  },

  getProducts(): Product[] { return this.load(STORAGE_KEYS.PRODUCTS, [] as Product[]); },
  addProduct(p: Product) {
    const products = this.getProducts();
    this.save(STORAGE_KEYS.PRODUCTS, [...products, p]);
  },
  deleteProduct(id: string) {
    const products = this.getProducts().filter(p => p.id !== id);
    this.save(STORAGE_KEYS.PRODUCTS, products);
  },
  
  getStock(): Stock[] { return this.load(STORAGE_KEYS.STOCK, [] as Stock[]); },
  updateStock(productId: string, storeId: string, delta: number) {
    const stocks = this.getStock();
    const idx = stocks.findIndex(s => s.productId === productId && s.storeId === storeId);
    if (idx > -1) {
      stocks[idx].quantity += delta;
    } else {
      stocks.push({ productId, storeId, quantity: delta });
    }
    this.save(STORAGE_KEYS.STOCK, stocks);
  },

  getTransfers(): StockTransfer[] { return this.load(STORAGE_KEYS.TRANSFERS, [] as StockTransfer[]); },
  addTransfer(transfer: StockTransfer) {
    const transfers = this.getTransfers();
    this.save(STORAGE_KEYS.TRANSFERS, [...transfers, transfer]);
    this.updateStock(transfer.productId, transfer.fromStoreId, -transfer.quantity);
    this.updateStock(transfer.productId, transfer.toStoreId, transfer.quantity);
  },

  getRequests(): ProductRequest[] { return this.load(STORAGE_KEYS.REQUESTS, [] as ProductRequest[]); },
  addRequest(req: ProductRequest) {
    const requests = this.getRequests();
    this.save(STORAGE_KEYS.REQUESTS, [...requests, req]);
  },
  updateRequest(req: ProductRequest) {
    const requests = this.getRequests().map(r => r.id === req.id ? req : r);
    this.save(STORAGE_KEYS.REQUESTS, requests);
  },

  getReportSettings() { return this.load(STORAGE_KEYS.REPORT_SETTINGS, { recipients: 'jordi@retailflow.com' }); },
  saveReportSettings(settings: { recipients: string }) { this.save(STORAGE_KEYS.REPORT_SETTINGS, settings); },
};
