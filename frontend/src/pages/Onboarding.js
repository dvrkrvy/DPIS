import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Onboarding = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [anonymousId, setAnonymousId] = useState('');
  const [isNewUser, setIsNewUser] = useState(true);

  const handleRegister = async () => {
    const result = await register();
    if (result.success) {
      toast.success('Account created successfully');
      navigate('/screening');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(anonymousId);
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
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
              Create an anonymous account to access mental health support resources. 
              Your privacy is our priority.
            </p>
            <button
              onClick={handleRegister}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Create Anonymous Account
            </button>
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => setIsNewUser(false)}
                className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                Login with Anonymous ID
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                Anonymous ID
              </label>
              <input
                type="text"
                value={anonymousId}
                onChange={(e) => setAnonymousId(e.target.value)}
                className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded-lg w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Enter your anonymous ID"
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
                onClick={() => setIsNewUser(true)}
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
