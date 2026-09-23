export interface WorkField {
  id: string;
  label: string;
  children?: Array<{ id: string; label: string }>;
}

export interface JobPosting {
  id: string;
  slug: string;
  title: string;
  company: string;
  description: string;
  location: string;
  remote: boolean;
  fieldIds: string[];
  skills: string[];
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance';
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  salaryPeriod: 'hour' | 'month' | 'project';
  salaryNegotiable: boolean;
  status: 'open' | 'closed';
  postedBy?: string;
  postedByName: string;
  applicationsCount: number;
  createdAt?: string;
}

export interface TalentProfile {
  id: string;
  slug: string;
  userId?: string;
  name: string;
  title: string;
  avatarUrl: string;
  bio: string;
  fieldIds: string[];
  skills: string[];
  experienceYears: number;
  hoursPerWeek: number;
  rateAmount: number;
  rateCurrency: string;
  rateNegotiable: boolean;
  available: boolean;
  contractsCount: number;
  rating: number;
  reviewsCount: number;
  createdAt?: string;
}

export interface JobPostPayload {
  title: string;
  company: string;
  description: string;
  location?: string;
  remote?: boolean;
  fieldIds?: string[];
  skills?: string[];
  employmentType?: JobPosting['employmentType'];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: JobPosting['salaryPeriod'];
  salaryNegotiable?: boolean;
}

export interface JobBid {
  id: string;
  jobId?: string;
  jobSlug?: string;
  jobTitle?: string;
  applicantId?: string;
  applicantName: string;
  applicantAvatar?: string;
  proposedAmount: number;
  proposedCurrency: string;
  proposedPeriod: string;
  coverLetter?: string;
  status: string;
  workStatus?: string;
  deliveryNote?: string;
  deliveryUrls?: string[];
  deliveredAt?: string | null;
  revisionNote?: string;
  revisionCount?: number;
  completedAt?: string | null;
  disputedAt?: string | null;
  conversationId?: string;
  createdAt?: string;
  mine?: boolean;
}

export interface JobApplyPayload {
  proposedAmount: number;
  proposedCurrency?: string;
  proposedPeriod?: string;
  coverLetter?: string;
}
