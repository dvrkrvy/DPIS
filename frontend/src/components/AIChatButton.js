import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AIChatButton = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    // Redirect to AI chat page
    navigate('/ai-chat');
  };

  // Always show button - positioned above emergency button
  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '112px', // Positioned above emergency button (which is at bottom-6 = 96px)
        right: '24px', // 1.5rem = 24px
        zIndex: 60,
        display: 'block',
        visibility: 'visible',
        opacity: 1,
      }}
      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105"
      title="AI Support Chat"
      id="ai-chat-button"
    >
      <span className="text-xl">🤖</span>
      <span>AI Chat</span>
    </button>
  );
};

export default AIChatButton;
