
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, never store plain text passwords
  role: UserRole;
  allowedFolderIds?: string[]; // IDs of folders this user has access to
  addedAt: string;
  sessionToken?: string; // Used for single-session enforcement
}

export interface Resource {
  id: string;
  title: string;
  type: 'VIDEO' | 'FILE' | 'LINK';
  url: string;
}

export interface CourseFolder {
  id: string;
  name: string;
  description: string;
  resources: Resource[];
  createdAt: string;
}

export interface Reply {
  id: string;
  username: string;
  content: string;
  createdAt: string;
  isAdmin: boolean;
}

export interface Comment {
  id: string;
  folderId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  replies?: Reply[];
}

export interface UserProgress {
  userId: string;
  completedResourceIds: string[];
}

export interface AdminConfig {
  instagram: string;
  telegram: string;
  youtube: string;
  linkedin: string;
  contactInfo: string;
  joinLink: string;
}

export interface LoginRequest {
  id: string;
  userId: string;
  username: string;
  newSessionToken: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  timestamp: number;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  folders: CourseFolder[];
  config: AdminConfig;
  userProgress: UserProgress[];
  comments: Comment[];
}
