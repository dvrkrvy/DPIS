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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">D</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent mb-2">
            Welcome to DPIS
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Digital Psychological Intervention System</p>
        </div>

        {isNewUser ? (
          <form onSubmit={handleRegister}>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
              Create an account to access mental health support resources. 
              Choose a username you'll remember to log in later.
            </p>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                Choose a Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded-lg w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Enter a username (3-20 characters)"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_-]{3,20}"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only letters, numbers, underscores, and hyphens allowed
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Create Account
            </button>
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsNewUser(false);
                  setUsername('');
                }}
                className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                Login
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
              Welcome back! Enter your username to continue.
            </p>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded-lg w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Enter your username"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Login
            </button>
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              New user?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsNewUser(true);
                  setUsername('');
                }}
                className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                Create Account
              </button>
            </p>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Your data is completely anonymous and secure. 
            We prioritize your privacy and mental wellbeing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
