import { get, set, del, keys } from 'idb-keyval';

export interface OfflineInspection {
  id: string;
  blob: Blob;
  fileName: string;
  timestamp: number;
  wantAudio: boolean;
  language: 'fi' | 'et' | 'en';
}

export interface SyncResult {
  success: boolean;
  textResponse?: string;
  audioResponse?: string;
  error?: string;
}

const OFFLINE_KEY_PREFIX = 'offline-inspection-';

export const offlineService = {
  // Tallenna kuva offline-tilassa
  async saveInspection(inspection: OfflineInspection): Promise<void> {
    const key = `${OFFLINE_KEY_PREFIX}${inspection.id}`;
    await set(key, inspection);
  },

  // Hae kaikki offline-kuvat
  async getAllInspections(): Promise<OfflineInspection[]> {
    const allKeys = await keys();
    const offlineKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith(OFFLINE_KEY_PREFIX)
    );
    
    const inspections: OfflineInspection[] = [];
    for (const key of offlineKeys) {
      const inspection = await get(key);
      if (inspection) {
        inspections.push(inspection);
      }
    }
    
    return inspections.sort((a, b) => a.timestamp - b.timestamp);
  },

  // Poista offline-kuva onnistuneen synkronoinnin jälkeen
  async removeInspection(id: string): Promise<void> {
    const key = `${OFFLINE_KEY_PREFIX}${id}`;
    await del(key);
  },

  // Synkronoi yksi kuva palvelimelle
  async syncInspection(inspection: OfflineInspection, webhookUrl: string): Promise<SyncResult> {
    try {
      const formData = new FormData();
      formData.append('file', inspection.blob, inspection.fileName);
      formData.append('fileName', inspection.fileName);
      formData.append('language', inspection.language);
      formData.append('wantAudio', inspection.wantAudio.toString());

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        textResponse: result.textResponse || result.text || '',
        audioResponse: result.audioResponse || result.audio || ''
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tuntematon virhe'
      };
    }
  },

  // Synkronoi kaikki offline-kuvat
  async syncAllInspections(webhookUrl: string): Promise<{ 
    synced: number; 
    failed: number; 
    results: Array<{ id: string; success: boolean; error?: string }> 
  }> {
    const inspections = await this.getAllInspections();
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    let synced = 0;
    let failed = 0;

    for (const inspection of inspections) {
      const result = await this.syncInspection(inspection, webhookUrl);
      
      if (result.success) {
        await this.removeInspection(inspection.id);
        synced++;
        results.push({ id: inspection.id, success: true });
      } else {
        failed++;
        results.push({ 
          id: inspection.id, 
          success: false, 
          error: result.error 
        });
      }
    }

    return { synced, failed, results };
  },

  // Tarkista onko verkkoyhteyttä
  async isOnline(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Testataan verkkoyhteyttä pienellä pyynnöllä
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  // Rekisteröi Background Sync service worker kanssa
  async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-inspections');
      } catch (error) {
        console.warn('Background Sync rekisteröinti epäonnistui:', error);
      }
    }
  }
}; 