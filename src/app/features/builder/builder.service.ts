import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/marketplace.models';

export type BuilderKind = 'web' | 'app';

export interface BuilderFile {
  path: string;
  content: string;
}

export interface BuilderMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files: string[];
  provider: string;
  model: string;
  createdAt: string;
}

export interface BuilderProject {
  id: string;
  name: string;
  kind: BuilderKind;
  provider: string;
  model: string;
  version: number;
  fileCount: number;
  previewUrl: string;
  lastGeneratedAt: string | null;
  template: { productId: string; name: string; version: number } | null;
  git?: ProjectGit | null;
  createdAt: string;
  updatedAt: string;
  files?: BuilderFile[];
  messages?: BuilderMessage[];
}

export interface ProjectGit {
  provider: 'github';
  owner: string;
  repo: string;
  fullName: string;
  branch: string;
  repoUrl: string;
  private: boolean;
  lastCommitSha: string;
  lastCommitUrl: string;
  lastPushedAt: string | null;
  lastPushedVersion: number;
}

export interface GitConnection {
  provider: 'github';
  method: 'oauth' | 'token';
  login: string;
  avatarUrl: string;
  scopes: string;
  status: 'active' | 'invalid';
  lastUsedAt: string | null;
  connectedAt: string;
}

export interface GitStatus {
  providers: Array<{ id: 'github'; label: string; oauth: boolean }>;
  connections: GitConnection[];
}

export interface GitRepo {
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  pushedAt: string | null;
}

export interface GitPushBody {
  create?: { name?: string; private?: boolean };
  repo?: string;
  branch?: string;
  message?: string;
}

export interface GitPushResult {
  git: ProjectGit;
  commit: { sha: string; url: string; unchanged: boolean };
  repo: { fullName: string; url: string; private: boolean; created: boolean };
}

export interface TemplateMeta {
  productId: string;
  kind: BuilderKind;
  ready: boolean;
  version: number;
  fileCount: number;
  demoEnabled: boolean;
  demoUrl: string;
  useCount: number;
  updatedAt: string | null;
  access: boolean;
  paths?: string[];
}

export interface TemplateListing {
  product: Product & { moderationStatus?: string; published?: boolean };
  template: TemplateMeta;
}

export interface TemplateUploadResult {
  template: TemplateMeta;
  skipped: Array<{ path: string; reason: 'type' | 'binary' | 'size' }>;
}

export interface ByokProvider {
  id: string;
  label: string;
  keyUrl: string;
  keyHint: string;
  custom: boolean;
  defaultModel: string;
}

export interface ByokKey {
  provider: string;
  last4: string;
  baseUrl: string;
  model: string;
  status: 'active' | 'invalid';
  lastVerifiedAt: string | null;
  lastUsedAt: string | null;
  updatedAt: string;
}

export interface GenerateResult {
  project: BuilderProject;
  touched: string[];
  rejected: string[];
  truncated: boolean;
}

export interface GenerateHandlers {
  onStart?: (info: { provider: string; model: string }) => void;
  onDelta?: (text: string) => void;
}

export class BuilderStreamError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class BuilderService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/builder`;
  /** BYOK keys are shared with AI Markets OpenClaw / Open WebUI. */
  private readonly keysBase = `${environment.apiUrl}/openclaw/byok/keys`;

  providers(): Observable<{ providers: ByokProvider[]; keys: ByokKey[] }> {
    return this.http.get<{ providers: ByokProvider[]; keys: ByokKey[] }>(`${this.base}/providers`);
  }

  models(provider: string): Observable<{ models: string[]; defaultModel: string }> {
    return this.http.get<{ models: string[]; defaultModel: string }>(`${this.base}/providers/${provider}/models`);
  }

  saveKey(provider: string, body: { apiKey?: string; baseUrl?: string; model?: string }): Observable<{ key: ByokKey }> {
    return this.http.put<{ key: ByokKey }>(`${this.keysBase}/${provider}`, body);
  }

  testKey(provider: string): Observable<{ success: boolean; message?: string; key: ByokKey }> {
    return this.http.post<{ success: boolean; message?: string; key: ByokKey }>(`${this.keysBase}/${provider}/test`, {});
  }

  deleteKey(provider: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.keysBase}/${provider}`);
  }

  list(kind?: BuilderKind): Observable<{ projects: BuilderProject[] }> {
    const params: Record<string, string> = kind ? { kind } : {};
    return this.http.get<{ projects: BuilderProject[] }>(`${this.base}/projects`, { params });
  }

  create(body: { name: string; kind: BuilderKind; provider?: string; model?: string }): Observable<{ project: BuilderProject }> {
    return this.http.post<{ project: BuilderProject }>(`${this.base}/projects`, body);
  }

  get(id: string): Observable<{ project: BuilderProject }> {
    return this.http.get<{ project: BuilderProject }>(`${this.base}/projects/${id}`);
  }

  update(id: string, body: { name?: string; provider?: string; model?: string }): Observable<{ project: BuilderProject }> {
    return this.http.patch<{ project: BuilderProject }>(`${this.base}/projects/${id}`, body);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/projects/${id}`);
  }

  rotatePreview(id: string): Observable<{ previewUrl: string }> {
    return this.http.post<{ previewUrl: string }>(`${this.base}/projects/${id}/preview-token`, {});
  }

  saveFile(id: string, path: string, content: string): Observable<{ project: BuilderProject }> {
    return this.http.put<{ project: BuilderProject }>(`${this.base}/projects/${id}/files`, { path, content });
  }

  deleteFile(id: string, path: string): Observable<{ project: BuilderProject }> {
    return this.http.delete<{ project: BuilderProject }>(`${this.base}/projects/${id}/files`, { params: { path } });
  }

  // ---------- push to the buyer's GitHub ----------

  gitStatus(): Observable<GitStatus> {
    return this.http.get<GitStatus>(`${this.base}/git`);
  }

  /** Returns the GitHub authorize URL; GitHub sends the browser back to `returnTo?git_connect=…`. */
  gitOAuthStart(returnTo: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.base}/git/github/oauth/start`, { returnTo });
  }

  gitOAuthComplete(connectId: string): Observable<{ connection: GitConnection }> {
    return this.http.post<{ connection: GitConnection }>(`${this.base}/git/github/oauth/complete`, { connectId });
  }

  gitConnectToken(token: string): Observable<{ connection: GitConnection }> {
    return this.http.post<{ connection: GitConnection }>(`${this.base}/git/github/token`, { token });
  }

  gitDisconnect(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/git/github`);
  }

  gitRepos(): Observable<{ repos: GitRepo[] }> {
    return this.http.get<{ repos: GitRepo[] }>(`${this.base}/git/github/repos`);
  }

  gitPush(id: string, body: GitPushBody): Observable<GitPushResult> {
    return this.http.post<GitPushResult>(`${this.base}/git/projects/${id}/push`, body);
  }

  gitUnlink(id: string): Observable<{ git: null }> {
    return this.http.delete<{ git: null }>(`${this.base}/git/projects/${id}/link`);
  }

  // ---------- seller templates ----------

  templates(kind?: BuilderKind): Observable<{ templates: TemplateListing[] }> {
    const params: Record<string, string> = kind ? { kind } : {};
    return this.http.get<{ templates: TemplateListing[] }>(`${this.base}/templates`, { params });
  }

  myTemplates(): Observable<{ templates: TemplateListing[] }> {
    return this.http.get<{ templates: TemplateListing[] }>(`${this.base}/templates/mine`);
  }

  template(productId: string): Observable<{ template: TemplateMeta; isOwner: boolean }> {
    return this.http.get<{ template: TemplateMeta; isOwner: boolean }>(`${this.base}/templates/${productId}`);
  }

  /** Files from a .zip, a folder picker or loose files; names keep folder-relative paths. */
  uploadTemplate(productId: string, files: Array<{ file: File; path: string }>): Observable<TemplateUploadResult> {
    const form = new FormData();
    for (const f of files) form.append('files', f.file, f.path);
    return this.http.put<TemplateUploadResult>(`${this.base}/templates/${productId}/files`, form);
  }

  templateFromProject(productId: string, projectId: string): Observable<TemplateUploadResult> {
    return this.http.put<TemplateUploadResult>(`${this.base}/templates/${productId}/files`, { fromProject: projectId });
  }

  updateTemplate(productId: string, body: { demoEnabled: boolean }): Observable<{ template: TemplateMeta }> {
    return this.http.patch<{ template: TemplateMeta }>(`${this.base}/templates/${productId}`, body);
  }

  useTemplate(productId: string, name?: string): Observable<{ project: BuilderProject }> {
    return this.http.post<{ project: BuilderProject }>(`${this.base}/templates/${productId}/use`, name ? { name } : {});
  }

  /**
   * Streams one build turn (Server-Sent Events). HttpClient cannot read a streaming body, so this uses
   * fetch; on 401 it lets the HttpClient interceptor refresh the session once and retries.
   */
  async generate(
    id: string,
    body: { prompt: string; previewError?: string; provider?: string; model?: string },
    handlers: GenerateHandlers,
    signal?: AbortSignal,
  ): Promise<GenerateResult> {
    let res = await this.openStream(id, body, signal);
    if (res.status === 401) {
      await firstValueFrom(this.get(id)).catch(() => undefined);
      res = await this.openStream(id, body, signal);
    }
    if (!res.ok || !res.body) {
      const json = await res.json().catch(() => ({}));
      throw new BuilderStreamError(json?.code || 'HTTP_' + res.status, json?.message || `HTTP ${res.status}`, res.status);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: GenerateResult | null = null;
    const dispatch = (block: string) => {
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trim());
      }
      if (!data.length) return;
      const payload = JSON.parse(data.join('\n'));
      if (event === 'start') handlers.onStart?.(payload);
      else if (event === 'delta') handlers.onDelta?.(payload.text || '');
      else if (event === 'done') result = payload as GenerateResult;
      else if (event === 'error') throw new BuilderStreamError(payload.code || 'PROVIDER_ERROR', payload.message || 'Error');
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let cut: number;
      while ((cut = buffer.indexOf('\n\n')) >= 0) {
        dispatch(buffer.slice(0, cut));
        buffer = buffer.slice(cut + 2);
      }
    }
    if (buffer.trim()) dispatch(buffer);
    if (!result) throw new BuilderStreamError('STREAM_INTERRUPTED', 'Stream interrupted');
    return result;
  }

  private openStream(id: string, body: object, signal?: AbortSignal): Promise<Response> {
    const token = this.auth.token();
    return fetch(`${this.base}/projects/${id}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
  }
}
