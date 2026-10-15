import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * "Localhost" Builder provider: an OpenAI-compatible endpoint running on the user's own machine
 * (Ollama, LM Studio, llama.cpp, vLLM, LocalAI…), e.g. http://localhost:11434/v1.
 *
 * The AI Markets server cannot reach the user's localhost, so the BROWSER calls the endpoint
 * directly. Browsers treat http://localhost / 127.0.0.1 / [::1] as a secure context, so an
 * https page may fetch them (no mixed-content block). The endpoint must allow CORS for this origin.
 *
 * Nothing here is sent to our server: the URL/model live in localStorage, and the optional API key
 * is AES-GCM encrypted with a non-extractable CryptoKey kept in IndexedDB (ciphertext in localStorage).
 */
export interface LocalProviderConfig {
  baseUrl: string;
  model: string;
  hasKey: boolean;
  updatedAt: string;
}

export type LocalErrorCode = 'LOCAL_URL_INVALID' | 'LOCAL_UNREACHABLE' | 'LOCAL_HTTP' | 'LOCAL_MODEL_REQUIRED' | 'LOCAL_EMPTY';

export class LocalProviderError extends Error {
  constructor(
    readonly code: LocalErrorCode,
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const CFG_KEY = 'aim.builder.local.v1';
const SECRET_KEY = 'aim.builder.local.secret.v1';
const DB = 'aim-builder-local';
const STORE = 'keys';
const KEY_ID = 'local-provider';

/** Loopback hosts may use http; anything else must be https (a LAN box should use a TLS proxy). */
export function normalizeLocalBaseUrl(raw: string): string {
  const v = String(raw || '').trim().replace(/\/+$/, '');
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new LocalProviderError('LOCAL_URL_INVALID', 'URL không hợp lệ');
  }
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const loopback = host === 'localhost' || host === '::1' || /^127(\.\d{1,3}){3}$/.test(host) || host.endsWith('.localhost');
  if (u.protocol === 'http:' && !loopback) {
    throw new LocalProviderError('LOCAL_URL_INVALID', 'Chỉ http://localhost, 127.0.0.1 hoặc [::1]; địa chỉ khác cần https://');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new LocalProviderError('LOCAL_URL_INVALID', 'URL phải là http(s)');
  if (u.username || u.password || u.search || u.hash) throw new LocalProviderError('LOCAL_URL_INVALID', 'URL không được chứa user/query/#');
  return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
}

@Injectable({ providedIn: 'root' })
export class LocalProviderService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly config = signal<LocalProviderConfig | null>(this.readConfig());

  private readConfig(): LocalProviderConfig | null {
    if (!this.browser) return null;
    try {
      const raw = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
      if (!raw?.baseUrl) return null;
      return {
        baseUrl: String(raw.baseUrl),
        model: String(raw.model || ''),
        hasKey: !!localStorage.getItem(SECRET_KEY),
        updatedAt: String(raw.updatedAt || ''),
      };
    } catch {
      return null;
    }
  }

  async save(input: { baseUrl: string; model: string; apiKey?: string; clearKey?: boolean }): Promise<LocalProviderConfig> {
    const baseUrl = normalizeLocalBaseUrl(input.baseUrl);
    const model = String(input.model || '').trim().slice(0, 200);
    if (input.clearKey) localStorage.removeItem(SECRET_KEY);
    if (input.apiKey && input.apiKey.trim()) localStorage.setItem(SECRET_KEY, await this.encrypt(input.apiKey.trim()));
    const updatedAt = new Date().toISOString();
    localStorage.setItem(CFG_KEY, JSON.stringify({ baseUrl, model, updatedAt }));
    const cfg = { baseUrl, model, hasKey: !!localStorage.getItem(SECRET_KEY), updatedAt };
    this.config.set(cfg);
    return cfg;
  }

  async clear(): Promise<void> {
    localStorage.removeItem(CFG_KEY);
    localStorage.removeItem(SECRET_KEY);
    await this.deleteCryptoKey().catch(() => undefined);
    this.config.set(null);
  }

  /** GET {base}/models — also the CORS / reachability check. */
  async listModels(cfg = this.config()): Promise<string[]> {
    if (!cfg) return [];
    const res = await this.call(cfg, '/models', { method: 'GET' });
    const json = (await res.json().catch(() => ({}))) as { data?: Array<{ id?: string }>; models?: Array<{ name?: string }> };
    const ids = (json.data || []).map((m) => String(m.id || '')).filter(Boolean);
    return ids.length ? ids : (json.models || []).map((m) => String(m.name || '')).filter(Boolean);
  }

  /** Streams POST {base}/chat/completions from the browser. */
  async chat(
    messages: ChatMessage[],
    opts: { model?: string; onDelta?: (t: string) => void; signal?: AbortSignal } = {},
  ): Promise<{ text: string; finishReason: string; model: string }> {
    const cfg = this.config();
    if (!cfg) throw new LocalProviderError('LOCAL_URL_INVALID', 'Chưa cấu hình localhost');
    const model = (opts.model || cfg.model).trim();
    if (!model) throw new LocalProviderError('LOCAL_MODEL_REQUIRED', 'Chọn model');
    const res = await this.call(cfg, '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ model, messages, stream: true, temperature: 0.2 }),
      signal: opts.signal,
    });
    const type = res.headers.get('content-type') || '';
    if (!res.body || !type.includes('event-stream')) {
      const json = (await res.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
      const text = json.choices?.[0]?.message?.content || '';
      if (!text) throw new LocalProviderError('LOCAL_EMPTY', 'Model không trả về nội dung');
      opts.onDelta?.(text);
      return { text, finishReason: json.choices?.[0]?.finish_reason || 'stop', model };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let text = '';
    let finishReason = '';
    const line = (l: string) => {
      if (!l.startsWith('data:')) return;
      const data = l.slice(5).trim();
      if (!data || data === '[DONE]') return;
      try {
        const j = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }> };
        const d = j.choices?.[0]?.delta?.content || '';
        if (d) {
          text += d;
          opts.onDelta?.(d);
        }
        if (j.choices?.[0]?.finish_reason) finishReason = String(j.choices[0].finish_reason);
      } catch {
        /* keep-alive / partial line */
      }
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        line(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
    }
    if (buf) line(buf);
    if (!text.trim()) throw new LocalProviderError('LOCAL_EMPTY', 'Model không trả về nội dung');
    return { text, finishReason: finishReason || 'stop', model };
  }

  private async call(cfg: LocalProviderConfig, path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers || {});
    const key = await this.apiKey();
    if (key) headers.set('Authorization', `Bearer ${key}`);
    let res: Response;
    try {
      // credentials omitted: never send aimarkets cookies to the local server.
      res = await fetch(`${cfg.baseUrl}${path}`, { ...init, headers, credentials: 'omit', mode: 'cors', cache: 'no-store' });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw e;
      // A CORS rejection and "server not running" look identical to scripts.
      throw new LocalProviderError('LOCAL_UNREACHABLE', 'Không gọi được endpoint (chưa chạy hoặc chưa bật CORS)');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new LocalProviderError('LOCAL_HTTP', `HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`, res.status);
    }
    return res;
  }

  // ---------- encrypted key at rest ----------

  private async apiKey(): Promise<string> {
    const blob = this.browser ? localStorage.getItem(SECRET_KEY) : null;
    if (!blob) return '';
    try {
      const [ivB64, ctB64] = blob.split('.');
      const key = await this.cryptoKey();
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(ivB64) }, key, b64d(ctB64));
      return new TextDecoder().decode(pt);
    } catch {
      return '';
    }
  }

  private async encrypt(value: string): Promise<string> {
    const key = await this.cryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
    return `${b64e(iv)}.${b64e(new Uint8Array(ct))}`;
  }

  private db(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async cryptoKey(): Promise<CryptoKey> {
    const db = await this.db();
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY_ID);
      r.onsuccess = () => resolve(r.result as CryptoKey | undefined);
      r.onerror = () => reject(r.error);
    });
    if (existing) return existing;
    // extractable=false: script can use the key but never read its bytes.
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(key, KEY_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return key;
  }

  private async deleteCryptoKey(): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}

function b64e(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function b64d(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
