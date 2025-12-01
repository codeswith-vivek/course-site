
import React, { useState, useMemo, useEffect } from 'react';
import { CourseFolder, User, AdminConfig, UserProgress, Comment, UserRole, LoginRequest, Resource } from '../types';
import { LogOut, Folder, FileText, ExternalLink, ChevronRight, ArrowLeft, Youtube, Linkedin, Send, Instagram, CheckCircle, Search, MessageSquare, SendHorizontal, Lock, Download, MessageCircle, ShieldCheck, ShieldAlert, PlayCircle, X } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import * as DB from '../services/db';

interface UserDashboardProps {
  user: User;
  folders: CourseFolder[];
  config: AdminConfig;
  progress?: UserProgress;
  comments: Comment[];
  
  onUpdateProgress: (progress: UserProgress) => void;
  onAddComment: (comment: Comment) => void;
  onLogout: () => void;
}

interface CourseCardProps {
  folder: CourseFolder;
  locked?: boolean;
  percent: number;
  onClick: (folder: CourseFolder) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ folder, locked, percent, onClick }) => {
  return (
    <div 
        onClick={() => onClick(folder)}
        className={`group bg-white rounded-2xl p-6 shadow-[0_10px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer border border-slate-100 transform hover:-translate-y-2 relative overflow-hidden flex flex-col ${locked ? 'opacity-75 grayscale-[0.5] hover:grayscale-0' : ''}`}
    >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full transform translate-x-12 -translate-y-12 opacity-10 group-hover:scale-150 transition-transform duration-500 ${locked ? 'bg-slate-500' : 'bg-indigo-600'}`}></div>
            
            <div className="relative z-10 flex-1">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-4 rounded-2xl inline-block transition-colors duration-300 ${locked ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                    {locked ? <Lock className="h-8 w-8" /> : <Folder className="h-8 w-8" />}
                </div>
                {!locked && (
                    <div className="text-right">
                        <div className="text-2xl font-bold text-slate-800">{percent}%</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Complete</div>
                    </div>
                )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{folder.name}</h3>
            <p className="text-slate-500 text-sm line-clamp-2 mb-4">{folder.description}</p>
            
            {!locked && (
                <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                    ></div>
                </div>
            )}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 relative z-10">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {folder.resources.length} Resources
            </span>
            <span className={`flex items-center text-sm font-bold group-hover:translate-x-1 transition-transform ${locked ? 'text-slate-500' : 'text-indigo-600'}`}>
                {locked ? 'Locked' : 'Open'} <ChevronRight className="h-4 w-4 ml-1" />
            </span>
        </div>
    </div>
  );
};

const UserDashboard: React.FC<UserDashboardProps> = ({ 
  user, 
  folders, 
  config, 
  progress, 
  comments, 
  onUpdateProgress, 
  onAddComment, 
  onLogout 
}) => {
  const [activeFolder, setActiveFolder] = useState<CourseFolder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState('');
  
  // Login Request Alerts
  const [loginRequests, setLoginRequests] = useState<LoginRequest[]>([]);

  // Video Player Modal State
  const [selectedVideoResource, setSelectedVideoResource] = useState<Resource | null>(null);


  useEffect(() => {
      // Listen for people trying to hack this account
      const unsub = DB.subscribeToUserLoginRequests(user.id, setLoginRequests);
      return () => unsub();
  }, [user.id]);

  const handleApproveRequest = async (req: LoginRequest) => {
      if(window.confirm("Approving this will log you out immediately. Continue?")) {
         await DB.approveLoginRequest(req);
      }
  };

  const handleRejectRequest = async (req: LoginRequest) => {
      await DB.rejectLoginRequest(req.id);
  };

  const hasAccess = (folderId: string) => {
    if (user.role === UserRole.ADMIN) return true;
    return user.allowedFolderIds?.includes(folderId);
  };

  const handleFolderClick = (folder: CourseFolder) => {
      if (hasAccess(folder.id)) {
          setActiveFolder(folder);
      } else {
          alert("You do not have access to this course. Please contact the admin.");
      }
  };

  const handleContactAdmin = () => {
    const link = config.joinLink || 'https://t.me/codewithvivek';
    window.open(link, '_blank');
  };

  const getFolderProgress = (folder: CourseFolder) => {
    if (!folder.resources.length) return 0;
    const completedCount = folder.resources.filter(res => 
      progress?.completedResourceIds.includes(res.id)
    ).length;
    return Math.round((completedCount / folder.resources.length) * 100);
  };

  const { myCourses, allCourses } = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    const searched = folders.filter(folder => {
      const matchesFolder = folder.name.toLowerCase().includes(query) || folder.description.toLowerCase().includes(query);
      const matchesResource = folder.resources.some(res => res.title.toLowerCase().includes(query));
      return !query || matchesFolder || matchesResource;
    });

    const my = searched.filter(f => hasAccess(f.id));
    const all = searched.filter(f => !hasAccess(f.id));

    return { myCourses: my, allCourses: all };
  }, [folders, searchQuery, user]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolder || !newComment.trim()) return;
    
    // Create comment object to pass to parent
    const comment: Comment = {
        id: Math.random().toString(36).substr(2, 9),
        folderId: activeFolder.id,
        userId: user.id,
        username: user.username,
        content: newComment,
        createdAt: new Date().toISOString(),
        replies: []
    };
    
    onAddComment(comment);
    setNewComment('');
  };
  
  const handleToggleProgress = (resourceId: string) => {
      const completed = progress?.completedResourceIds || [];
      const newCompleted = completed.includes(resourceId) 
        ? completed.filter(id => id !== resourceId) 
        : [...completed, resourceId];
      
      onUpdateProgress({
          userId: user.id,
          completedResourceIds: newCompleted
      });
  };

  const activeComments = activeFolder ? comments.filter(c => c.folderId === activeFolder.id) : [];

  const SocialIcon = ({ type, url }: { type: string, url: string }) => {
      if (!url) return null;
      let Icon = ExternalLink;
      if(type === 'youtube') Icon = Youtube;
      if(type === 'linkedin') Icon = Linkedin;
      if(type === 'telegram') Icon = Send;
      if(type === 'instagram') Icon = Instagram;

      return (
          <a href={url} target="_blank" rel="noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
              <Icon className="h-5 w-5" />
          </a>
      );
  };

  // Helper to determine if a resource is playable in VideoPlayer
  const isPlayableResource = (resource: Resource) => {
    const isTelegram = resource.url.includes('t.me');
    const isYouTube = resource.url.includes('youtube.com') || resource.url.includes('youtu.be');
    const isHls = resource.url.includes('.m3u8');
    const isDirectVideo = resource.type === 'VIDEO'; 
    // Generic iframe link, explicitly excluding PDFs and other docs to force them to open as files
    const isGenericIframe = resource.type === 'LINK' && (resource.url.startsWith('http') && !resource.url.match(/\.(pdf|zip|rar|doc|docx|xls|xlsx|ppt|pptx)(?:\?|$|#)/i));
    
    return isTelegram || isYouTube || isHls || isDirectVideo || isGenericIframe;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      
      {/* Security Alert Modal */}
      {loginRequests.length > 0 && (
          <div className="fixed inset-0 z-[100] bg-red-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-red-500 overflow-hidden">
                  <div className="bg-red-500 p-4 flex items-center justify-center">
                      <ShieldAlert className="h-12 w-12 text-white animate-pulse" />
                  </div>
                  <div className="p-6 text-center">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Security Alert</h2>
                      <p className="text-slate-600 mb-6">
                          Someone is trying to log in to your account from another device.
                      </p>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6">
                          <p className="text-xs text-slate-500 font-mono">Attempt Time: {new Date(loginRequests[0].createdAt).toLocaleTimeString()}</p>
                      </div>
                      
                      <div className="flex space-x-3">
                          <button 
                             onClick={() => handleRejectRequest(loginRequests[0])}
                             className="flex-1 py-3 bg-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-300 transition-colors"
                          >
                              Block Access
                          </button>
                          <button 
                             onClick={() => handleApproveRequest(loginRequests[0])}
                             className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                          >
                              Allow (Logout Me)
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Video Player Modal */}
      {selectedVideoResource && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div className="relative w-full max-w-4xl max-h-full aspect-video"> 
                  <button 
                      onClick={() => setSelectedVideoResource(null)}
                      className="absolute -top-10 right-0 p-2 text-white hover:text-indigo-400 transition-colors z-50"
                  >
                      <X className="h-8 w-8" />
                  </button>
                  <VideoPlayer url={selectedVideoResource.url} title={selectedVideoResource.title} autoPlay={true} />
              </div>
          </div>
      )}

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setActiveFolder(null)}>
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold mr-3">
                    CV
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 hidden md:block">
                    {config.siteName} {/* Dynamic site name */}
                </span>
            </div>

            <div className="flex-1 max-w-md mx-4 relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-900" />
                    <input 
                        type="text" 
                        placeholder="Search courses..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 text-slate-900 placeholder-slate-500 border-none rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <div className="hidden md:block text-right mr-2">
                    <div className="text-sm font-bold text-slate-800">{user.username}</div>
                    <div className="text-xs text-slate-500">Student Account</div>
                </div>
                <button 
                    onClick={onLogout}
                    className="p-2 rounded-full bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeFolder ? (
            <div className="space-y-12">
                <section>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3">
                            <Folder className="h-6 w-6" />
                        </span>
                        My Courses
                    </h2>
                    
                    {myCourses.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                             <div 
                                onClick={handleContactAdmin}
                                className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-indigo-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group h-64"
                            >
                                <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                    <MessageCircle className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">No Courses Yet</h3>
                                <p className="text-slate-500 text-sm mb-4">Contact admin to get access to premium courses.</p>
                                <button className="text-indigo-600 font-bold text-sm flex items-center">
                                    Contact Developer <ChevronRight className="h-4 w-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {myCourses.map((folder) => (
                                <CourseCard 
                                    key={folder.id} 
                                    folder={folder} 
                                    percent={getFolderProgress(folder)}
                                    onClick={handleFolderClick}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <div className="flex items-center justify-between mb-6 border-t border-slate-200 pt-10">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                            <span className="bg-slate-100 text-slate-600 p-2 rounded-lg mr-3">
                                <Search className="h-6 w-6" />
                            </span>
                            Explore All Courses
                        </h2>
                    </div>

                    {allCourses.length === 0 ? (
                         <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                            <p className="text-slate-500 italic">You have enrolled in all available courses!</p>
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {allCourses.map((folder) => (
                                <CourseCard 
                                    key={`all-${folder.id}`} 
                                    folder={folder} 
                                    locked={true} 
                                    percent={getFolderProgress(folder)}
                                    onClick={handleFolderClick}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        ) : (
            <div className="animate-fadeIn pb-20">
                <button 
                    onClick={() => setActiveFolder(null)}
                    className="mb-6 flex items-center text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" /> Back to Courses
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <h2 className="text-3xl font-bold mb-2 relative z-10">{activeFolder.name}</h2>
                                <p className="text-indigo-100 relative z-10">{activeFolder.description}</p>
                                <div className="mt-6 flex items-center relative z-10">
                                    <div className="flex-1 mr-4">
                                        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-white/90 rounded-full transition-all duration-500"
                                                style={{ width: `${getFolderProgress(activeFolder)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold">{getFolderProgress(activeFolder)}% Completed</span>
                                </div>
                            </div>

                            <div className="p-8">
                                {activeFolder.resources.length > 0 ? (
                                    <div className="space-y-8">
                                        {activeFolder.resources.map((res) => {
                                            const isCompleted = progress?.completedResourceIds.includes(res.id);
                                            // Determine if this resource should open the video player modal
                                            const showAsPlayableCard = isPlayableResource(res);

                                            return (
                                                <div key={res.id} className="border-b border-slate-100 pb-6 last:border-0">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                                                            <button
                                                                onClick={() => handleToggleProgress(res.id)}
                                                                className={`mr-3 transition-colors ${isCompleted ? 'text-green-500' : 'text-slate-300 hover:text-indigo-500'}`}
                                                            >
                                                                <CheckCircle className={`h-6 w-6 ${isCompleted ? 'fill-current' : ''}`} />
                                                            </button>
                                                            {res.title}
                                                        </h3>
                                                        
                                                        {res.type === 'FILE' && !showAsPlayableCard && (
                                                            <a 
                                                                href={res.url} 
                                                                download
                                                                target="_blank"
                                                                className="flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                                                            >
                                                                <Download className="h-3 w-3 mr-1" /> Download
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="pl-9">
                                                        {showAsPlayableCard ? (
                                                            // New compact display for playable resources
                                                            <div 
                                                                onClick={() => setSelectedVideoResource(res)}
                                                                className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center hover:bg-indigo-50 transition-colors cursor-pointer group"
                                                            >
                                                                <div className="p-3 rounded-lg mr-4 bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                    <PlayCircle className="h-6 w-6" /> {/* Smaller play icon */}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">{res.type} Resource</div>
                                                                    <span className="text-indigo-600 font-bold group-hover:text-indigo-800 transition-colors flex items-center">
                                                                        {res.title} <PlayCircle className="inline h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" /> {/* Small play icon on hover */}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // Standard File/Link (Includes PDFs now)
                                                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center hover:bg-slate-100 transition-colors">
                                                                <div className={`p-3 rounded-lg mr-4 ${
                                                                    res.type === 'FILE' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
                                                                }`}>
                                                                    {res.type === 'FILE' ? <FileText className="h-6 w-6" /> : <ExternalLink className="h-6 w-6" />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">{res.type} Resource</div>
                                                                    {/* Link opens in new tab (e.g. browser PDF viewer) */}
                                                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline flex items-center">
                                                                        {res.title} <ExternalLink className="inline h-4 w-4 ml-2" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <div className="inline-block p-6 bg-slate-50 rounded-full mb-4">
                                            <Folder className="h-10 w-10 text-slate-300" />
                                        </div>
                                        <p>This folder is empty. Check back later!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 h-full flex flex-col sticky top-24 max-h-[calc(100vh-120px)]">
                            <div className="p-6 border-b border-slate-100 flex items-center">
                                <MessageSquare className="h-5 w-5 text-indigo-600 mr-2" />
                                <h3 className="font-bold text-slate-800">Course Discussion</h3>
                            </div>
                            
                            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                                {activeComments.length === 0 && (
                                    <div className="text-center text-slate-400 text-sm py-10">
                                        No comments yet. Be the first to start the discussion!
                                    </div>
                                )}
                                {activeComments.map(comment => (
                                    <div key={comment.id} className={`flex flex-col ${comment.userId === user.id ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[90%] rounded-2xl p-4 shadow-sm border ${
                                            comment.userId === user.id 
                                            ? 'bg-indigo-600 text-white rounded-br-none border-indigo-600' 
                                            : 'bg-white text-slate-900 rounded-bl-none border-slate-200'
                                        }`}>
                                            <div className={`text-xs font-bold mb-1 ${comment.userId === user.id ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                                {comment.username}
                                            </div>
                                            <p className={`text-sm ${comment.userId === user.id ? 'text-white' : 'text-slate-900'}`}>
                                                {comment.content}
                                            </p>
                                        </div>

                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="mt-2 space-y-2 w-[90%]">
                                                {comment.replies.map(reply => (
                                                    <div key={reply.id} className={`p-3 rounded-xl border text-sm ${
                                                        reply.isAdmin 
                                                        ? 'bg-amber-50 border-amber-200 ml-4' 
                                                        : 'bg-gray-50 border-gray-200'
                                                    }`}>
                                                        <div className="flex items-center mb-1">
                                                            {reply.isAdmin && <ShieldCheck className="h-3 w-3 mr-1 text-amber-600" />}
                                                            <span className={`font-bold text-xs ${reply.isAdmin ? 'text-amber-700' : 'text-slate-700'}`}>
                                                                {reply.username} {reply.isAdmin && '(Admin)'}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-800">{reply.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-white">
                                <form onSubmit={handlePostComment} className="relative">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="w-full pl-4 pr-12 py-3 bg-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all border-none text-sm text-slate-900 placeholder-slate-500"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!newComment.trim()}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                                    >
                                        <SendHorizontal className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>

      <footer className="bg-slate-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-6 md:mb-0 text-center md:text-left">
                    <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                        {config.siteName} {/* Dynamic site name in footer */}
                    </h3>
                    <p className="text-slate-400 text-sm max-w-md">
                        {config.contactInfo}
                    </p>
                </div>
                <div className="flex space-x-4">
                    <SocialIcon type="instagram" url={config.instagram} />
                    <SocialIcon type="telegram" url={config.telegram} />
                    <SocialIcon type="youtube" url={config.youtube} />
                    <SocialIcon type="linkedin" url={config.linkedin} />
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default UserDashboard;
