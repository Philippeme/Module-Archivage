export interface Document {
    id: string;
    originalName: string;
    name: string;
    path: string;
    type: DocumentType;
    creationDate: Date;
    lastModificationDate: Date;
    sourceInstitution: string;
    creator: string;
    lastModifier: string;
    version: number;
    concernedPerson1: string;
    concernedPerson2?: string;
    deleted: boolean;
    size: number;
    comments?: DocumentComment[];
    actionHistory?: DocumentAction[];
  }
  
  export enum DocumentType {
    BIRTH_CERTIFICATE = 'Acte de naissance',
    MARRIAGE_CERTIFICATE = 'Acte de mariage',
    DEATH_CERTIFICATE = 'Acte de décès',
    BIRTH_DECLARATION = 'Déclaration de naissance',
    DEATH_DECLARATION = 'Déclaration de décès',
    DEATH_CERTIFICATION = 'Certificat de décès',
    MARRIAGE_PUBLICATION = 'Publication de mariage',
    NON_OPPOSITION_CERTIFICATE = 'Certificat de non opposition',
    NON_REGISTRATION_FORM = 'Fiche de non inscription',
    SUPPLEMENTARY_JUDGMENT = 'Jugement supplétif',
    RECTIFICATION_JUDGMENT = 'Jugement rectificatif',
    CANCELLATION_JUDGMENT = 'Jugement d\'annulation',
    HOMOLOGATION_JUDGMENT = 'Jugement d\'homologation',
    DECLARATORY_JUDGMENT = 'Jugement déclaratif'
  }
  
  export interface Folder {
    name: string;
    path: string;
    type?: 'document-type' | 'year' | 'month' | 'day' | 'region' | 'circle' | 'commune' | 'center';
    subfolders?: Folder[];
    documents?: Document[];
    creationDate?: Date;
    lastModificationDate?: Date;
    size?: number;
    iconClass?: string;
    colorClass?: string;
  }

  // Structures additionnelles pour les fonctionnalités avancées
export interface DocumentComment {
    id: string;
    documentId: string;
    userId: string;
    userName: string;
    text: string;
    creationDate: Date;
  }
  
  export interface DocumentAction {
    id: string;
    documentId: string;
    userId: string;
    userName: string;
    actionType: ActionType;
    actionDate: Date;
    details?: string;
  }
  
  export enum ActionType {
    VIEW = 'Consultation',
    DOWNLOAD = 'Téléchargement',
    SHARE = 'Partage',
    VERSION_CREATE = 'Création de version',
    COMMENT_ADD = 'Ajout de commentaire'
  }