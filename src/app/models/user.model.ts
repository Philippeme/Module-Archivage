export interface User {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    level: UserLevel;
    regions?: string[];
    centers?: string[];
    tribunals?: string[];
    declarationCenters?: string[];
    lastLogin?: Date;
    active: boolean;
  }
  
  export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    USER = 'USER',
    VIEWER = 'VIEWER'
  }
  
  export enum UserLevel {
    NATIONAL = 'NATIONAL',
    REGIONAL = 'REGIONAL',
    CENTER = 'CENTER',
    COURT = 'COURT',
    DECLARATION_CENTER = 'DECLARATION_CENTER'
  }