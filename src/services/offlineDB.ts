import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineRecord {
  id: string;
  table: string;
  data: any;
  action: 'insert' | 'update' | 'delete';
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: Date;
  errorMessage?: string;
}

interface PesagemDraftItem {
  id: string;
  quantidade_aves: number;
  peso_bruto_kg: number;
  peso_tara_kg: number;
  peso_liquido_kg: number;
}

interface PesagemDraft {
  loteId: string;
  galpaoId: string;
  itens: PesagemDraftItem[];
  dataPesagem: string; // ISO string
  horaPesagem: string;
  pesoTara: string;
  savedSiloLevel: number | null;
  siloAceito: boolean;
  lastModified: string; // ISO string
}

interface VetOfflineDB extends DBSchema {
  'pending-records': {
    key: string;
    value: OfflineRecord;
    indexes: { 'by-status': string; 'by-table': string };
  };
  'cached-autopsias': {
    key: string;
    value: any;
  };
  'cached-midias': {
    key: string;
    value: {
      id: string;
      autopsiaId: string;
      tipo: string;
      blob: Blob;
      descricao?: string;
      sistemaAfetado?: string;
    };
  };
  'pesagem-draft': {
    key: string;
    value: PesagemDraft;
  };
}

const DB_NAME = 'vet-offline-db';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<VetOfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<VetOfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<VetOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for pending sync records
      if (!db.objectStoreNames.contains('pending-records')) {
        const store = db.createObjectStore('pending-records', { keyPath: 'id' });
        store.createIndex('by-status', 'syncStatus');
        store.createIndex('by-table', 'table');
      }

      // Store for cached autopsias
      if (!db.objectStoreNames.contains('cached-autopsias')) {
        db.createObjectStore('cached-autopsias', { keyPath: 'id' });
      }

      // Store for cached media (blobs)
      if (!db.objectStoreNames.contains('cached-midias')) {
        db.createObjectStore('cached-midias', { keyPath: 'id' });
      }

      // Store for pesagem drafts
      if (!db.objectStoreNames.contains('pesagem-draft')) {
        db.createObjectStore('pesagem-draft', { keyPath: 'loteId' });
      }
    },
  });

  return dbInstance;
}

export async function savePendingRecord(
  table: string,
  data: any,
  action: 'insert' | 'update' | 'delete'
): Promise<string> {
  const db = await getDB();
  const id = `${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const record: OfflineRecord = {
    id,
    table,
    data,
    action,
    syncStatus: 'pending',
    createdAt: new Date(),
  };

  await db.put('pending-records', record);
  return id;
}

export async function getPendingRecords(): Promise<OfflineRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('pending-records', 'by-status', 'pending');
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const records = await db.getAllFromIndex('pending-records', 'by-status', 'pending');
  return records.length;
}

export async function markRecordSynced(id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get('pending-records', id);
  if (record) {
    record.syncStatus = 'synced';
    await db.put('pending-records', record);
  }
}

export async function markRecordError(id: string, errorMessage: string): Promise<void> {
  const db = await getDB();
  const record = await db.get('pending-records', id);
  if (record) {
    record.syncStatus = 'error';
    record.errorMessage = errorMessage;
    await db.put('pending-records', record);
  }
}

export async function deleteSyncedRecords(): Promise<void> {
  const db = await getDB();
  const synced = await db.getAllFromIndex('pending-records', 'by-status', 'synced');
  for (const record of synced) {
    await db.delete('pending-records', record.id);
  }
}

export async function cacheAutopsia(autopsia: any): Promise<void> {
  const db = await getDB();
  await db.put('cached-autopsias', autopsia);
}

export async function getCachedAutopsia(id: string): Promise<any | undefined> {
  const db = await getDB();
  return db.get('cached-autopsias', id);
}

export async function cacheMidiaBlob(
  id: string,
  autopsiaId: string,
  tipo: string,
  blob: Blob,
  descricao?: string,
  sistemaAfetado?: string
): Promise<void> {
  const db = await getDB();
  await db.put('cached-midias', {
    id,
    autopsiaId,
    tipo,
    blob,
    descricao,
    sistemaAfetado,
  });
}

export async function getCachedMidias(autopsiaId: string): Promise<any[]> {
  const db = await getDB();
  const all = await db.getAll('cached-midias');
  return all.filter(m => m.autopsiaId === autopsiaId);
}

export async function deleteCachedMidia(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('cached-midias', id);
}

// Pesagem Draft functions
export interface PesagemDraftData {
  loteId: string;
  galpaoId: string;
  itens: {
    id: string;
    quantidade_aves: number;
    peso_bruto_kg: number;
    peso_tara_kg: number;
    peso_liquido_kg: number;
  }[];
  dataPesagem: string;
  horaPesagem: string;
  pesoTara: string;
  savedSiloLevel: number | null;
  siloAceito: boolean;
  lastModified: string;
}

export async function savePesagemDraft(draft: PesagemDraftData): Promise<void> {
  const db = await getDB();
  await db.put('pesagem-draft', draft);
}

export async function getPesagemDraft(loteId: string): Promise<PesagemDraftData | undefined> {
  const db = await getDB();
  return db.get('pesagem-draft', loteId);
}

export async function deletePesagemDraft(loteId: string): Promise<void> {
  const db = await getDB();
  await db.delete('pesagem-draft', loteId);
}
