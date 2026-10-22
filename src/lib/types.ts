export type Gender = "masculin" | "feminin";

export type Subscriber = {
  id: number;
  subscriptionNumber: string;
  lastName: string;
  firstName: string;
  gender: Gender;
  profession: string | null;
  phone: string;
  registrationDate: string;
  validityDate: string;
  photoData: string | null;
  notes: string | null;
  isDemo: boolean;
  cardGeneratedAt: string | null;
  lastPrintedAt: string | null;
  /** Renseigné lorsque la fiche est à la corbeille : rien n'est perdu avant purge. */
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriberInput = {
  lastName: string;
  firstName: string;
  gender: Gender;
  profession?: string;
  phone: string;
  registrationDate?: string;
  validityDate: string;
  photoData?: string | null;
  notes?: string;
  regenerateNumber?: boolean;
};

export type SubscriberStatus = "valide" | "expire" | "bientot";

export type ActivityLog = {
  id: number;
  action: string;
  details: string | null;
  entityType: string | null;
  entityId: number | null;
  actor: string | null;
  createdAt: string;
};

export type AdminAccount = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
};

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
};

export type AppStats = {
  total: number;
  valid: number;
  expired: number;
  expiringSoon: number;
  men: number;
  women: number;
  withPhoto: number;
  withoutPhoto: number;
  cardsGenerated: number;
};

export type MaintenanceStatus = {
  database: "ok" | "erreur";
  databaseMessage: string;
  subscriberCount: number;
  trashCount: number;
  duplicateNumbers: string[];
  missingPhotos: number;
  expiredCount: number;
  logCount: number;
  cardErrorCount: number;
  lastBackup: string | null;
  adminCount: number;
};
