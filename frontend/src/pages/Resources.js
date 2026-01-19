import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

const Resources = () => {
  const { token, user } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [filters, setFilters] = useState({ category: '', contentType: '', search: '' });
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [personalized, setPersonalized] = useState(true);
  const [testResultsCount, setTestResultsCount] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);
  const lastFetchRef = useRef(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (personalized) {
        params.append('personalized', 'true');
      }
      
      params.append('_t', Date.now());
      
      if (filters.category) params.append('category', filters.category);
      if (filters.contentType) params.append('contentType', filters.contentType);
      if (filters.search) params.append('search', filters.search);

      const url = `/api/resources?${params}`;
      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(response.data.resources || []);
      setTestResultsCount(response.data.testResultsCount);
      lastFetchRef.current = Date.now();
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch resources';
      toast.error(errorMessage);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [personalized, user?.role, filters, token]);

  useEffect(() => {
    if (token) {
      fetchCategories();
      fetchContentTypes();
      fetchResources();
    }
  }, [location.pathname, token]);
  
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'testSubmitted' && token) {
        fetchResources();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token, fetchResources]);

  useEffect(() => {
    if (token) {
      fetchResources();
    }
  }, [filters, personalized, token, fetchResources]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token && location.pathname === '/resources') {
        const now = Date.now();
        if (!lastFetchRef.current || (now - lastFetchRef.current) > 5000) {
          fetchResources();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, location.pathname, fetchResources]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/resources/meta/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchContentTypes = async () => {
    try {
      const response = await api.get('/api/resources/meta/content-types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContentTypes(response.data.contentTypes || []);
    } catch (error) {
      console.error('Failed to fetch content types:', error);
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

  const getContentTypeIcon = (type) => {
    const typeLower = type?.toLowerCase() || '';
    if (typeLower.includes('audio') || typeLower === 'audio') return 'headphones';
    if (typeLower.includes('video') || typeLower === 'video') return 'videocam';
    if (typeLower.includes('article') || typeLower === 'article') return 'article';
    return 'headphones';
  };

  const getContentTypeColor = (type, isDark) => {
    const typeLower = type?.toLowerCase() || '';
    if (typeLower.includes('audio') || typeLower === 'audio') {
      return isDark ? 'text-cyan-400' : 'text-cyan-600';
    }
    if (typeLower.includes('video') || typeLower === 'video') {
      return isDark ? 'text-purple-400' : 'text-purple-600';
    }
    if (typeLower.includes('article') || typeLower === 'article') {
      return isDark ? 'text-pink-400' : 'text-pink-600';
    }
    return isDark ? 'text-cyan-400' : 'text-cyan-600';
  };

  const getDurationText = (resource) => {
    if (resource.duration) return resource.duration;
    if (resource.contentType?.toLowerCase().includes('video')) return '10 MIN WATCH';
    if (resource.contentType?.toLowerCase().includes('audio')) return '12 MIN LISTEN';
    if (resource.contentType?.toLowerCase().includes('article')) return '5 MIN READ';
    return 'VIEW';
  };

  const getActionText = (resource) => {
    const type = resource.contentType?.toLowerCase() || '';
    if (type.includes('video')) return 'Watch Video';
    if (type.includes('audio')) return 'Listen Now';
    if (type.includes('article')) return 'Read Article';
    return 'View Resource';
  };

  const isYouTubeUrl = (url) => {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    return urlLower.includes('youtube.com') || urlLower.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = null;
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) videoId = embedMatch[1];
    if (!videoId) {
      const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (watchMatch) videoId = watchMatch[1];
    }
    if (!videoId) {
      const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (shortMatch) videoId = shortMatch[1];
    }
    if (!videoId) {
      const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
      if (vMatch) videoId = vMatch[1];
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
    }
    return null;
  };

  const bgMain = darkMode ? 'bg-black' : 'bg-white';
  const textMain = darkMode ? 'text-white' : 'text-black';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const cardBorder = darkMode ? 'border-gray-800' : 'border-gray-200';

  // Filter resources by active tab
  const filteredResources = resources.filter(resource => {
    if (activeTab === 'all') return true;
    const type = resource.contentType?.toLowerCase() || '';
    if (activeTab === 'audio') return type.includes('audio');
    if (activeTab === 'video') return type.includes('video');
    if (activeTab === 'articles') return type.includes('article');
    if (activeTab === 'crisis') {
      const tags = (resource.tags || []).map(t => t.toLowerCase());
      const title = (resource.title || '').toLowerCase();
      return tags.some(t => t.includes('crisis') || t.includes('emergency') || t.includes('panic')) ||
             title.includes('crisis') || title.includes('emergency');
    }
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All Resources' },
    { id: 'audio', label: 'Audio Guides' },
    { id: 'video', label: 'Video Sessions' },
    { id: 'articles', label: 'Articles & Research' },
    { id: 'crisis', label: 'Crisis Tools' },
  ];

  return (
    <div className={`min-h-screen ${bgMain} ${textMain} transition-colors`}>
      <main className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 flex-grow">
        {/* Header Section */}
        <div className="reveal-up relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <span className={`inline-block py-1 px-3 rounded-full border mb-4 tracking-widest text-xs font-mono ${
                darkMode 
                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                  : 'bg-purple-50 border-purple-200 text-purple-600 font-bold'
              }`}>
                KNOWLEDGE BASE v3.0
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
                Resource Hub
              </h1>
              <p className={`text-lg mt-4 font-light max-w-xl ${textSecondary}`}>
                Curated mental health strategies, guided meditations, and expert articles powered by clinical research.
              </p>
            </div>
            <div className="w-full md:w-96">
              <div className="relative group">
                <div className={`absolute inset-0 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity ${
                  darkMode ? 'bg-gradient-to-r from-purple-600 to-cyan-500' : 'bg-gradient-to-r from-purple-500 to-cyan-400'
                }`}></div>
                <div className={`relative rounded-xl flex items-center px-4 py-3 transition-all focus-within:ring-1 ${
                  darkMode
                    ? 'bg-white/5 backdrop-blur-md border border-white/10 focus-within:ring-purple-500/50'
                    : 'bg-gray-100 border border-black focus-within:ring-black/10 shadow-sm'
                }`}>
                  <svg className={`w-5 h-5 mr-3 ${textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search resources, topics, tags..."
                    className={`bg-transparent border-none ${textMain} placeholder-gray-500 focus:ring-0 w-full text-sm font-medium p-0`}
                  />
                  <span className={`text-xs border px-1.5 py-0.5 rounded ml-2 hidden sm:inline-block font-mono ${
                    darkMode ? 'text-gray-600 border-white/10' : 'text-gray-500 border-gray-300 bg-white'
                  }`}>
                    CMD+K
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className={`border-b pb-1 flex gap-8 overflow-x-auto no-scrollbar ${
            darkMode ? 'border-white/10' : 'border-gray-200'
          }`}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 border-b-2 whitespace-nowrap text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? darkMode
                      ? 'border-purple-500 text-white'
                      : 'border-black text-black font-bold'
                    : darkMode
                      ? 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                      : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resource Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
                darkMode ? 'border-purple-400' : 'border-purple-600'
              }`}></div>
              <p className={textSecondary}>Loading resources...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredResources.map((resource, idx) => {
              const contentTypeColor = getContentTypeColor(resource.contentType, darkMode);
              const contentTypeIcon = getContentTypeIcon(resource.contentType);
              const hoverColor = resource.contentType?.toLowerCase().includes('audio') 
                ? darkMode ? 'hover:border-cyan-500/50' : 'hover:border-cyan-500/50'
                : resource.contentType?.toLowerCase().includes('video')
                ? darkMode ? 'hover:border-purple-500/50' : 'hover:border-purple-500/50'
                : darkMode ? 'hover:border-pink-500/50' : 'hover:border-pink-500/50';

              return (
                <div
                  key={resource.id}
                  className={`reveal-up delay-${idx < 3 ? (idx + 1) * 100 : 300} group relative ${cardBg} border ${cardBorder} rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-full ${
                    darkMode ? 'hover:border-purple-500/50 card-glow' : 'hover:border-purple-500/50 shadow-sm'
                  }`}
                >
                  {/* Image Section */}
                  <div className="h-48 relative overflow-hidden">
                    <div className={`absolute inset-0 z-10 bg-gradient-to-t ${
                      darkMode ? 'from-gray-900 to-transparent' : 'from-white to-transparent'
                    }`}></div>
                    {resource.imageUrl ? (
                      <img
                        alt={resource.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                        src={resource.imageUrl}
                      />
                    ) : (
                      <div className={`w-full h-full ${
                        resource.contentType?.toLowerCase().includes('video') 
                          ? darkMode ? 'bg-gray-800' : 'bg-gray-200'
                          : darkMode ? 'bg-gray-800' : 'bg-gray-100'
                      }`}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {resource.contentType?.toLowerCase().includes('video') && (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-opacity duration-300 ${
                              darkMode ? 'bg-purple-500/80 text-white' : 'bg-purple-500 text-white'
                            } opacity-0 group-hover:opacity-100`}>
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Content Type Badge */}
                    <div className="absolute top-4 left-4 z-20">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold uppercase tracking-wider ${
                        darkMode
                          ? 'bg-black/60 backdrop-blur-md border-white/10 text-white'
                          : 'bg-black/80 backdrop-blur-md border-white/10 text-white shadow-md'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          {contentTypeIcon === 'headphones' && (
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                          )}
                          {contentTypeIcon === 'videocam' && (
                            <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                          )}
                          {contentTypeIcon === 'article' && (
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                          )}
                        </svg>
                        <span className={contentTypeColor}>{resource.contentType || 'Resource'}</span>
                      </span>
                    </div>

                    {/* Tags */}
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="absolute bottom-4 left-4 z-20 flex gap-2 flex-wrap">
                        {resource.tags.slice(0, 2).map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              darkMode
                                ? 'bg-white/10 text-gray-300 border-white/10'
                                : 'bg-white/80 backdrop-blur text-black border-gray-200 shadow-sm font-bold'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-6 flex flex-col flex-grow relative z-20 -mt-6">
                    <h3 className={`text-xl font-bold mb-2 leading-tight transition-colors ${
                      darkMode ? 'text-white group-hover:text-purple-400' : 'text-black group-hover:text-purple-600'
                    }`}>
                      {resource.title}
                    </h3>
                    <p className={`text-sm mb-6 flex-grow line-clamp-3 ${textSecondary} ${!darkMode ? 'leading-relaxed' : ''}`}>
                      {resource.description}
                    </p>
                    <div className={`flex items-center justify-between mt-auto pt-4 border-t ${
                      darkMode ? 'border-white/5' : 'border-gray-100'
                    }`}>
                      <span className={`text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-500 font-medium'}`}>
                        {getDurationText(resource)}
                      </span>
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-semibold flex items-center gap-2 group/btn transition-colors ${
                            darkMode ? 'text-white hover:text-purple-400' : 'text-black hover:text-purple-600'
                          }`}
                        >
                          {getActionText(resource)}
                          <svg className={`w-5 h-5 group-hover/btn:translate-x-1 transition-transform ${contentTypeColor}`} fill="currentColor" viewBox="0 0 24 24">
                            {resource.contentType?.toLowerCase().includes('video') || resource.contentType?.toLowerCase().includes('article') ? (
                              <path d="M5 12h14M12 5l7 7-7 7"/>
                            ) : (
                              <path d="M8 5v14l11-7z"/>
                            )}
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredResources.length === 0 && (
          <div className="text-center py-12">
            <p className={textSecondary}>
              {personalized && user?.role === 'student' && testResultsCount === 0
                ? "No personalized resources available yet. Take a test to get personalized resources."
                : "No resources found. Try adjusting your filters."}
            </p>
          </div>
        )}

        {/* CTA Section */}
        <div className={`reveal-up delay-400 relative rounded-3xl overflow-hidden p-8 md:p-12 border ${
          darkMode 
            ? 'border-white/10 bg-gradient-to-r from-purple-500/20 to-cyan-500/10' 
            : 'border-gray-100 bg-purple-50'
        }`}>
          {darkMode ? (
            <>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0"></div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-transparent z-0 opacity-50"></div>
          )}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <h2 className={`text-2xl md:text-3xl font-bold mb-3 ${textMain}`}>
                Need personalized resources?
              </h2>
              <p className={textSecondary}>
                Complete the latest assessment to get an AI-curated list of articles, videos, and exercises tailored to your current state.
              </p>
            </div>
            <button
              onClick={() => navigate('/screening')}
              className={`whitespace-nowrap font-bold px-8 py-3.5 rounded-xl transition-all transform hover:-translate-y-1 flex items-center gap-2 ${
                darkMode
                  ? 'bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/20 hover:shadow-white/40'
                  : 'bg-white text-black border border-gray-100 shadow-lg hover:shadow-xl hover:scale-105'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              Start Assessment
            </button>
          </div>
        </div>
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40 items-end">
        <button
          className={`flex items-center justify-center w-14 h-14 rounded-full border shadow-lg hover:scale-110 transition-transform group relative overflow-hidden ${
            darkMode
              ? 'bg-gray-900 border-white/10 text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:text-black'
          }`}
          title="Help Center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l.707-.707m5.656-5.656l.707-.707" />
          </svg>
          <span className={`absolute right-16 text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border shadow-md ${
            darkMode ? 'bg-black text-white border-white/10' : 'bg-black text-white'
          }`}>
            Help Center
          </span>
        </button>

        <button
          className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:brightness-110 text-white shadow-lg shadow-purple-500/40 transition-all hover:scale-110"
          onClick={() => navigate('/ai-chat')}
          title="AI Support Chat"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.69 2 6 4.69 6 8c0 1.1.27 2.14.75 3.05L3 18l6.95-3.75c.91.48 1.95.75 3.05.75 3.31 0 6-2.69 6-6s-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            <circle cx="10" cy="8" r="1"/>
            <circle cx="14" cy="8" r="1"/>
            <path d="M9 11h6v1.5H9z"/>
            <path d="M12 1.5v2M7 3.5l1.5-1.5M17 3.5l-1.5-1.5"/>
          </svg>
        </button>

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
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEmergencyModal(false)}
        >
          <div
            className={`${cardBg} border ${cardBorder} rounded-xl p-6 max-w-md w-full shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Emergency Support</h2>
            <p className={`mb-4 ${textSecondary}`}>
              If you are in immediate danger, please call <strong className="text-red-600 dark:text-red-400">911</strong> or your local emergency services.
            </p>
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <strong className={`block mb-1 ${textMain}`}>National Suicide Prevention Lifeline:</strong>
                <a href="tel:988" className="text-red-600 dark:text-red-400 font-semibold text-lg hover:underline">988</a>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <strong className={`block mb-1 ${textMain}`}>Crisis Text Line:</strong>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Text HOME to 741741</p>
              </div>
              {emergencyContacts?.institutionEmail && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${textMain}`}>Institution Email:</strong>
                  <a href={`mailto:${emergencyContacts.institutionEmail}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                    {emergencyContacts.institutionEmail}
                  </a>
                </div>
              )}
              {emergencyContacts?.institutionPhone && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${textMain}`}>Institution Phone:</strong>
                  <a href={`tel:${emergencyContacts.institutionPhone}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                    {emergencyContacts.institutionPhone}
                  </a>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEmergencyModal(false)}
              className={`w-full font-bold py-2 px-4 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-black hover:bg-gray-900 text-white'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Background Gradient Effects */}
      {darkMode && (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        </div>
      )}

      <style>{`
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal-up { animation: reveal-up 0.8s forwards; opacity: 0; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .card-glow:hover {
          box-shadow: 0 0 25px rgba(124, 77, 255, 0.15);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Resources;
