import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Onboarding = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isNewUser, setIsNewUser] = useState(true);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || username.trim().length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username.trim())) {
      toast.error('Username can only contain letters, numbers, underscores, or hyphens');
      return;
    }
    const result = await register(username.trim());
    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/screening');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter your username');
      return;
    }
    const result = await login(username.trim());
    if (result.success) {
      toast.success('Login successful');
      navigate('/dashboard');
    }
  };

  return (
    <div className="bg-bg-deep text-white min-h-screen flex flex-col font-space-grotesk overflow-hidden relative">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <img
          alt="Abstract Architecture"
          className="w-full h-full object-cover opacity-60 grayscale-[20%] contrast-125"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcY2QlTwtxjHs4kHEqBCq_-n_pdKhDyosf4Had5f2P_vweDZjYFaD0sKKiv5yo5VJmMkhS_KoKvNxB7_L5jEsGtI4xDpFtP9EH6u_ylNsnHXdCJcDAoWNEySM375vbORunvF5x2IT0gTROckSE0nhXQ-Zmr_oRn6uD9k_7ZHqOBfL1UWzO-91sjbCSQGm31omWt273AtoGvA-VDt1MZ1D9leha2aZu47Hdm9EHCfb2pyRyGyzNLZSPBufjZsheaLTzy0bf8oWoQa8"
        />
        <div className="absolute inset-0 bg-black/85"></div>
      </div>

      {/* Navbar */}
      <nav className="w-full p-8 absolute top-0 left-0 flex justify-between items-center z-20">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 bg-gradient-to-br rounded-lg transform rotate-3 group-hover:rotate-12 transition-transform duration-500 opacity-80 blur-sm from-purple-600 to-cyan-500"></div>
            <div className="relative border rounded-lg h-full w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300 shadow-lg z-10 bg-gray-900 border-white/20 shadow-purple-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight transition-all duration-300 text-white group-hover:text-purple-400">
            DPIS <span className="text-sm font-light tracking-widest align-top opacity-70 text-purple-500">PRO</span>
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4 relative z-10 w-full">
        <div className="w-full max-w-[460px] glass-card p-10 md:p-14 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-10 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-cyan-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-lg"></div>
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-br rounded-lg transform rotate-3 group-hover:rotate-12 transition-transform duration-500 opacity-80 blur-sm from-purple-600 to-cyan-500"></div>
              <div className="relative border rounded-lg h-full w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300 shadow-lg z-10 bg-gray-900 border-white/20 shadow-purple-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            DPIS Portal
          </h1>
          <p className="text-primary-accent font-bold text-[10px] uppercase tracking-[0.3em] mb-8 shadow-black drop-shadow-md">
            Digital Psychological Intervention
          </p>
          <p className="text-gray-400 text-sm mb-10 leading-relaxed max-w-xs mx-auto font-light">
            Secure access to mental health resources. <br/>Create your anonymous identity below.
          </p>

          {/* Form */}
          {isNewUser ? (
            <form onSubmit={handleRegister} className="w-full space-y-8 text-left">
              <div className="group relative">
                <label
                  className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 transition-colors group-focus-within:text-primary-accent"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  autoComplete="off"
                  className="block w-full bg-transparent border-0 border-b border-gray-700 text-white px-0 py-2 placeholder-gray-700 focus:ring-0 focus:border-primary-accent transition-all duration-300 font-medium text-lg"
                  id="username"
                  name="username"
                  placeholder="Enter username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_-]{3,20}"
                  required
                />
                <div className="h-0.5 w-0 bg-primary-accent absolute bottom-0 left-0 transition-all duration-500 group-focus-within:w-full shadow-[0_0_10px_#8B5CF6]"></div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-accent text-white font-bold uppercase tracking-widest text-xs py-5 px-6 animate-neon-pulse transition-all duration-300 flex items-center justify-center gap-3 mt-6 group"
              >
                Create Account
                <span className="material-icons text-sm transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
                <span className="text-xs text-gray-500">Existing user?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewUser(false);
                    setUsername('');
                  }}
                  className="text-xs font-bold text-white hover:text-primary-accent transition-colors uppercase tracking-wider"
                >
                  Log In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="w-full space-y-8 text-left">
              <div className="group relative">
                <label
                  className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 transition-colors group-focus-within:text-primary-accent"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  autoComplete="off"
                  className="block w-full bg-transparent border-0 border-b border-gray-700 text-white px-0 py-2 placeholder-gray-700 focus:ring-0 focus:border-primary-accent transition-all duration-300 font-medium text-lg"
                  id="username"
                  name="username"
                  placeholder="Enter username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <div className="h-0.5 w-0 bg-primary-accent absolute bottom-0 left-0 transition-all duration-500 group-focus-within:w-full shadow-[0_0_10px_#8B5CF6]"></div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-accent text-white font-bold uppercase tracking-widest text-xs py-5 px-6 animate-neon-pulse transition-all duration-300 flex items-center justify-center gap-3 mt-6 group"
              >
                Login
                <span className="material-icons text-sm transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
                <span className="text-xs text-gray-500">New user?</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewUser(true);
                    setUsername('');
                  }}
                  className="text-xs font-bold text-white hover:text-primary-accent transition-colors uppercase tracking-wider"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Bottom Right Icons */}
      <div className="fixed bottom-0 right-0 p-6 z-10 pointer-events-none">
        <div className="flex gap-4">
          <span className="material-icons text-gray-700 text-lg">shield</span>
          <span className="material-icons text-gray-700 text-lg">lock</span>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
