export type Gender = 'male' | 'female' | 'Male' | 'Female';
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
  gender: 'male' | 'female';
  generation: number;
  isLiving: boolean;
  birthYear?: string | number | null;
  passingYear?: string | number | null;
  nativePlace?: string | null;
  branch?: string | null;
  contact?: string | null;
  address?: string | null;
  occupation?: string | null;
  notes?: string | null;
  parents?: number[];
  spouses?: number[];
  children?: number[];
  siblings?: number[];
  relationDepth?: number;
  identityClues?: {
    searchDescriptor?: string;
    parentSpouseSummary?: string;
    lifespanText?: string;
    branchName?: string;
    generationLevel?: number;
  };
}

export interface Branch {
  branchId?: string;
  name: string;
  ancestorRoot?: string;
  keyMembers?: string[];
}

export interface SearchMatch {
  individual: Individual;
  parentClue: string;
  spouseClue: string;
  lifespan: string;
  generation: number;
  branch: string;
}
