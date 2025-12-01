import React, { useState, useEffect, useRef } from 'react';
import { User, CourseFolder, AdminConfig, UserRole, Resource, Comment, AppState, Reply, LoginRequest } from '../types';
import { generateId } from '../services/storage';
import { LayoutDashboard, Users, FolderPlus, Settings, LogOut, Trash2, UserPlus, Shield, Activity, Link as LinkIcon, FileText, MessageSquare, XCircle, ChevronRight, Key, Check, X, Lock, Unlock, Database, Download, Upload, AlertTriangle, Menu, Edit, Reply as ReplyIcon, Send, Bell, Loader, PlayCircle, PlusCircle } from 'lucide-react';
import { MOCK_ONLINE_USERS_BASE } from '../constants';
import * as DB from '../services/db';

interface AdminPanelProps {
  users: User[];
  folders: CourseFolder[];
  config: AdminConfig;
  comments?: Comment[];
  
  // Granular Actions
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  
  onAddFolder: (folder: CourseFolder) => void;
  onUpdateFolder: (folder: CourseFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddMultipleResources: (folderId: string, resources: Resource[]) => Promise<void>; // New prop
  
  onUpdateConfig: (config: AdminConfig) => void;
  onDeleteComment?: (commentId: string) => void;
  onUpdateComment?: (comment: Comment) => void;
  
  onBackupDatabase: () => void;
  onRestoreDatabase: (json: string) => void;
  onResetDatabase: () => void;
  
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  folders,
  config,
  comments = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onAddMultipleResources, // New prop
  onUpdateConfig,
  onDeleteComment,
  onUpdateComment,
  onBackupDatabase,
  onRestoreDatabase,
  onResetDatabase,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'courses' | 'settings'>('dashboard');
  const [onlineUsers, setOnlineUsers] = useState(MOCK_ONLINE_USERS_BASE);

  // Sidebar State
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Security Requests
  const [pendingRequests, setPendingRequests] = useState<LoginRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const isDesktopSidebarOpen = isSidebarLocked || isSidebarHovered;

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
    }, 3000);
    
    // Subscribe to Login Requests
    const unsubRequests = DB.subscribeToAllLoginRequests(setPendingRequests);
    
    return () => {
        clearInterval(interval);
        unsubRequests();
    };
  }, []);

  // --- User Management State ---
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editingAccessUserId, setEditingAccessUserId] = useState<string | null>(null);
  
  // Edit User Credentials State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const handleAddUser = () => {
    if (!newUsername || !newPassword) return;
    const newUser: User = {
      id: generateId(),
      username: newUsername,
      password: newPassword,
      role: UserRole.USER,
      addedAt: new Date().toISOString(),
      allowedFolderIds: [], 
    };
    onAddUser(newUser);
    setNewUsername('');
    setNewPassword('');
  };

  const handleToggleAdmin = (user: User) => {
    const updated = { ...user, role: user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN };
    onUpdateUser(updated);
  };

  const handleToggleAccess = (user: User, folderId: string) => {
    const currentAccess = user.allowedFolderIds || [];
    const newAccess = currentAccess.includes(folderId)
        ? currentAccess.filter(id => id !== folderId)
        : [...currentAccess, folderId];
    onUpdateUser({ ...user, allowedFolderIds: newAccess });
  };
  
  const openEditUserModal = (user: User) => {
      setEditingUser(user);
      setEditUsername(user.username);
      setEditPassword(user.password);
  };

  const handleSaveUserEdit = () => {
      if (editingUser && editUsername && editPassword) {
          onUpdateUser({
              ...editingUser,
              username: editUsername,
              password: editPassword,
              // Reset session token on password change to force relogin
              sessionToken: '' 
          });
          setEditingUser(null);
      }
  };
  
  const handleApproveRequest = async (req: LoginRequest) => {
      await DB.approveLoginRequest(req);
  };
  
  const handleRejectRequest = async (req: LoginRequest) => {
      await DB.rejectLoginRequest(req.id);
  };

  // --- Course Management State ---
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  // Resource Form State
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState<'VIDEO' | 'FILE' | 'LINK'>('VIDEO');
  const [resUrl, setResUrl] = useState('');
  
  // File Upload State
  const [inputType, setInputType] = useState<'URL' | 'FILE'>('URL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Batch Upload State
  const [showBatchUploadModal, setShowBatchUploadModal] = useState(false);
  const [batchUploadFiles, setBatchUploadFiles] = useState<File[]>([]);
  const [batchTxtFile, setBatchTxtFile] = useState<File | null>(null);
  const [batchUploadTotalProgress, setBatchUploadTotalProgress] = useState(0);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [parsedTxtLinks, setParsedTxtLinks] = useState<Resource[]>([]);

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setBatchUploadFiles(Array.from(e.target.files));
      }
  };

  const handleTxtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          setBatchTxtFile(file);
          const reader = new FileReader();
          reader.onload = (event) => {
              const content = event.target?.result as string;
              parseTxtForLinks(content);
          };
          reader.readAsText(file);
      } else {
          setBatchTxtFile(null);
          setParsedTxtLinks([]);
      }
  };

  const parseTxtForLinks = (content: string) => {
      const lines = content.split('\n');
      const detectedResources: Resource[] = [];
      const m3u8Regex = /^(https?:\/\/.+\.m3u8(\?.+)?)$/i;
      const pdfRegex = /^(https?:\/\/.+\.pdf(\?.+)?)$/i;
      const genericUrlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i; // More general URL regex

      lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
              let type: Resource['type'] = 'LINK'; // Default to LINK
              let title = trimmedLine; // Default title is the link itself

              if (m3u8Regex.test(trimmedLine)) {
                  type = 'VIDEO';
                  title = `HLS Stream - ${trimmedLine.split('/').pop()?.split('?')[0] || 'Unknown'}`;
              } else if (pdfRegex.test(trimmedLine)) {
                  type = 'FILE';
                  title = `PDF Document - ${trimmedLine.split('/').pop()?.split('?')[0] || 'Unknown'}`;
              } else if (genericUrlRegex.test(trimmedLine)) {
                  // Try to get a better title for generic URLs
                  try {
                      const urlObj = new URL(trimmedLine);
                      title = urlObj.hostname + urlObj.pathname.split('/').pop();
                      if (title.length > 50) title = trimmedLine; // Fallback to full URL if too long
                  } catch {}
              }

              detectedResources.push({
                  id: generateId(),
                  title: title,
                  type: type,
                  url: trimmedLine,
              });
          }
      });
      setParsedTxtLinks(detectedResources);
  };


  const handleBatchAddResources = async () => {
      if (!selectedFolderId) {
          alert("Please select a course folder first.");
          return;
      }
      setIsBatchUploading(true);
      setBatchUploadTotalProgress(0);

      const newResources: Resource[] = [];
      let uploadedCount = 0;
      const totalItemsToUpload = batchUploadFiles.length;

      // 1. Upload files
      for (const file of batchUploadFiles) {
          try {
              const url = await DB.uploadResourceFile(file, selectedFolderId, (progress) => {
                  setBatchUploadTotalProgress(((uploadedCount + progress / 100) / totalItemsToUpload) * 100);
              });
              
              let type: Resource['type'];
              if (file.type.startsWith('video/')) type = 'VIDEO';
              else if (file.type === 'application/pdf') type = 'FILE';
              else type = 'FILE'; // Default for other files

              newResources.push({
                  id: generateId(),
                  title: file.name,
                  type: type,
                  url: url,
              });
              uploadedCount++;
          } catch (error) {
              console.error(`Failed to upload ${file.name}:`, error);
              // Handle error for this file, but continue with others
          }
      }

      // 2. Add parsed TXT links
      newResources.push(...parsedTxtLinks);

      // 3. Save all resources to folder
      if (newResources.length > 0) {
          try {
              await onAddMultipleResources(selectedFolderId, newResources);
              alert(`${newResources.length} resources added successfully!`);
              setShowBatchUploadModal(false);
              setBatchUploadFiles([]);
              setBatchTxtFile(null);
              setParsedTxtLinks([]);
          } catch (error) {
              console.error("Error adding multiple resources to folder:", error);
              alert("Failed to add resources to folder. Check console for details.");
          }
      } else {
          alert("No files uploaded or links parsed to add.");
      }

      setIsBatchUploading(false);
      setBatchUploadTotalProgress(0);
  };


  // Comment Reply State
  const [replyText, setReplyText] = useState<{[key: string]: string}>({});

  const handleCreateFolder = () => {
    if (!newFolderName) return;
    const newFolder: CourseFolder = {
      id: generateId(),
      name: newFolderName,
      description: newFolderDesc,
      resources: [],
      createdAt: new Date().toISOString(),
    };
    onAddFolder(newFolder);
    setNewFolderName('');
    setNewFolderDesc('');
  };

  const handleDeleteFolder = (id: string) => {
    if (window.confirm('Are you sure you want to delete this course? This cannot be undone.')) {
        if (selectedFolderId === id) setSelectedFolderId(null);
        onDeleteFolder(id);
    }
  };

  const handleEditResource = (res: Resource) => {
      setEditingResId(res.id);
      setResTitle(res.title);
      setResType(res.type);
      setResUrl(res.url);
      setInputType('URL'); // Default to URL when editing, can switch to replace
  };

  const handleCancelEditResource = () => {
      setEditingResId(null);
      setResTitle('');
      setResUrl('');
      setResType('VIDEO');
      setInputType('URL');
      setIsUploading(false);
      setUploadProgress(0);
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const fId = selectedFolderId || 'general';
      
      setIsUploading(true);
      setUploadProgress(0);
      try {
          const url = await DB.uploadResourceFile(file, fId, (progress) => {
              setUploadProgress(progress);
          });
          setResUrl(url);
          
          // Auto-detect type
          if (file.type.startsWith('video/')) {
              setResType('VIDEO');
          } else if (file.type === 'application/pdf') {
              setResType('FILE');
          } else {
              setResType('FILE'); // Default for other files
          }
          
          if (!resTitle) {
              setResTitle(file.name);
          }
      } catch (error) {
          alert("Failed to upload file. Please try again.");
          console.error(error);
      } finally {
          setIsUploading(false);
      }
  };

  const handleSaveResource = () => {
    if (!selectedFolderId || !resTitle || !resUrl) return;
    const folder = folders.find(f => f.id === selectedFolderId);
    if (!folder) return;

    let updatedResources = [...folder.resources];

    if (editingResId) {
        // Update existing
        updatedResources = updatedResources.map(r => 
            r.id === editingResId 
            ? { ...r, title: resTitle, type: resType, url: resUrl } 
            : r
        );
    } else {
        // Add new
        const newRes: Resource = {
            id: generateId(),
            title: resTitle,
            type: resType,
            url: resUrl
        };
        updatedResources.push(newRes);
    }
    
    const updatedFolder = { ...folder, resources: updatedResources };
    onUpdateFolder(updatedFolder);
    
    // Reset Form
    handleCancelEditResource();
  };

  const handleDeleteResource = (resId: string) => {
      if (!selectedFolderId) return;
      const folder = folders.find(f => f.id === selectedFolderId);
      if (!folder) return;
      
      if(window.confirm("Delete this file?")) {
          const updatedResources = folder.resources.filter(r => r.id !== resId);
          onUpdateFolder({ ...folder, resources: updatedResources });
      }
  };

  const handleReplyToComment = (commentId: string) => {
      const text = replyText[commentId];
      if(!text || !onUpdateComment) return;

      const comment = comments.find(c => c.id === commentId);
      if(!comment) return;

      const newReply: Reply = {
          id: generateId(),
          username: 'Admin',
          content: text,
          createdAt: new Date().toISOString(),
          isAdmin: true
      };

      const updatedComment = {
          ...comment,
          replies: [...(comment.replies || []), newReply]
      };

      onUpdateComment(updatedComment);
      setReplyText({ ...replyText, [commentId]: '' });
  };

  // --- Database Management Helpers ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) onRestoreDatabase(content);
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to determine active state of a tab button based on view mode
  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab; icon: any; label: string }) => {
    const isActive = activeTab === id;
    const showText = isMobileMenuOpen || isDesktopSidebarOpen;
    const paddingClass = (isDesktopSidebarOpen || isMobileMenuOpen) ? 'px-6' : 'px-0 justify-center';

    return (
      <button
        onClick={() => {
            setActiveTab(id);
            if (isMobileMenuOpen) setIsMobileMenuOpen(false); // Close mobile menu on select
        }}
        className={`w-full flex items-center py-4 mb-1 transition-all duration-200 overflow-hidden whitespace-nowrap ${
          isActive
            ? 'text-hacker-green bg-green-900/20 border-l-4 border-hacker-green'
            : 'text-gray-400 hover:text-white hover:bg-gray-900'
        } ${paddingClass}`}
        title={!showText ? label : ''}
      >
        <Icon className={`h-5 w-5 flex-shrink-0 ${showText ? 'mr-3' : ''} ${isActive ? 'animate-pulse' : ''}`} />
        <span className={`font-medium tracking-wide transition-opacity duration-300 ${showText ? 'opacity-100' : 'opacity-0 hidden lg:hidden'}`}>
           {showText && label}
        </span>
        {isActive && showText && <ChevronRight className="ml-auto h-4 w-4" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans flex overflow-hidden relative">
      
      {/* Mobile Toggle Button (Visible only < lg) */}
      <button 
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-gray-900 text-hacker-green rounded-md border border-gray-700 shadow-lg lg:hidden hover:bg-gray-800"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
            fixed lg:relative top-0 left-0 h-full z-50 lg:z-auto
            bg-black border-r border-gray-800 flex flex-col shadow-2xl transition-all duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'} 
            ${isDesktopSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
        `}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className={`p-6 flex items-center ${isDesktopSidebarOpen || isMobileMenuOpen ? 'justify-between' : 'justify-center'}`}>
           <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-hacker-green rounded-lg flex items-center justify-center text-black font-bold flex-shrink-0">
                CV
                </div>
                <span className={`text-xl font-bold text-white tracking-tight whitespace-nowrap transition-opacity duration-300 ${(isDesktopSidebarOpen || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    Admin Panel
                </span>
           </div>
           
           {/* Mobile Close Button */}
           <button 
             onClick={() => setIsMobileMenuOpen(false)}
             className="lg:hidden text-gray-500 hover:text-white"
           >
             <X className="h-6 w-6" />
           </button>

           {/* Desktop Lock Button */}
           {(isDesktopSidebarOpen) && (
               <button 
                onClick={() => setIsSidebarLocked(!isSidebarLocked)}
                className="hidden lg:block text-gray-500 hover:text-hacker-green transition-colors"
                title={isSidebarLocked ? "Unlock Sidebar" : "Lock Sidebar Open"}
               >
                   {isSidebarLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
               </button>
           )}
        </div>
        
        {(isDesktopSidebarOpen || isMobileMenuOpen) && (
            <p className="text-xs text-gray-500 px-6 mb-2 transition-opacity duration-300 delay-100 whitespace-nowrap">
                System v3.0 (Online)
            </p>
        )}

        <nav className="flex-1 py-4 overflow-hidden overflow-y-auto hacker-scroll">
          <TabButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <TabButton id="users" icon={Users} label="Users" />
          <TabButton id="courses" icon={FolderPlus} label="Courses" />
          <TabButton id="settings" icon={Settings} label="Settings" />
        </nav>

        <div className="p-6 border-t border-gray-900">
          <button
            onClick={onLogout}
            className={`w-full flex items-center rounded-lg border border-red-900/30 text-red-500 hover:bg-red-900/10 hover:border-red-900/50 transition-all font-medium text-sm ${(isDesktopSidebarOpen || isMobileMenuOpen) ? 'justify-center p-3' : 'justify-center p-2'}`}
          >
            <LogOut className={`h-4 w-4 flex-shrink-0 ${(isDesktopSidebarOpen || isMobileMenuOpen) ? 'mr-2' : ''}`} />
            <span className={`${(isDesktopSidebarOpen || isMobileMenuOpen) ? 'block' : 'hidden'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-0 bg-gradient-to-br from-[#0a0a0a] to-[#111] w-full">
        {/* Top Notification Bar for Admin */}
        <div className="absolute top-4 right-4 z-40">
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-gray-900 rounded-full border border-gray-700 hover:border-hacker-green text-gray-300 hover:text-white transition-all"
            >
                <Bell className="h-5 w-5" />
                {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full text-[10px] flex items-center justify-center font-bold text-white animate-pulse">
                        {pendingRequests.length}
                    </span>
                )}
            </button>
            
            {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#111] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-800 font-bold text-white flex justify-between items-center">
                        <span>Security Requests</span>
                        <button onClick={() => setShowNotifications(false)}><X className="h-4 w-4"/></button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {pendingRequests.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No pending login requests.</div>
                        ) : (
                            pendingRequests.map(req => (
                                <div key={req.id} className="p-3 border-b border-gray-800/50 hover:bg-gray-900 transition-colors">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-hacker-green font-bold text-sm">{req.username}</span>
                                        <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-3">Login attempt from new session.</p>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => handleApproveRequest(req)}
                                            className="flex-1 bg-green-900/30 text-green-400 border border-green-900/50 hover:bg-green-900/50 rounded py-1 text-xs font-bold"
                                        >
                                            Allow
                                        </button>
                                        <button 
                                            onClick={() => handleRejectRequest(req)}
                                            className="flex-1 bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 rounded py-1 text-xs font-bold"
                                        >
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 md:p-10 pt-16 lg:pt-10">
            {/* Header */}
            <header className="mb-12">
            <h1 className="text-3xl font-bold text-white mb-2">
                {activeTab === 'dashboard' && 'Overview'}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'courses' && 'Course Management'}
                {activeTab === 'settings' && 'Configuration'}
            </h1>
            <p className="text-gray-500">Connected to Firebase Cloud Database.</p>
            </header>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/40 backdrop-blur-sm border border-gray-800 p-6 rounded-xl hover:border-hacker-green/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="h-20 w-20 text-hacker-green" />
                    </div>
                    <div className="text-gray-400 text-sm font-medium mb-2">Total Users</div>
                    <div className="text-4xl font-bold text-white group-hover:text-hacker-green transition-colors">{users.length}</div>
                </div>
                
                <div className="bg-black/40 backdrop-blur-sm border border-gray-800 p-6 rounded-xl hover:border-hacker-green/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="h-20 w-20 text-hacker-green" />
                    </div>
                    <div className="text-gray-400 text-sm font-medium mb-2">Online Now</div>
                    <div className="text-4xl font-bold text-white group-hover:text-hacker-green transition-colors">{onlineUsers}</div>
                </div>
                
                <div className="bg-black/40 backdrop-blur-sm border border-gray-800 p-6 rounded-xl hover:border-hacker-green/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FolderPlus className="h-20 w-20 text-hacker-green" />
                    </div>
                    <div className="text-gray-400 text-sm font-medium mb-2">Active Courses</div>
                    <div className="text-4xl font-bold text-white group-hover:text-hacker-green transition-colors">{folders.length}</div>
                </div>
            </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
            <div className="space-y-8 relative">
                
                {/* User Access Modal */}
                {editingAccessUserId && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-[#111] border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Manage Course Access</h3>
                                <button onClick={() => setEditingAccessUserId(null)} className="text-gray-500 hover:text-white">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                <div className="space-y-2">
                                    {folders.map(folder => {
                                        const user = users.find(u => u.id === editingAccessUserId);
                                        const hasAccess = user?.allowedFolderIds?.includes(folder.id);
                                        if (!user) return null;
                                        return (
                                            <div 
                                                key={folder.id} 
                                                onClick={() => handleToggleAccess(user, folder.id)}
                                                className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                                                    hasAccess 
                                                    ? 'border-hacker-green bg-green-900/20' 
                                                    : 'border-gray-800 bg-black/40 hover:bg-gray-900'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                                                    hasAccess ? 'bg-hacker-green border-hacker-green text-black' : 'border-gray-600'
                                                }`}>
                                                    {hasAccess && <Check className="h-3 w-3" />}
                                                </div>
                                                <div className="font-medium text-white">{folder.name}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit User Modal */}
                {editingUser && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-[#111] border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Edit User Credentials</h3>
                                <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-white">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">New Password</label>
                                    <input
                                        type="text"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                                    />
                                </div>
                                <div className="pt-4 flex justify-end space-x-3">
                                    <button 
                                        onClick={() => setEditingUser(null)}
                                        className="px-4 py-2 rounded text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveUserEdit}
                                        className="px-6 py-2 bg-hacker-green text-black font-bold rounded hover:bg-green-400"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-black/40 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center"><UserPlus className="mr-2 h-5 w-5 text-hacker-green" /> Add New User</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                    type="text"
                    placeholder="Username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                    />
                    <input
                    type="text"
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                    />
                    <button
                    onClick={handleAddUser}
                    className="bg-hacker-green text-black font-bold rounded-lg px-4 py-3 hover:bg-green-400 transition-all"
                    >
                    Add User
                    </button>
                </div>
                </div>

                <div className="bg-black/40 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-gray-900/50 text-gray-400">
                    <tr>
                        <th className="p-5 font-medium">Username</th>
                        <th className="p-5 font-medium">Role</th>
                        <th className="p-5 font-medium">Access</th>
                        <th className="p-5 font-medium text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="p-5 font-medium text-white">{user.username}</td>
                        <td className="p-5">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                user.role === UserRole.ADMIN 
                                ? 'bg-yellow-900/30 text-yellow-500' 
                                : 'bg-blue-900/30 text-blue-500'
                            }`}>
                            {user.role}
                            </span>
                        </td>
                        <td className="p-5">
                            {user.role === UserRole.ADMIN ? (
                                <span className="text-yellow-500 text-xs">Full Access</span>
                            ) : (
                                <button 
                                    onClick={() => setEditingAccessUserId(user.id)}
                                    className="flex items-center text-xs text-hacker-green border border-green-900 bg-green-900/10 px-2 py-1 rounded hover:bg-green-900/30 transition-colors"
                                >
                                    <Key className="h-3 w-3 mr-1" /> 
                                    {user.allowedFolderIds?.length || 0} Courses
                                </button>
                            )}
                        </td>
                        <td className="p-5 text-right space-x-2">
                            <button onClick={() => openEditUserModal(user)} className="p-2 text-gray-400 hover:text-blue-400" title="Edit Credentials">
                                <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleToggleAdmin(user)} className="p-2 text-gray-400 hover:text-yellow-400" title="Toggle Admin">
                                <Shield className="h-4 w-4" />
                            </button>
                            <button onClick={() => onDeleteUser(user.id)} className="p-2 text-gray-400 hover:text-red-400" title="Delete User">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
            )}

            {/* Courses Tab */}
            {activeTab === 'courses' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Left: Folder List */}
                <div className="space-y-6 h-full flex flex-col order-2 lg:order-1">
                <div className="bg-black/40 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-white">Create Course Folder</h3>
                    <div className="space-y-4">
                        <input
                        type="text"
                        placeholder="Folder Name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                        />
                        <input
                        type="text"
                        placeholder="Description"
                        value={newFolderDesc}
                        onChange={(e) => setNewFolderDesc(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                        />
                        <button
                        onClick={handleCreateFolder}
                        className="w-full bg-hacker-green text-black font-bold rounded-lg px-4 py-3 hover:bg-green-400 transition-all"
                        >
                        Create Folder
                        </button>
                    </div>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 max-h-[500px]">
                    {folders.map(folder => (
                        <div 
                            key={folder.id} 
                            className={`p-4 rounded-lg border transition-all flex justify-between items-center ${
                                selectedFolderId === folder.id 
                                ? 'border-hacker-green bg-green-900/10' 
                                : 'border-gray-800 bg-black/40 hover:border-gray-600'
                            }`}
                        >
                            <div onClick={() => setSelectedFolderId(folder.id)} className="cursor-pointer flex-1">
                                <div className="font-bold text-white flex items-center">
                                    <FolderPlus className={`h-4 w-4 mr-2 ${selectedFolderId === folder.id ? 'text-hacker-green' : 'text-gray-500'}`}/> 
                                    {folder.name}
                                </div>
                                <div className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">{folder.description}</div>
                            </div>
                            <button 
                                onClick={() => handleDeleteFolder(folder.id)}
                                className="text-gray-600 hover:text-red-500 p-1"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
                </div>

                {/* Right: Resource & Comment Management */}
                <div className="bg-black/40 border border-gray-800 rounded-xl p-6 flex flex-col h-full max-h-[800px] overflow-hidden order-1 lg:order-2">
                    {selectedFolderId ? (
                        <>
                            <h3 className="text-lg font-semibold mb-6 text-white border-b border-gray-800 pb-4">
                                Managing: <span className="text-hacker-green">{folders.find(f => f.id === selectedFolderId)?.name}</span>
                            </h3>
                            
                            <div className="flex-1 overflow-y-auto pr-2 hacker-scroll">
                                <div className="mb-8 space-y-3 bg-gray-900/30 p-4 rounded-lg border border-gray-800/50">
                                    <h4 className="text-sm font-bold text-gray-400 mb-2">
                                        {editingResId ? 'Update Resource' : 'Add New Resource'}
                                    </h4>
                                    <input
                                        type="text"
                                        placeholder="Resource Title"
                                        value={resTitle}
                                        onChange={(e) => setResTitle(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-hacker-green outline-none"
                                    />
                                    
                                    <div className="flex space-x-2 my-1">
                                        <button 
                                            onClick={() => setInputType('URL')} 
                                            className={`flex-1 text-xs px-2 py-1 rounded border transition-colors ${inputType === 'URL' ? 'bg-hacker-green text-black border-hacker-green' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                                        >
                                            External URL
                                        </button>
                                        <button 
                                            onClick={() => setInputType('FILE')} 
                                            className={`flex-1 text-xs px-2 py-1 rounded border transition-colors ${inputType === 'FILE' ? 'bg-hacker-green text-black border-hacker-green' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                                        >
                                            Upload File
                                        </button>
                                    </div>

                                    <div className="flex space-x-2 items-center">
                                        <select 
                                            value={resType}
                                            onChange={(e: any) => setResType(e.target.value)}
                                            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 outline-none w-24 h-full"
                                        >
                                            <option value="VIDEO">Video</option>
                                            <option value="FILE">File</option>
                                            <option value="LINK">Link</option>
                                        </select>
                                        
                                        {inputType === 'URL' ? (
                                            <input
                                                type="text"
                                                placeholder="https://..."
                                                value={resUrl}
                                                onChange={(e) => setResUrl(e.target.value)}
                                                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-hacker-green outline-none"
                                            />
                                        ) : (
                                            <div className="flex-1 relative group">
                                                <input 
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    disabled={isUploading}
                                                    className="hidden" 
                                                    id="file-upload"
                                                />
                                                <label 
                                                    htmlFor="file-upload"
                                                    className={`flex items-center justify-center w-full px-4 py-2 border border-dashed rounded cursor-pointer transition-colors ${
                                                        resUrl 
                                                        ? 'border-hacker-green bg-green-900/10 text-hacker-green' 
                                                        : 'border-gray-600 bg-gray-900 text-gray-400 hover:bg-gray-800'
                                                    }`}
                                                >
                                                    {isUploading ? (
                                                         <div className="flex items-center">
                                                            <Loader className="h-4 w-4 animate-spin mr-2" />
                                                            <span>{Math.round(uploadProgress)}%</span>
                                                         </div>
                                                    ) : resUrl ? (
                                                        <div className="flex items-center overflow-hidden">
                                                            <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                                                            <span className="truncate text-xs max-w-[150px]">File Ready</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center">
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            <span>Choose File</span>
                                                        </div>
                                                    )}
                                                </label>
                                                
                                                {/* Progress Bar background if uploading */}
                                                {isUploading && (
                                                     <div className="absolute bottom-0 left-0 h-1 bg-hacker-green transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleSaveResource}
                                            disabled={isUploading}
                                            className="flex-1 border border-dashed border-gray-600 text-gray-400 hover:text-hacker-green hover:border-hacker-green rounded px-3 py-2 text-sm disabled:opacity-50"
                                        >
                                            {editingResId ? 'Update Resource' : '+ Add Resource'}
                                        </button>
                                        {editingResId && (
                                             <button
                                                onClick={handleCancelEditResource}
                                                className="border border-dashed border-red-900 text-red-500 hover:bg-red-900/20 rounded px-3 py-2 text-sm"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* Batch Upload Button */}
                                <button 
                                    onClick={() => setShowBatchUploadModal(true)}
                                    disabled={!selectedFolderId}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-900/20 text-blue-400 border border-blue-900/50 hover:bg-blue-900/40 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <PlusCircle className="h-4 w-4 mr-2" /> Batch Add Resources
                                </button>

                                <div className="space-y-2 mb-8 mt-8">
                                    <h4 className="text-sm font-bold text-gray-400 mb-2">Current Resources</h4>
                                    {folders.find(f => f.id === selectedFolderId)?.resources.map((res) => (
                                        <div key={res.id} className="flex items-center justify-between p-3 bg-black/50 border border-gray-800 rounded hover:border-gray-600">
                                            <div className="flex items-center overflow-hidden mr-2">
                                                {res.type === 'VIDEO' && <PlayCircle className="h-4 w-4 mr-3 text-purple-500 flex-shrink-0"/>}
                                                {res.type === 'FILE' && <FileText className="h-4 w-4 mr-3 text-blue-500 flex-shrink-0"/>}
                                                {res.type === 'LINK' && <LinkIcon className="h-4 w-4 mr-3 text-yellow-500 flex-shrink-0"/>}
                                                <div className="text-sm font-medium text-gray-200 truncate">{res.title}</div>
                                            </div>
                                            <div className="flex space-x-1 flex-shrink-0">
                                                <button 
                                                    onClick={() => handleEditResource(res)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteResource(res.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-gray-800 pt-4">
                                    <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center">
                                        <MessageSquare className="h-4 w-4 mr-2" /> Comments (Moderation)
                                    </h4>
                                    <div className="space-y-3">
                                        {comments.filter(c => c.folderId === selectedFolderId).map(comment => (
                                            <div key={comment.id} className="bg-gray-900/50 p-3 rounded border border-gray-800">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="text-xs text-hacker-green font-bold mb-1">{comment.username}</div>
                                                        <p className="text-sm text-gray-300">{comment.content}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => onDeleteComment && onDeleteComment(comment.id)}
                                                        className="text-gray-600 hover:text-red-500 p-1"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                
                                                {/* Reply Section */}
                                                <div className="mt-3 pl-4 border-l-2 border-gray-800">
                                                    {comment.replies && comment.replies.map(reply => (
                                                        <div key={reply.id} className="text-xs text-gray-400 mb-1 flex items-center">
                                                            <ReplyIcon className="h-3 w-3 mr-1 text-gray-600" />
                                                            <span className="text-blue-400 font-bold mr-1">{reply.username}:</span> 
                                                            {reply.content}
                                                        </div>
                                                    ))}
                                                    <div className="flex mt-2">
                                                        <input 
                                                            type="text" 
                                                            value={replyText[comment.id] || ''}
                                                            onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                                                            placeholder="Reply as Admin..."
                                                            className="flex-1 bg-black border border-gray-700 rounded-l px-2 py-1 text-xs text-white focus:border-hacker-green outline-none"
                                                        />
                                                        <button 
                                                            onClick={() => handleReplyToComment(comment.id)}
                                                            className="bg-gray-800 hover:bg-hacker-green hover:text-black text-gray-300 border border-gray-700 border-l-0 rounded-r px-2 py-1 text-xs"
                                                        >
                                                            <Send className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                            <FolderPlus className="h-16 w-16 mb-4 opacity-20" />
                            <p>Select a folder to manage contents</p>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-8">
                    {/* System Config */}
                    <div className="bg-black/40 border border-gray-800 rounded-xl p-8">
                        <h3 className="text-xl font-bold mb-6 text-white">System Configuration</h3>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-hacker-green uppercase tracking-wider mb-2">Social Links</h4>
                                {[
                                    { key: 'instagram', label: 'Instagram URL' },
                                    { key: 'telegram', label: 'Telegram URL' },
                                    { key: 'youtube', label: 'YouTube URL' },
                                    { key: 'linkedin', label: 'LinkedIn URL' },
                                ].map((field) => (
                                    <div key={field.key}>
                                        <label className="block text-xs text-gray-500 mb-1 ml-1">{field.label}</label>
                                        <input 
                                            type="text"
                                            value={(config as any)[field.key]}
                                            onChange={(e) => onUpdateConfig({ ...config, [field.key]: e.target.value })}
                                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4 pt-4 border-t border-gray-800">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1 ml-1">Contact / Join Link</label>
                                    <input 
                                        type="text"
                                        value={config.joinLink}
                                        onChange={(e) => onUpdateConfig({ ...config, joinLink: e.target.value })}
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Database Management */}
                    <div className="bg-black/40 border border-gray-800 rounded-xl p-8 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-6 opacity-10">
                             <Database className="h-32 w-32 text-hacker-green" />
                         </div>
                         <h3 className="text-xl font-bold mb-6 text-white flex items-center">
                             <Database className="h-5 w-5 mr-2 text-hacker-green" /> Database Management
                         </h3>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <button 
                                onClick={onBackupDatabase}
                                className="flex items-center justify-center px-4 py-4 bg-gray-900 border border-gray-700 hover:border-hacker-green rounded-xl transition-all group"
                             >
                                 <Download className="h-5 w-5 mr-3 text-hacker-green" />
                                 <div className="text-left">
                                     <div className="text-sm font-bold text-white">Backup Database</div>
                                 </div>
                             </button>

                             <div className="relative">
                                 <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept=".json" 
                                    onChange={handleFileImport}
                                    className="hidden" 
                                 />
                                 <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center justify-center px-4 py-4 bg-gray-900 border border-gray-700 hover:border-blue-500 rounded-xl transition-all group h-full"
                                 >
                                    <Upload className="h-5 w-5 mr-3 text-blue-500" />
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-white">Restore Database</div>
                                    </div>
                                 </button>
                             </div>
                         </div>
                         
                         <div className="mt-6 pt-6 border-t border-gray-800">
                             <button 
                                onClick={() => { if(window.confirm("RESET DATABASE?")) onResetDatabase(); }}
                                className="w-full flex items-center justify-center px-4 py-3 bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-900/30 rounded-lg transition-all text-sm font-bold"
                             >
                                 <AlertTriangle className="h-4 w-4 mr-2" /> Factory Reset
                             </button>
                         </div>
                    </div>
            </div>
            )}
        </div>
      </main>

      {/* Batch Upload Modal */}
      {showBatchUploadModal && selectedFolderId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-[#111] border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl">
                  <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white">Batch Add Resources to {folders.find(f => f.id === selectedFolderId)?.name}</h3>
                      <button onClick={() => setShowBatchUploadModal(false)} className="text-gray-500 hover:text-white">
                          <X className="h-6 w-6" />
                      </button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div>
                          <label className="block text-sm text-gray-400 mb-2">Upload Multiple Files (Video, PDF, etc.)</label>
                          <input 
                              type="file"
                              multiple
                              onChange={handleBatchFileChange}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                              disabled={isBatchUploading}
                          />
                          {batchUploadFiles.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2">{batchUploadFiles.length} files selected.</p>
                          )}
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-2">Upload .TXT file to parse links (m3u8, pdf)</label>
                          <input 
                              type="file"
                              accept=".txt"
                              onChange={handleTxtFileChange}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-hacker-green outline-none"
                              disabled={isBatchUploading}
                          />
                          {batchTxtFile && (
                            <p className="text-xs text-gray-500 mt-2">1 TXT file selected ({batchTxtFile.name}).</p>
                          )}
                          {parsedTxtLinks.length > 0 && (
                            <div className="text-xs text-hacker-green mt-2">Detected {parsedTxtLinks.length} links from TXT.</div>
                          )}
                      </div>

                      {isBatchUploading && (
                          <div className="w-full bg-gray-800 rounded-full h-3">
                              <div className="bg-hacker-green h-3 rounded-full transition-all duration-300" style={{ width: `${batchUploadTotalProgress}%` }}></div>
                          </div>
                      )}

                      <div className="pt-4 flex justify-end space-x-3">
                          <button 
                              onClick={() => setShowBatchUploadModal(false)}
                              className="px-4 py-2 rounded text-gray-400 hover:text-white"
                              disabled={isBatchUploading}
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={handleBatchAddResources}
                              className="px-6 py-2 bg-hacker-green text-black font-bold rounded hover:bg-green-400"
                              disabled={isBatchUploading || (batchUploadFiles.length === 0 && parsedTxtLinks.length === 0)}
                          >
                              {isBatchUploading ? <Loader className="h-4 w-4 animate-spin mr-2 inline" /> : null}
                              {isBatchUploading ? `Uploading (${Math.round(batchUploadTotalProgress)}%)` : `Add All (${batchUploadFiles.length + parsedTxtLinks.length})`}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;