import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const EmergencyButton = () => {
  const { isAuthenticated, token } = useAuth();
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState(null);

  const fetchContacts = async () => {
    try {
      const response = await axios.get('/api/emergency/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data.contacts);
      setShowContacts(true);
    } catch (error) {
      toast.error('Failed to fetch emergency contacts');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={fetchContacts}
        className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg z-50 flex items-center gap-2"
      >
        <span>🆘</span>
        <span>Emergency</span>
      </button>

      {showContacts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Emergency Support</h2>
            <p className="mb-4 text-gray-700">
              If you are in immediate danger, please call 911 or your local emergency services.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <strong>National Suicide Prevention Lifeline:</strong>
                <p className="text-primary-600 font-semibold">{contacts?.hotline || '988'}</p>
              </div>
              <div>
                <strong>Crisis Text Line:</strong>
                <p className="text-primary-600 font-semibold">Text HOME to 741741</p>
              </div>
              <div>
                <strong>Institution Email:</strong>
                <p className="text-primary-600 font-semibold">{contacts?.institutionEmail}</p>
              </div>
              <div>
                <strong>Institution Phone:</strong>
                <p className="text-primary-600 font-semibold">{contacts?.institutionPhone}</p>
              </div>
            </div>
            <button
              onClick={() => setShowContacts(false)}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyButton;
