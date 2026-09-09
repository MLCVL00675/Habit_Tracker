/* ==========================================================================
   CHRONOLOG // INDEXEDDB DATABASE ENGINE & PERSISTENCE LAYER
   High-capacity, transactional, structured client-side database
   ========================================================================== */

const DB_NAME = 'chronolog_habit_os_v2';
const DB_VERSION = 1;

// Object Store Names
export const STORES = {
  USERS: 'users',
  HABITS: 'habits',
  MONTH_RECORDS: 'month_records',
  SETTINGS: 'settings'
};

class IndexedDBAdapter {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.initPromise = null;
  }

  /**
   * Initialize and upgrade the IndexedDB schema
   */
  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not supported in this environment, falling back to LocalStorage.');
        this.isReady = false;
        resolve(false);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Users Store
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          const usersStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
          usersStore.createIndex('email', 'email', { unique: false });
          usersStore.createIndex('username', 'username', { unique: false });
        }

        // 2. Habits Store
        if (!db.objectStoreNames.contains(STORES.HABITS)) {
          db.createObjectStore(STORES.HABITS, { keyPath: 'userId' });
        }

        // 3. Month Records Store (Compound key: userId_year_month)
        if (!db.objectStoreNames.contains(STORES.MONTH_RECORDS)) {
          const monthStore = db.createObjectStore(STORES.MONTH_RECORDS, { keyPath: 'id' });
          monthStore.createIndex('userId', 'userId', { unique: false });
          monthStore.createIndex('year_month', ['year', 'month'], { unique: false });
        }

        // 4. App Settings Store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;

        // Handle connection close or version changes
        this.db.onversionchange = () => {
          this.db.close();
          this.isReady = false;
        };

        resolve(true);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB failed to open, using LocalStorage fallback:', event.target.error);
        this.isReady = false;
        resolve(false);
      };
    });

    return this.initPromise;
  }

  // --------------------------------------------------------------------------
  // GENERIC TRANSACTION HELPERS
  // --------------------------------------------------------------------------
  async getTransaction(storeName, mode = 'readonly') {
    await this.init();
    if (!this.db) return null;
    return this.db.transaction([storeName], mode);
  }

  async get(storeName, key) {
    try {
      const tx = await this.getTransaction(storeName, 'readonly');
      if (!tx) return null;
      return new Promise((resolve, reject) => {
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`IndexedDB get error (${storeName}, ${key}):`, e);
      return null;
    }
  }

  async put(storeName, value) {
    try {
      const tx = await this.getTransaction(storeName, 'readwrite');
      if (!tx) return false;
      return new Promise((resolve, reject) => {
        const req = tx.objectStore(storeName).put(value);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`IndexedDB put error (${storeName}):`, e);
      return false;
    }
  }

  async delete(storeName, key) {
    try {
      const tx = await this.getTransaction(storeName, 'readwrite');
      if (!tx) return false;
      return new Promise((resolve, reject) => {
        const req = tx.objectStore(storeName).delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`IndexedDB delete error (${storeName}, ${key}):`, e);
      return false;
    }
  }

  async getAll(storeName) {
    try {
      const tx = await this.getTransaction(storeName, 'readonly');
      if (!tx) return [];
      return new Promise((resolve, reject) => {
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`IndexedDB getAll error (${storeName}):`, e);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // USER OPERATIONS
  // --------------------------------------------------------------------------
  async saveUser(user) {
    if (!user || !user.id) return false;
    return this.put(STORES.USERS, {
      ...user,
      updatedAt: new Date().toISOString()
    });
  }

  async getUser(id) {
    return this.get(STORES.USERS, id);
  }

  async getAllUsers() {
    return this.getAll(STORES.USERS);
  }

  async deleteUser(id) {
    await this.delete(STORES.USERS, id);
    await this.delete(STORES.HABITS, id);
    // Delete all month records for this user
    try {
      const allMonths = await this.getAll(STORES.MONTH_RECORDS);
      const userMonths = allMonths.filter(m => m.userId === id);
      for (const m of userMonths) {
        await this.delete(STORES.MONTH_RECORDS, m.id);
      }
    } catch (e) {
      console.warn('Error deleting user month records:', e);
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // HABITS OPERATIONS
  // --------------------------------------------------------------------------
  async saveUserHabits(userId, habits) {
    return this.put(STORES.HABITS, {
      userId,
      habits,
      updatedAt: new Date().toISOString()
    });
  }

  async getUserHabits(userId) {
    const record = await this.get(STORES.HABITS, userId);
    return record ? record.habits : null;
  }

  // --------------------------------------------------------------------------
  // MONTH RECORDS OPERATIONS
  // --------------------------------------------------------------------------
  async saveMonthData(userId, year, month, monthData) {
    const id = `${userId}_${year}_${String(month).padStart(2, '0')}`;
    return this.put(STORES.MONTH_RECORDS, {
      id,
      userId,
      year,
      month,
      monthData,
      updatedAt: new Date().toISOString()
    });
  }

  async getAllMonthsForUser(userId) {
    try {
      const all = await this.getAll(STORES.MONTH_RECORDS);
      const userRecords = all.filter(r => r.userId === userId);
      const map = {};
      userRecords.forEach(r => {
        const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
        map[key] = r.monthData;
      });
      return map;
    } catch (e) {
      console.warn('Error reading months for user:', e);
      return {};
    }
  }

  async saveAllMonthsForUser(userId, allMonthsData) {
    if (!allMonthsData || typeof allMonthsData !== 'object') return false;
    for (const [key, mData] of Object.entries(allMonthsData)) {
      if (!mData) continue;
      const [yStr, mStr] = key.split('-').map(Number);
      const year = yStr || mData.year;
      const month = mStr || mData.month;
      if (year && month) {
        await this.saveMonthData(userId, year, month, mData);
      }
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // SETTINGS & METADATA
  // --------------------------------------------------------------------------
  async saveSetting(key, value) {
    return this.put(STORES.SETTINGS, {
      key,
      value,
      updatedAt: new Date().toISOString()
    });
  }

  async getSetting(key) {
    const record = await this.get(STORES.SETTINGS, key);
    return record ? record.value : null;
  }

  /**
   * Return full diagnostic database summary
   */
  async getDatabaseStats() {
    const users = await this.getAll(STORES.USERS);
    const months = await this.getAll(STORES.MONTH_RECORDS);
    const habits = await this.getAll(STORES.HABITS);
    return {
      status: this.isReady ? 'Connected (IndexedDB)' : 'Fallback (LocalStorage)',
      dbName: DB_NAME,
      version: DB_VERSION,
      totalUsers: users.length,
      totalMonthsLogged: months.length,
      totalCustomHabitSets: habits.length
    };
  }
}

export const db = new IndexedDBAdapter();
