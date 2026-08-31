import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { JobPosting, JobPostPayload, TalentProfile, WorkField } from '../models/work.models';

const MOCK_FIELDS: WorkField[] = [
  {
    id: 'ai',
    label: 'AI & Trí tuệ nhân tạo',
    children: [
      { id: 'ai-content', label: 'AI Content' },
      { id: 'ai-automation', label: 'AI Automation' },
      { id: 'ai-integration', label: 'AI Integration' },
    ],
  },
  {
    id: 'it',
    label: 'IT và lập trình',
    children: [
      { id: 'web-dev', label: 'Web Development' },
      { id: 'mobile-dev', label: 'Mobile Development' },
      { id: 'devops', label: 'DevOps & Cloud' },
    ],
  },
];

const MOCK_JOBS: JobPosting[] = [
  {
    id: 'j1',
    slug: 'senior-ai-engineer-remote',
    title: 'Senior AI Engineer (Remote)',
    company: 'AI Markets Partner',
    description: 'Triển khai inference endpoints và tối ưu latency cho marketplace AI.',
    location: 'Remote',
    remote: true,
    fieldIds: ['ai-integration'],
    skills: ['Python', 'Docker', 'GPU'],
    employmentType: 'full-time',
    salaryMin: 25000000,
    salaryMax: 45000000,
    salaryCurrency: 'VND',
    salaryPeriod: 'month',
    salaryNegotiable: false,
    status: 'open',
    postedByName: 'AI Markets HR',
    applicationsCount: 3,
  },
];

const MOCK_TALENTS: TalentProfile[] = [
  {
    id: 't1',
    slug: 'dong-nguyen-dev',
    name: 'Đông Nguyễn',
    title: 'Developer · AI Automation',
    avatarUrl: '',
    bio: 'Full-stack developer chuyên agent và workflow automation.',
    fieldIds: ['ai-automation'],
    skills: ['Angular', 'Node.js', 'n8n', 'MongoDB'],
    experienceYears: 3,
    hoursPerWeek: 40,
    rateAmount: 50000,
    rateCurrency: 'VND',
    rateNegotiable: false,
    available: true,
    contractsCount: 0,
    rating: 0,
    reviewsCount: 0,
  },
];

@Injectable({ providedIn: 'root' })
export class WorkService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/work`;

  fields(): Observable<WorkField[]> {
    if (environment.useMockApi) return of(MOCK_FIELDS);
    return this.http.get<WorkField[]>(`${this.base}/fields`).pipe(catchError(() => of(MOCK_FIELDS)));
  }

  jobs(filter: { field?: string; q?: string } = {}): Observable<JobPosting[]> {
    if (environment.useMockApi) return of(MOCK_JOBS);
    let params = new HttpParams();
    if (filter.field) params = params.set('field', filter.field);
    if (filter.q) params = params.set('q', filter.q);
    return this.http.get<JobPosting[]>(`${this.base}/jobs`, { params }).pipe(catchError(() => of(MOCK_JOBS)));
  }

  job(slug: string): Observable<JobPosting | null> {
    if (environment.useMockApi) {
      return of(MOCK_JOBS.find((j) => j.slug === slug) || null);
    }
    return this.http.get<JobPosting>(`${this.base}/jobs/${slug}`).pipe(catchError(() => of(null)));
  }

  postJob(payload: JobPostPayload): Observable<JobPosting> {
    return this.http.post<JobPosting>(`${this.base}/jobs`, payload);
  }

  talents(filter: { field?: string; q?: string } = {}): Observable<TalentProfile[]> {
    if (environment.useMockApi) return of(MOCK_TALENTS);
    let params = new HttpParams();
    if (filter.field) params = params.set('field', filter.field);
    if (filter.q) params = params.set('q', filter.q);
    return this.http.get<TalentProfile[]>(`${this.base}/talents`, { params }).pipe(catchError(() => of(MOCK_TALENTS)));
  }

  talent(slug: string): Observable<TalentProfile | null> {
    if (environment.useMockApi) {
      return of(MOCK_TALENTS.find((t) => t.slug === slug) || null);
    }
    return this.http.get<TalentProfile>(`${this.base}/talents/${slug}`).pipe(catchError(() => of(null)));
  }
}
