export interface Filter {
    id?: string;
    name?: string;
    ownerId?: string;
    isDefault?: boolean;
    isSaved?: boolean;
    lastUsed?: Date;
    criteria: FilterCriteria;
  }
  
  export interface FilterCriteria {
    searchTerm?: string;
    documentType?: string | string[];
    region?: string | string[];
    circle?: string | string[];
    commune?: string | string[];
    center?: string | string[];
    tribunal?: string | string[];
    declarationCenter?: string | string[];
    startDate?: string | Date;
    endDate?: string | Date;
    concernedPerson?: string;
    sourceInstitution?: string;
    creator?: string;
    lastModifier?: string;
    path?: string;
    logicalOperator?: 'AND' | 'OR';
    excludeDeleted?: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    pageSize?: number;
    pageIndex?: number;
  }
  
  export interface SearchSuggestion {
    type: 'document' | 'person' | 'institution' | 'location';
    value: string;
    displayValue?: string;
    count?: number;
    metadata?: {[key: string]: any};
  }
  
  export interface SavedFilter extends Filter {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt?: Date;
    isPublic?: boolean;
    description?: string;
  }