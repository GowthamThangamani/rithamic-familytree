export type Gender = 'male' | 'female';
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  projectKey: string;
}

export interface Individual {
  id: number;
  fullName: string;
  tamilName?: string | null;
  gender: Gender;
  generation: number;
  isLiving: boolean;
  birthYear?: string | number | null;
  passingYear?: string | number | null;
  nativePlace?: string | null;
  branch?: string | null;
  contact?: string | null;
  occupation?: string | null;
  notes?: string | null;
  parents?: number[];
  spouses?: number[];
  children?: number[];
  relationDepth?: number;
}

export interface Branch {
  branchId: string;
  name: string;
  ancestorRoot: string;
  keyMembers: string[];
}

export interface DatasetSummary {
  totalIndividuals: number;
  activeLinkedIndividuals: number;
  totalRelationships: number;
  generationsSpan: number;
  caste?: string;
  subCaste?: string;
  nativeOrigins?: string[];
}

export interface FamilyDataset {
  appTitle: string;
  version: string;
  summary: DatasetSummary;
  branches: Branch[];
  individuals: Individual[];
}

export interface SearchMatch {
  individual: Individual;
  parentClue: string;
  spouseClue: string;
  lifespan: string;
  generation: number;
  branch: string;
}
