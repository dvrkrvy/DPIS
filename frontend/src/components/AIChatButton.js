import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AIChatButton = () => {
  const { isAuthenticated, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m here to provide emotional support and listen. How are you feeling today?',
      isEmergency: false
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus input when chat opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Require authentication to send messages
    if (!isAuthenticated || !token) {
      toast.error('Please log in to use the AI chat');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Send conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await api.post(
        '/api/ai/chat',
        { 
          message: userMessage,
          conversationHistory: conversationHistory
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.message,
        isEmergency: response.data.isEmergency,
        emergencyContacts: response.data.emergencyContacts
      }]);

      if (response.data.isEmergency) {
        toast.error('Emergency support information displayed');
      }
    } catch (error) {
      console.error('AI chat error:', error);
      toast.error('Failed to send message');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m sorry, I\'m having trouble right now. Please try again or contact support.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  // Debug: Log authentication status
  useEffect(() => {
    console.log('AIChatButton - isAuthenticated:', isAuthenticated, 'token:', token);
  }, [isAuthenticated, token]);

  // Always show button, but require authentication to use chat
  // This helps with debugging - button will be visible but chat requires login

  return (
    <>
      {/* Floating AI Chat Button - positioned above emergency button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-28 right-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-2xl z-[60] flex items-center gap-2 transition-all duration-200 hover:scale-105"
        title="AI Support Chat"
      >
        <span className="text-xl">🤖</span>
        <span>AI Chat</span>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={handleClose}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col w-full max-w-md h-[600px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">AI Support Chat</h2>
                <p className="text-sm opacity-90">Confidential and supportive conversation</p>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/20"
                aria-label="Close chat"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-xl shadow-md ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : message.isEmergency
                        ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 text-red-900 dark:text-red-200'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    {message.isEmergency && message.emergencyContacts && (
                      <div className="mt-3 pt-3 border-t border-red-300 dark:border-red-600">
                        <p className="font-semibold mb-2 text-sm">Emergency Contacts:</p>
                        <p className="text-xs">Hotline: {message.emergencyContacts.hotline}</p>
                        <p className="text-xs">Email: {message.emergencyContacts.institutionEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-700 px-4 py-2 rounded-xl shadow-md">
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
            <form onSubmit={handleSend} className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 rounded-b-xl">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium text-sm"
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                This AI is not a replacement for professional help. In emergencies, contact emergency services.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatButton;
