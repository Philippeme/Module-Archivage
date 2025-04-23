export enum PermissionType {
    VIEW = 'VIEW',
    DOWNLOAD = 'DOWNLOAD',
    SHARE = 'SHARE',
    COMMENT = 'COMMENT',
    MANAGE = 'MANAGE',
    ADMIN = 'ADMIN'
  }
  
  export interface Permission {
    type: PermissionType;
    resource: string;
    conditions?: PermissionCondition[];
  }
  
  export interface PermissionCondition {
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'in' | 'greaterThan' | 'lessThan';
    value: any;
  }
  
  export interface ResourcePermission {
    resourceId: string;
    resourceType: 'document' | 'folder' | 'application';
    permissions: PermissionType[];
  }
  
  export interface PermissionCheckResult {
    granted: boolean;
    reason?: string;
    alternatives?: string[];
  }