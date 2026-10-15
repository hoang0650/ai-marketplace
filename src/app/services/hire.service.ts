import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type HireStatus = 'requested' | 'quoted' | 'active' | 'completed' | 'terminated' | 'declined' | 'cancelled';
export type HireMilestoneStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'cancelled';
export type HireTerminateReason = 'late' | 'not_as_requested' | 'other';

export interface HireMilestone {
  id: string;
  index: number;
  title: string;
  amount: number;
  dueAt: string;
  status: HireMilestoneStatus;
  overdue: boolean;
  builderProjectId: string | null;
  previewUrl: string;
  previewKind: 'web' | 'app' | null;
  demoUrl: string;
  demoNote: string;
  submittedAt: string | null;
  approvedAt: string | null;
  revisionNote: string;
  revisionCount: number;
  orderId: string | null;
}

export interface HireProject {
  id: string;
  role: 'buyer' | 'seller' | null;
  status: HireStatus;
  productId: string;
  productName: string;
  productSlug: string;
  category: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  brief: string;
  budget: number;
  desiredDeadline: string | null;
  currency: string;
  listPrice: number;
  quote: { amount: number; note: string; by: 'seller' | 'buyer' | ''; at: string | null };
  demoKind: 'web' | 'app' | null;
  milestones: HireMilestone[];
  currentMilestoneId: string | null;
  paidTotal: number;
  acceptedAt: string | null;
  completedAt: string | null;
  terminatedAt: string | null;
  terminationReason: HireTerminateReason | '';
  terminationNote: string;
  complaintId: string | null;
  events: { at: string; actor: string; action: string; note: string }[];
  messages?: { id: string; at: string; actor: 'buyer' | 'seller' | 'admin' | 'system'; body: string; link: string }[];
  origin?: 'quote' | 'package';
  createdAt: string;
  updatedAt: string;
}

export interface HireMilestoneDraft {
  title: string;
  amount: number;
  dueAt: string;
}

@Injectable({ providedIn: 'root' })
export class HireService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/hire/projects`;

  list(as: 'buyer' | 'seller' | '' = ''): Observable<HireProject[]> {
    let params = new HttpParams();
    if (as) params = params.set('as', as);
    return this.http.get<HireProject[]>(this.base, { params });
  }

  get(id: string): Observable<HireProject> {
    return this.http.get<HireProject>(`${this.base}/${id}`);
  }

  /** Start a fixed-price service package: opens the phase workspace; nothing is charged until a phase is approved. */
  startPackage(productId: string, brief?: string): Observable<HireProject & { existing?: boolean }> {
    return this.http.post<HireProject & { existing?: boolean }>(`${environment.apiUrl}/hire/packages`, { productId, brief });
  }

  message(id: string, body: string, link?: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/messages`, { body, ...(link ? { link } : {}) });
  }

  complain(id: string, note: string, requestedAction?: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/complaint`, { note, requestedAction });
  }

  request(payload: { productId: string; brief: string; budget?: number; desiredDeadline?: string }): Observable<HireProject> {
    return this.http.post<HireProject>(this.base, payload);
  }

  quote(id: string, amount: number, note: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/quote`, { amount, note });
  }

  counter(id: string, amount: number, note: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/counter`, { amount, note });
  }

  decline(id: string, note: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/decline`, { note });
  }

  cancel(id: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/cancel`, {});
  }

  accept(id: string, milestones: HireMilestoneDraft[]): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/accept`, { milestones });
  }

  submit(id: string, payload: { builderProjectId?: string; demoUrl?: string; note?: string }): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/submit`, payload);
  }

  approve(id: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/approve`, {});
  }

  revision(id: string, note: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/revision`, { note });
  }

  terminate(id: string, reason: HireTerminateReason, note: string): Observable<HireProject> {
    return this.http.post<HireProject>(`${this.base}/${id}/terminate`, { reason, note });
  }
}
