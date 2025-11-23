import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import UserDashboard from './components/UserDashboard';
import { User, UserRole, AppState, CourseFolder, AdminConfig, UserProgress, Comment, LoginRequest } from './types';
import { INITIAL_CONFIG, INITIAL_STATE } from './constants';
import * as DB from './services/db';
import { generateId } from './services/storage';

const App: React.FC = () => {
  // We keep local state that is synced from DB for rendering
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<CourseFolder[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [config, setConfig] = useState<AdminConfig>(INITIAL_CONFIG);
  
  const [isLoading, setIsLoading] = useState(true);

  // Initialization & Subscriptions
  useEffect(() => {
      const init = async () => {
          try {
            await DB.initializeDatabase();
          } catch (e) {
            console.error("DB Init failed", e);
          }
      };
      init();

      const unsubUsers = DB.subscribeToUsers((fetchedUsers) => {
          setUsers(fetchedUsers);
      });
      
      const unsubFolders = DB.subscribeToFolders(setFolders);
      const unsubComments = DB.subscribeToComments(setComments);
      const unsubProgress = DB.subscribeToProgress(setProgress);
      const unsubConfig = DB.subscribeToConfig(setConfig);

      return () => {
          unsubUsers();
          unsubFolders();
          unsubComments();
          unsubProgress();
          unsubConfig();
      };
  }, []);

  // Safety Timeout: Force loading to stop after 4 seconds if DB is slow
  useEffect(() => {
      const timer = setTimeout(() => {
          if (isLoading) {
              console.log("Forcing load completion after timeout");
              setIsLoading(false);
          }
      }, 4000);
      return () => clearTimeout(timer);
  }, [isLoading]);

  // Session Restoration (Auto-Login on Refresh)
  useEffect(() => {
      // We wait until we have some users loaded (or at least the admin seed)
      if (users.length > 0) {
          const storedUserId = localStorage.getItem('cw_lms_active_user_id');
          const storedSessionToken = localStorage.getItem('cw_lms_session_token');

          if (storedUserId && !currentUser) {
              const foundUser = users.find(u => u.id === storedUserId);
              
              if (foundUser) {
                  // Verify Session Token (Security Check)
                  // Admins can bypass strict token checks if needed
                  if (foundUser.sessionToken === storedSessionToken || foundUser.role === UserRole.ADMIN) {
                      console.log("Restoring session for:", foundUser.username);
                      setCurrentUser(foundUser);
                  } else {
                      console.log("Session token mismatch, clearing storage");
                      localStorage.removeItem('cw_lms_active_user_id');
                      localStorage.removeItem('cw_lms_session_token');
                  }
              }
          }
          
          // Data is loaded, users are present, check is done. Stop loading.
          setIsLoading(false);
      }
  }, [users, currentUser]);

  // Single Session Enforcement Watcher
  useEffect(() => {
      if (currentUser && users.length > 0) {
          const dbUser = users.find(u => u.id === currentUser.id);
          // If the session token in DB is different from the one in local state, force logout
          if (dbUser && dbUser.sessionToken && dbUser.sessionToken !== currentUser.sessionToken) {
              // Only alert if we aren't currently switching (prevents double alerts)
              if (currentUser.role !== UserRole.ADMIN) {
                  alert("You have been logged out because this account signed in on another device.");
                  handleLogout(); 
              }
          }
          // Also update local user object if roles or other details change (but token matches)
          if (dbUser && JSON.stringify(dbUser) !== JSON.stringify(currentUser)) {
              if (dbUser.sessionToken === currentUser.sessionToken) {
                 setCurrentUser(dbUser);
              }
          }
      }
  }, [users, currentUser]);

  const handleLogin = async (username: string, password: string, approvedSessionToken?: string): Promise<{ success: boolean; error?: string; pendingRequestId?: string }> => {
    // Check against real-time user list
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      // SCENARIO 1: We have been approved via a Request
      if (approvedSessionToken) {
          if (user.sessionToken === approvedSessionToken) {
              // The DB has synced, and the tokens match. Login allowed.
              setCurrentUser(user);
              // Save to Storage
              localStorage.setItem('cw_lms_active_user_id', user.id);
              localStorage.setItem('cw_lms_session_token', user.sessionToken || '');
              return { success: true };
          } else {
              // The DB has NOT synced to this client yet. 
              return { success: false, error: 'SYNC_PENDING' };
          }
      }

      // SCENARIO 2: Normal Login Attempt

      // Check if session exists (user already logged in somewhere)
      // BYPASS: Admin can login anywhere immediately
      if (user.role !== UserRole.ADMIN && user.sessionToken && user.sessionToken.length > 0) {
           // Create a pending request instead of logging in
           const requestId = generateId();
           const newSessionToken = generateId();
           
           const request: LoginRequest = {
               id: requestId,
               userId: user.id,
               username: user.username,
               newSessionToken: newSessionToken,
               status: 'PENDING',
               createdAt: new Date().toISOString(),
               timestamp: Date.now()
           };
           
           await DB.createLoginRequest(request);
           return { success: false, pendingRequestId: requestId };
      }

      // No active session OR Admin overriding, login normally
      const newToken = generateId();
      const updatedUser = { ...user, sessionToken: newToken };
      
      // Update DB with new token
      await DB.updateUser(updatedUser);
      
      setCurrentUser(updatedUser);
      // Save to Storage
      localStorage.setItem('cw_lms_active_user_id', updatedUser.id);
      localStorage.setItem('cw_lms_session_token', newToken);

      return { success: true };
    } else {
      const userExists = users.some(u => u.username === username);
      if (!userExists) {
          return { success: false, error: 'User not found. Please contact developer to get added.' };
      } else {
          return { success: false, error: 'Invalid password. Please try again.' };
      }
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
        // Clear session token in DB on logout
        const updated = { ...currentUser, sessionToken: '' };
        await DB.updateUser(updated);
    }
    setCurrentUser(null);
    // Clear Storage
    localStorage.removeItem('cw_lms_active_user_id');
    localStorage.removeItem('cw_lms_session_token');
  };

  // --- Handlers passed to Children that trigger DB calls ---

  // DB Backup
  const handleBackup = async () => {
      const json = await DB.backupDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString()}.json`;
      a.click();
  };

  const handleRestore = async (json: string) => {
      const success = await DB.restoreDatabase(json);
      if(success) alert("Database restored successfully!");
  };

  const handleReset = async () => {
      await DB.factoryReset();
  };


  if (isLoading) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center text-green-500 font-mono">
              <div className="animate-pulse text-2xl mb-4">INITIALIZING SYSTEM...</div>
              <div className="text-xs text-gray-500">Connecting to Firebase Cloud</div>
          </div>
      );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} config={config} />;
  }

  if (currentUser.role === UserRole.ADMIN) {
    return (
      <AdminPanel
        users={users}
        folders={folders}
        config={config}
        comments={comments}
        
        onAddUser={DB.addUser}
        onUpdateUser={DB.updateUser}
        onDeleteUser={DB.deleteUser}
        
        onAddFolder={DB.addFolder}
        onUpdateFolder={DB.updateFolder}
        onDeleteFolder={DB.deleteFolder}
        
        onUpdateConfig={DB.updateConfig}
        onDeleteComment={DB.deleteComment}
        onUpdateComment={DB.updateComment}
        
        onBackupDatabase={handleBackup}
        onRestoreDatabase={handleRestore}
        onResetDatabase={handleReset}
        
        onLogout={handleLogout}
      />
    );
  }

  const myProgress = progress.find(p => p.userId === currentUser.id);

  return (
    <UserDashboard
      user={currentUser}
      folders={folders}
      config={config}
      progress={myProgress}
      comments={comments}
      onUpdateProgress={DB.updateUserProgress}
      onAddComment={DB.addComment}
      onLogout={handleLogout}
    />
  );
};

export default App;