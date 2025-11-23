
import React, { useState, useEffect } from 'react';
import { AdminConfig, LoginRequest } from '../types';
import { MessageCircle, Lock, User as UserIcon, ArrowRight, AlertTriangle, ShieldAlert, Loader } from 'lucide-react';
import * as DB from '../services/db';

interface LoginProps {
  onLogin: (username: string, password: string, approvedToken?: string) => Promise<{ success: boolean; error?: string; pendingRequestId?: string }>;
  config: AdminConfig;
}

const Login: React.FC<LoginProps> = ({ onLogin, config }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Pending State
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  useEffect(() => {
      let unsub: any;
      if (pendingRequestId) {
          unsub = DB.subscribeToLoginRequest(pendingRequestId, (req) => {
              if (req) {
                  setRequestStatus(req.status);
                  if (req.status === 'APPROVED') {
                      // Status is approved. The DB has been updated with req.newSessionToken.
                      // We need to login with this specific token to bypass the "Active Session" check in App.tsx
                      const retryLogin = async () => {
                          const result = await onLogin(username, password, req.newSessionToken);
                          
                          if (!result.success && result.error === 'SYNC_PENDING') {
                              // DB hasn't synced to this client yet. Wait and retry.
                              console.log("Sync pending, retrying...");
                              setTimeout(retryLogin, 1000);
                          } else if (!result.success) {
                              setError(result.error || 'Login failed after approval');
                          }
                      };
                      
                      // Initial delay to allow DB propagation
                      setTimeout(retryLogin, 500);
                  }
                  if (req.status === 'REJECTED') {
                      setError("Login Request Denied by User/Admin.");
                      setPendingRequestId(null);
                  }
              }
          });
      }
      return () => { if(unsub) unsub(); };
  }, [pendingRequestId, username, password, onLogin]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await onLogin(username, password);
    
    if (!result.success) {
        if (result.pendingRequestId) {
            setPendingRequestId(result.pendingRequestId);
            setRequestStatus('PENDING');
        } else {
            setError(result.error || 'Login failed');
        }
    }
  };

  const handleContact = () => {
    const link = config.joinLink || 'https://t.me/codewithvivek';
    window.open(link, '_blank');
  };

  if (pendingRequestId) {
      return (
        <div className="min-h-screen w-full bg-black flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-yellow-500/50 p-8 rounded-2xl max-w-md w-full text-center relative overflow-hidden">
                {/* Scanner animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 animate-[pulse_2s_infinite]"></div>
                
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-yellow-900/20 rounded-full animate-pulse">
                        <ShieldAlert className="h-16 w-16 text-yellow-500" />
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Security Check</h2>
                
                {requestStatus === 'PENDING' && (
                    <>
                        <p className="text-gray-400 mb-6">
                            This account is currently active on another device. 
                            <br/><br/>
                            <span className="text-yellow-400 font-bold">We have sent a notification to the active user and the admin.</span>
                            <br/>
                            Please wait for approval.
                        </p>
                        <div className="flex justify-center items-center text-yellow-500 font-mono text-sm">
                            <Loader className="h-4 w-4 mr-2 animate-spin" /> WAITING FOR AUTHORIZATION...
                        </div>
                    </>
                )}
                
                {requestStatus === 'APPROVED' && (
                    <div className="text-green-500 font-bold text-xl animate-bounce">
                        ACCESS GRANTED! LOGGING IN...
                    </div>
                )}

                <button 
                    onClick={() => setPendingRequestId(null)}
                    className="mt-8 text-gray-600 hover:text-white text-sm underline"
                >
                    Cancel Request
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

      <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-md border border-white/50 transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 drop-shadow-sm">
            Welcome Back
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium tracking-wide">CODEWITH-VIVEK LMS</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r shadow-sm animate-pulse flex flex-col gap-2">
            <div className="flex items-center font-bold text-sm">
               <AlertTriangle className="h-4 w-4 mr-2" />
               Login Failed
            </div>
            <p className="text-sm">{error}</p>
            {error.includes("not found") && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                    Please contact the developer below to get added.
                </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full pl-10 pr-3 py-4 border-none rounded-xl bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
              placeholder="Username"
              required
            />
          </div>

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-4 border-none rounded-xl bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
              placeholder="Password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-transform hover:-translate-y-1 active:scale-95"
          >
            LOGIN ACCESS <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={handleContact}
            className="w-full flex justify-center items-center py-3 px-4 rounded-xl border-2 border-indigo-100 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors group"
          >
            <MessageCircle className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
            Contact Developer to Join
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
