import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const AIChat = () => {
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m here to provide emotional support and listen. How are you feeling today?',
      isEmergency: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const userMsg = { role: 'user', content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await api.post(
        '/api/ai/chat',
        { message: userMessage },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.message,
        isEmergency: response.data.isEmergency,
        emergencyContacts: response.data.emergencyContacts,
        timestamp: new Date()
      }]);

      if (response.data.isEmergency) {
        toast.error('Emergency support information displayed');
      }
    } catch (error) {
      toast.error('Failed to send message');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m sorry, I\'m having trouble right now. Please try again or contact support.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyClick = async () => {
    try {
      const response = await api.get('/api/emergency/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmergencyContacts(response.data.contacts);
      setShowEmergencyModal(true);
    } catch (error) {
      console.error('Failed to fetch emergency contacts:', error);
      setEmergencyContacts({
        hotline: '988',
        institutionEmail: 'support@dpis.edu',
        institutionPhone: '1-800-273-8255'
      });
      setShowEmergencyModal(true);
    }
  };

  return (
    <div className="bg-bg-black text-white min-h-screen flex flex-col font-space-grotesk overflow-hidden relative">
      {/* Geometric Background */}
      <div className="fixed inset-0 z-0 geometric-bg pointer-events-none"></div>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 relative z-10 pt-24">
        <div className="w-full max-w-4xl h-[70vh] flex flex-col chat-container bg-black overflow-hidden">
          {/* Header */}
          <div className="bg-primary p-6">
            <h2 className="text-2xl font-bold tracking-tight text-white uppercase">AI Support Chat</h2>
            <p className="text-[10px] uppercase tracking-widest opacity-80 mt-1">Confidential and supportive conversation</p>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${message.role === 'user' ? 'items-end ml-auto' : 'items-start'} max-w-[80%]`}
              >
                <div
                  className={`${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : message.isEmergency
                      ? 'bg-red-900/50 border-red-500 text-white border-2'
                      : 'bg-charcoal text-white border border-white/5'
                  } p-5 text-sm leading-relaxed shadow-xl`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.isEmergency && message.emergencyContacts && (
                    <div className="mt-3 pt-3 border-t border-red-500/50">
                      <p className="font-semibold mb-2">Emergency Contacts:</p>
                      <p className="text-sm">Hotline: {message.emergencyContacts.hotline}</p>
                      {message.emergencyContacts.institutionEmail && (
                        <p className="text-sm">Email: {message.emergencyContacts.institutionEmail}</p>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[9px] uppercase tracking-widest text-gray-600 mt-2 font-bold">
                  {message.role === 'user' ? 'You' : 'AI Assistant'} • {formatTime(message.timestamp)}
                </span>
              </div>
            ))}
            {loading && (
              <div className="flex flex-col items-start max-w-[80%]">
                <div className="bg-charcoal text-white p-5 text-sm leading-relaxed border border-white/5 shadow-xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-8 border-t border-white/10 bg-black">
            <form onSubmit={handleSend} className="flex gap-4">
              <div className="relative flex-grow">
                <input
                  className="w-full bg-transparent border border-white/20 text-white px-6 py-4 focus:ring-0 focus:border-primary transition-colors text-sm placeholder:text-gray-700"
                  placeholder="Type your message..."
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button
                className="bg-primary hover:bg-[#B533FF] text-white px-8 py-4 font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading || !input.trim()}
              >
                Send
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </form>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-4 text-center">
              This AI is not a replacement for professional help. In emergencies, contact emergency services.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Right Icons */}
      <footer className="p-6 flex justify-end items-end z-10 pointer-events-none fixed bottom-0 right-0">
        <div className="flex gap-6">
          <span className="material-symbols-outlined text-gray-800 text-lg">verified_user</span>
          <span className="material-symbols-outlined text-gray-800 text-lg">encrypted</span>
        </div>
      </footer>

      {/* Floating Emergency Button */}
      <div className="fixed bottom-8 right-24 z-40">
        <button
          className={`flex items-center justify-center w-12 h-12 rounded-full border shadow-lg transition-all hover:scale-110 ${
            darkMode
              ? 'bg-red-600/10 border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white'
              : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-600 hover:text-white'
          }`}
          onClick={handleEmergencyClick}
          title="Emergency Support"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEmergencyModal(false)}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-red-400 mb-4">🆘 Emergency Support</h2>
            <p className="mb-4 text-gray-400">
              If you are in immediate danger, please call <strong className="text-red-400">911</strong> or your local emergency services.
            </p>
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg border bg-red-900/20 border-red-800">
                <strong className="block mb-1 text-white">National Suicide Prevention Lifeline:</strong>
                <a href="tel:988" className="text-red-400 font-semibold text-lg hover:underline">988</a>
              </div>
              <div className="p-4 rounded-lg border bg-blue-900/20 border-blue-800">
                <strong className="block mb-1 text-white">Crisis Text Line:</strong>
                <p className="text-blue-400 font-semibold">Text HOME to 741741</p>
              </div>
              {emergencyContacts?.institutionEmail && (
                <div className="p-4 rounded-lg border bg-gray-700/50 border-gray-600">
                  <strong className="block mb-1 text-white">Institution Email:</strong>
                  <a href={`mailto:${emergencyContacts.institutionEmail}`} className="text-purple-400 font-semibold hover:underline">
                    {emergencyContacts.institutionEmail}
                  </a>
                </div>
              )}
              {emergencyContacts?.institutionPhone && (
                <div className="p-4 rounded-lg border bg-gray-700/50 border-gray-600">
                  <strong className="block mb-1 text-white">Institution Phone:</strong>
                  <a href={`tel:${emergencyContacts.institutionPhone}`} className="text-purple-400 font-semibold hover:underline">
                    {emergencyContacts.institutionPhone}
                  </a>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full font-bold py-2 px-4 rounded-lg transition-colors bg-purple-600 hover:bg-purple-700 text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
