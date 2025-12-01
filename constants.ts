
import { User, UserRole, AppState, CourseFolder, AdminConfig } from './types';

export const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  username: 'codewith-vivek',
  password: 'v7678664945',
  role: UserRole.ADMIN,
  addedAt: new Date().toISOString(),
};

export const INITIAL_CONFIG: AdminConfig = {
  instagram: '',
  telegram: 'https://t.me/codewithvivek',
  youtube: '',
  linkedin: '',
  contactInfo: 'Email: contact@codewithvivek.com | Location: India',
  joinLink: 'https://t.me/codewithvivek',
  siteName: 'CodeWith-Vivek', // New default site name
};

export const INITIAL_FOLDERS: CourseFolder[] = [
  {
    id: 'folder-1',
    name: 'React Mastery',
    description: 'Complete guide to React 18',
    createdAt: new Date().toISOString(),
    resources: [
      { id: 'res-1', title: 'Introduction Video', type: 'VIDEO', url: '#' },
      { id: 'res-2', title: 'Source Code', type: 'LINK', url: 'https://github.com' },
    ],
  },
];

export const INITIAL_STATE: AppState = {
  currentUser: null,
  users: [DEFAULT_ADMIN],
  folders: INITIAL_FOLDERS,
  config: INITIAL_CONFIG,
  userProgress: [],
  comments: [],
};

export const MOCK_ONLINE_USERS_BASE = 124;