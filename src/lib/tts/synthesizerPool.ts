import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { createSpeechConfig } from '../../utils/azureSpeechConfig';

/** Settings that determine whether pool entries are compatible */
export interface PoolConfigKey {
  apiKey: string;
  region: string;
  /** null for personal voices (voice is specified in SSML) */
  voiceName: string | null;
  outputFormat: SpeechSDK.SpeechSynthesisOutputFormat;
}

/** A single pre-connected entry in the pool */
export interface PoolEntry {
  synthesizer: SpeechSDK.SpeechSynthesizer;
  player: SpeechSDK.SpeakerAudioDestination;
  connection: SpeechSDK.Connection;
  configKey: PoolConfigKey;
  createdAt: number;
  state: 'connecting' | 'ready' | 'failed';
}

export interface SynthesizerPoolOptions {
  poolSize?: number;
  maxEntryAgeMs?: number;
}

const DEFAULT_POOL_SIZE = 2;
const DEFAULT_MAX_ENTRY_AGE_MS = 5 * 60 * 1000; // 5 minutes

export class SynthesizerPool {
  private entries: PoolEntry[] = [];
  private currentConfigKey: PoolConfigKey | null = null;
  private poolSize: number;
  private maxEntryAgeMs: number;
  private isDisposed = false;

  constructor(options?: SynthesizerPoolOptions) {
    this.poolSize = options?.poolSize ?? DEFAULT_POOL_SIZE;
    this.maxEntryAgeMs = options?.maxEntryAgeMs ?? DEFAULT_MAX_ENTRY_AGE_MS;
  }

  /**
   * Update the config. If it differs from the current config,
   * all existing entries are invalidated and new ones created.
   */
  configure(configKey: PoolConfigKey): void {
    if (this.isDisposed) return;

    if (this.currentConfigKey && this.configKeysEqual(this.currentConfigKey, configKey)) {
      return;
    }

    console.log('[SynthesizerPool] Config changed, invalidating pool. Voice:', configKey.voiceName, 'Region:', configKey.region);
    this.invalidateAll();
    this.currentConfigKey = configKey;
    this.refill();
  }

  /**
   * Take a ready entry from the pool. Returns null if none available.
   * The entry is removed from the pool and the caller owns it.
   * Triggers async refill.
   */
  acquire(): PoolEntry | null {
    if (this.isDisposed) return null;

    const now = Date.now();
    const states = this.entries.map((e) => e.state);
    console.log(`[SynthesizerPool] acquire() called. Entries: ${this.entries.length}, states: [${states.join(', ')}]`);

    const readyIndex = this.entries.findIndex(
      (e) => e.state === 'ready' && now - e.createdAt < this.maxEntryAgeMs
    );

    if (readyIndex === -1) {
      console.log('[SynthesizerPool] No ready entry available');
      return null;
    }

    const [entry] = this.entries.splice(readyIndex, 1);
    console.log('[SynthesizerPool] Acquired entry, remaining:', this.entries.length);

    this.refill();
    return entry;
  }

  /**
   * Take a ready entry, or wait up to timeoutMs for a connecting entry to become ready.
   */
  acquireAsync(timeoutMs = 3000): Promise<PoolEntry | null> {
    // Try synchronous first
    const entry = this.acquire();
    if (entry) return Promise.resolve(entry);

    // If there are connecting entries, wait for one to become ready
    const hasConnecting = this.entries.some((e) => e.state === 'connecting');
    if (!hasConnecting) return Promise.resolve(null);

    console.log(`[SynthesizerPool] Waiting up to ${timeoutMs}ms for a connecting entry...`);

    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const entry = this.acquire();
        if (entry) {
          clearInterval(interval);
          resolve(entry);
          return;
        }
        if (Date.now() - startTime >= timeoutMs || this.isDisposed) {
          clearInterval(interval);
          console.log('[SynthesizerPool] Timed out waiting for ready entry');
          resolve(null);
        }
      }, 50);
    });
  }

  /** Dispose all entries and stop creating new ones. */
  dispose(): void {
    this.isDisposed = true;
    this.invalidateAll();
    console.log('[SynthesizerPool] Disposed');
  }

  private createEntry(configKey: PoolConfigKey): PoolEntry {
    const speechConfig = createSpeechConfig(configKey.apiKey, configKey.region);

    if (configKey.voiceName) {
      speechConfig.speechSynthesisVoiceName = configKey.voiceName;
    }

    speechConfig.speechSynthesisOutputFormat = configKey.outputFormat;

    const player = new SpeechSDK.SpeakerAudioDestination();
    const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
    const connection = SpeechSDK.Connection.fromSynthesizer(synthesizer);

    const entry: PoolEntry = {
      synthesizer,
      player,
      connection,
      configKey,
      createdAt: Date.now(),
      state: 'connecting',
    };

    connection.openConnection(
      () => {
        if (this.entries.includes(entry) && !this.isDisposed) {
          entry.state = 'ready';
          console.log('[SynthesizerPool] Entry pre-connected and ready');
        }
      },
      (error) => {
        console.warn('[SynthesizerPool] Pre-connect failed:', error);
        entry.state = 'failed';
        this.removeEntry(entry);
        this.refill();
      }
    );

    return entry;
  }

  private refill(): void {
    if (this.isDisposed || !this.currentConfigKey) return;

    const needed = this.poolSize - this.entries.length;
    for (let i = 0; i < needed; i++) {
      const entry = this.createEntry(this.currentConfigKey);
      this.entries.push(entry);
    }

    if (needed > 0) {
      console.log(`[SynthesizerPool] Refilled ${needed} entries, total: ${this.entries.length}`);
    }
  }

  private invalidateAll(): void {
    for (const entry of this.entries) {
      try { entry.synthesizer.close(); } catch { /* ignore */ }
    }
    this.entries = [];
  }

  private removeEntry(entry: PoolEntry): void {
    const idx = this.entries.indexOf(entry);
    if (idx !== -1) {
      this.entries.splice(idx, 1);
      try { entry.synthesizer.close(); } catch { /* ignore */ }
    }
  }

  private configKeysEqual(a: PoolConfigKey, b: PoolConfigKey): boolean {
    return (
      a.apiKey === b.apiKey &&
      a.region === b.region &&
      a.voiceName === b.voiceName &&
      a.outputFormat === b.outputFormat
    );
  }
}
