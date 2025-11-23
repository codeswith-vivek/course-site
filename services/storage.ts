
import { AppState, User, CourseFolder, AdminConfig } from '../types';
import { INITIAL_STATE } from '../constants';

const STORAGE_KEY = 'codewith_vivek_lms_v1';

export const getStoredState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with initial state to ensure new fields exist if schema changed
      return { ...INITIAL_STATE, ...parsed };
    }
    // Initialize if empty
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
    return INITIAL_STATE;
  } catch (e) {
    console.error('Failed to load state', e);
    return INITIAL_STATE;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Database Management Features ---

export const exportDatabase = (): string => {
  const state = getStoredState();
  // Remove current session data before exporting
  const exportState = { ...state, currentUser: null };
  return JSON.stringify(exportState, null, 2);
};

export const importDatabase = (jsonString: string): AppState | null => {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Basic validation to ensure it's a valid backup
    if (!parsed.users || !parsed.folders || !parsed.config) {
      throw new Error("Invalid database file format");
    }

    // Save to local storage
    saveState(parsed);
    return parsed;
  } catch (e) {
    console.error("Database import failed:", e);
    return null;
  }
};

export const resetDatabase = (): AppState => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
  return INITIAL_STATE;
};
