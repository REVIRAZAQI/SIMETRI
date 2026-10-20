import { CustomerMasterItem } from '../types';

const DB_NAME = 'SIMETRI_CUSTOMER_CACHE';
const DB_VERSION = 1;
const STORE_CUSTOMERS = 'customers';
const STORE_META = 'metadata';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
        db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save all customer master records to IndexedDB in a single transaction
 */
export async function saveCustomersToCache(
  customers: CustomerMasterItem[],
  lastSync?: string
): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CUSTOMERS, STORE_META], 'readwrite');
      const custStore = tx.objectStore(STORE_CUSTOMERS);
      const metaStore = tx.objectStore(STORE_META);

      // Clear existing records first
      custStore.clear();

      // Batch put in memory
      for (let i = 0; i < customers.length; i++) {
        custStore.put(customers[i]);
      }

      metaStore.put({
        key: 'sync_info',
        total: customers.length,
        lastSync: lastSync || new Date().toLocaleString('id-ID'),
        cachedAt: new Date().toISOString(),
      });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn('[Cache] Could not save customers to IndexedDB:', err);
  }
}

/**
 * Load all customer master records from IndexedDB
 */
export async function loadCustomersFromCache(): Promise<{
  customers: CustomerMasterItem[];
  lastSync?: string;
} | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CUSTOMERS, STORE_META], 'readonly');
      const custStore = tx.objectStore(STORE_CUSTOMERS);
      const metaStore = tx.objectStore(STORE_META);

      const custReq = custStore.getAll();
      const metaReq = metaStore.get('sync_info');

      let customers: CustomerMasterItem[] = [];
      let meta: any = null;

      custReq.onsuccess = () => {
        customers = custReq.result || [];
      };

      metaReq.onsuccess = () => {
        meta = metaReq.result;
      };

      tx.oncomplete = () => {
        db.close();
        if (customers.length > 0) {
          resolve({
            customers,
            lastSync: meta?.lastSync,
          });
        } else {
          resolve(null);
        }
      };

      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn('[Cache] Could not load customers from IndexedDB:', err);
    return null;
  }
}

/**
 * Clear the cache
 */
export async function clearCustomerCache(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CUSTOMERS, STORE_META], 'readwrite');
      tx.objectStore(STORE_CUSTOMERS).clear();
      tx.objectStore(STORE_META).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    console.warn(e);
  }
}
