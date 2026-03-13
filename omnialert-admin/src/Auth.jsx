import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Shield, Lock, User, ArrowRight, Loader } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/auth';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const res = await axios.post(`${API_URL}${endpoint}`, { email, password });

      if (res.data.success) {
        if (isLogin) {
          toast.success('Welcome back to OmniAlert!', {
            style: { background: '#10b981', color: '#fff' }
          });
          onLogin(res.data.token);
        } else {
          toast.success('Admin registered successfully! Please log in.', {
            style: { background: '#10b981', color: '#fff' }
          });
          setIsLogin(true);
          setPassword('');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed', {
        style: { background: '#ef4444', color: '#fff' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden text-slate-100 font-sans selection:bg-red-500/30 items-center justify-center">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-3xl">
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 tracking-tight">
            OmniAlert
          </h1>
          <p className="text-slate-400 mt-2 font-medium tracking-wide">
            Administrator Gateway
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                required
                className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 block pl-11 p-3.5 transition-all outline-none"
                placeholder="admin@omnialert.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Secure Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 block pl-11 p-3.5 transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-orange-500 focus:ring-4 focus:ring-red-500/30 font-bold rounded-xl text-md px-5 py-4 text-center transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : isLogin ? 'Authenticate' : 'Create Admin Account'}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/80 pt-6">
          <p className="text-slate-400 text-sm">
            {isLogin ? "Authorized personnel only?" : "Already an administrator?"}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-red-400 hover:text-red-300 font-bold hover:underline transition-colors"
            >
              {isLogin ? 'Request Access' : 'Secure Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
