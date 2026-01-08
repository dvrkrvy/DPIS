import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const EmergencyButton = () => {
  const { isAuthenticated, token } = useAuth();
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState(null);

  const fetchContacts = async () => {
    try {
      const response = await api.get('/api/emergency/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data.contacts);
      setShowContacts(true);
    } catch (error) {
      console.error('Failed to fetch emergency contacts:', error);
      // Show default contacts even if API fails
      setContacts({
        hotline: '988',
        institutionEmail: 'support@dpis.edu',
        institutionPhone: '1-800-273-8255'
      });
      setShowContacts(true);
    }
  };

  return (
    <>
      {/* Emergency button only shows when authenticated */}
      {isAuthenticated && (
        <>
          <button
            onClick={fetchContacts}
            className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg z-50 flex items-center justify-center gap-2"
            style={{ width: '160px' }}
          >
            <span>🆘</span>
            <span>Emergency</span>
          </button>

          {showContacts && (
            <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={() => setShowContacts(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">🆘 Emergency Support</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                  If you are in immediate danger, please call <strong className="text-red-600 dark:text-red-400">911</strong> or your local emergency services.
                </p>
                <div className="space-y-4 mb-6">
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <strong className="text-gray-900 dark:text-gray-100 block mb-1">National Suicide Prevention Lifeline:</strong>
                    <a href="tel:988" className="text-red-600 dark:text-red-400 font-semibold text-lg hover:underline">988</a>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <strong className="text-gray-900 dark:text-gray-100 block mb-1">Crisis Text Line:</strong>
                    <p className="text-blue-600 dark:text-blue-400 font-semibold">Text HOME to 741741</p>
                  </div>
                  {contacts?.institutionEmail && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <strong className="text-gray-900 dark:text-gray-100 block mb-1">Institution Email:</strong>
                      <a href={`mailto:${contacts.institutionEmail}`} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">{contacts.institutionEmail}</a>
                    </div>
                  )}
                  {contacts?.institutionPhone && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <strong className="text-gray-900 dark:text-gray-100 block mb-1">Institution Phone:</strong>
                      <a href={`tel:${contacts.institutionPhone}`} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">{contacts.institutionPhone}</a>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowContacts(false)}
                  className="w-full bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default EmergencyButton;
