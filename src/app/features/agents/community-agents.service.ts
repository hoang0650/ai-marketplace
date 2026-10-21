import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CommunityAgentStatus = 'voting' | 'pending_listing' | 'listed' | 'rejected';

export interface CommunityAgent {
  _id: string;
  fullName: string;
  name: string;
  description: string;
  stars: number;
  avatarUrl: string;
  htmlUrl: string;
  language?: string;
  license?: string;
  submitter: string;
  submitterName?: string;
  status: CommunityAgentStatus;
  voteCount: number;
  submittedAt: string;
  candidateAt?: string | null;
  candidateCycle?: string;
  listedAt?: string | null;
  reviewNote?: string;
  rank?: number;
  votedByMe?: boolean;
  mine?: boolean;
}

export interface VoteCycle {
  period: 'monthly' | 'weekly';
  key: string;
  startsAt: string;
  endsAt: string;
  lastClosed?: { key: string; closedAt: string; winner: string | null } | null;
}

export interface VoteBoard {
  cycle: VoteCycle;
  leaderboard: CommunityAgent[];
  pending: CommunityAgent[];
  listed: CommunityAgent[];
  loggedIn?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CommunityAgentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/community-agents`;

  board(): Observable<VoteBoard> {
    return this.http.get<VoteBoard>(this.base);
  }
  listed(): Observable<{ items: CommunityAgent[] }> {
    return this.http.get<{ items: CommunityAgent[] }>(`${this.base}/listed`);
  }
  submit(repoUrl: string): Observable<{ agent: CommunityAgent }> {
    return this.http.post<{ agent: CommunityAgent }>(this.base, { repoUrl });
  }
  vote(id: string): Observable<{ voteCount: number }> {
    return this.http.post<{ voteCount: number }>(`${this.base}/${id}/vote`, {});
  }
  unvote(id: string): Observable<{ voteCount: number }> {
    return this.http.delete<{ voteCount: number }>(`${this.base}/${id}/vote`);
  }
  adminPending(): Observable<VoteBoard> {
    return this.http.get<VoteBoard>(`${this.base}/admin/pending`);
  }
  approve(id: string, note: string): Observable<{ agent: CommunityAgent }> {
    return this.http.post<{ agent: CommunityAgent }>(`${this.base}/admin/${id}/approve`, { note });
  }
  reject(id: string, note: string): Observable<{ agent: CommunityAgent; next: CommunityAgent | null }> {
    return this.http.post<{ agent: CommunityAgent; next: CommunityAgent | null }>(`${this.base}/admin/${id}/reject`, { note });
  }
  closeCycle(): Observable<{ closed: boolean; alreadyClosed: boolean; winner: CommunityAgent | null; cycle: { key: string } }> {
    return this.http.post<{ closed: boolean; alreadyClosed: boolean; winner: CommunityAgent | null; cycle: { key: string } }>(`${this.base}/admin/close-cycle`, {});
  }
}
