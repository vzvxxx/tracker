// Модуль хранения. ЕДИНСТВЕННОЕ место, которое знает про IndexedDB.
// При переезде на сервер меняется только этот файл.

const STORES = ['entries', 'daySummaries', 'emotions', 'bodyItems'];
const VERSION = 1;
let dbName = 'mood-diary';
let opening = null;

export function useDatabase(name) {
  dbName = name;
  opening = null;
}

function open() {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const s of STORES) {
          if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return opening;
}

function result(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
  });
}

async function put(store, value) {
  const d = await open();
  const tx = d.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  return done(tx);
}

async function remove(store, id) {
  const d = await open();
  const tx = d.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  return done(tx);
}

export const putEntry = (entry) => put('entries', entry);
export const deleteEntry = (id) => remove('entries', id);
export const putDaySummary = (summary) => put('daySummaries', summary);
export const deleteDaySummary = (id) => remove('daySummaries', id);
export const putEmotion = (emotion) => put('emotions', emotion);
export const putBodyItem = (item) => put('bodyItems', item);

export async function exportAll() {
  const d = await open();
  const tx = d.transaction(STORES);
  const [entries, daySummaries, emotions, bodyItems] = await Promise.all(
    STORES.map((s) => result(tx.objectStore(s).getAll())),
  );
  return { entries, daySummaries, emotions, bodyItems };
}

export async function seedIfEmpty({ emotions, bodyItems }) {
  const d = await open();
  const count = await result(d.transaction('emotions').objectStore('emotions').count());
  if (count > 0) return false;
  const tx = d.transaction(['emotions', 'bodyItems'], 'readwrite');
  for (const e of emotions) tx.objectStore('emotions').put(e);
  for (const b of bodyItems) tx.objectStore('bodyItems').put(b);
  await done(tx);
  return true;
}

// Всё или ничего: если хоть одна запись не подошла, транзакция отменяется.
export async function replaceAll(data) {
  const d = await open();
  const tx = d.transaction(STORES, 'readwrite');
  const finished = done(tx);
  try {
    for (const s of STORES) {
      const os = tx.objectStore(s);
      os.clear();
      for (const item of data[s]) os.put(item);
    }
  } catch (error) {
    tx.abort();
    finished.catch(() => {});
    throw error;
  }
  return finished;
}

export async function deleteDatabase(name) {
  if (opening) {
    (await opening).close();
    opening = null;
  }
  await result(indexedDB.deleteDatabase(name));
}

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch {
    // браузер не поддерживает — не страшно, главная защита — резервная копия
  }
  return false;
}
