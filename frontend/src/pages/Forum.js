import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import API_BASE_URL from '../config';

const Forum = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);

  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFeed, setSelectedFeed] = useState('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const [newReply, setNewReply] = useState('');
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [expandedPost, setExpandedPost] = useState(null);
  const [replyDraftByPostId, setReplyDraftByPostId] = useState({});
  const [loading, setLoading] = useState(true);

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE_URL, {
      auth: { token }
    });

    socket.on('new-post', fetchPosts);
    socket.on('new-reply', () => {
      if (id) fetchPost(id);
      if (expandedPostId) fetchExpandedPost(expandedPostId);
    });

    return () => socket.disconnect();
  }, [id, token]);

  /* ---------------- DATA ---------------- */
  useEffect(() => {
    if (!token) return;

    fetchCategories();
    id ? fetchPost(id) : fetchPosts();
  }, [id, selectedCategory, token]);

  const authHeader = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/forum/categories', authHeader);
      setCategories(res.data.categories || []);
    } catch {
      setCategories([
        { value: 'general', label: 'General' },
        { value: 'anxiety', label: 'Anxiety Support' },
        { value: 'depression', label: 'Depression' },
        { value: 'wellness', label: 'Wellness' },
        { value: 'support', label: 'Support' }
      ]);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = selectedCategory ? `?category=${selectedCategory}` : '';
      const res = await api.get(`/api/forum/posts${q}`, authHeader);
      setPosts(res.data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      toast.error('Failed to fetch posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPost = async (postId) => {
    try {
      const res = await api.get(`/api/forum/posts/${postId}`, authHeader);
      setPost(res.data.post);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      toast.error('Failed to fetch post');
    }
  };

  const fetchExpandedPost = async (postId) => {
    try {
      const res = await api.get(`/api/forum/posts/${postId}`, authHeader);
      setExpandedPost(res.data.post);
    } catch (error) {
      console.error('Failed to fetch expanded post:', error);
      toast.error('Failed to load thread');
    }
  };

  /* ---------------- ACTIONS ---------------- */
  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/forum/posts', newPost, authHeader);
      toast.success('Post created');
      setShowCreatePost(false);
      setNewPost({ title: '', content: '', category: 'general' });
      fetchPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/forum/posts/${id}/replies`, { content: newReply }, authHeader);
      toast.success('Reply added');
      setNewReply('');
      fetchPost(id);
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleAddReplyInline = async (postId) => {
    const content = (replyDraftByPostId[postId] || '').trim();
    if (!content) return;
    try {
      await api.post(`/api/forum/posts/${postId}/replies`, { content }, authHeader);
      toast.success('Reply added');
      setReplyDraftByPostId(prev => ({ ...prev, [postId]: '' }));
      fetchPosts();
      fetchExpandedPost(postId);
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const getReactionCounts = (p) => {
    const reactions = Array.isArray(p?.reactions) ? p.reactions : [];
    return {
      likes: reactions.filter(r => r.type === 'like').length,
      dislikes: reactions.filter(r => r.type === 'dislike').length
    };
  };

  const handleReact = async (postId, type) => {
    try {
      await api.post(`/api/forum/posts/${postId}/reactions`, { type }, authHeader);
      // Refresh list + expanded view
      fetchPosts();
      if (expandedPostId === postId) {
        fetchExpandedPost(postId);
      }
    } catch (error) {
      console.error('Failed to react:', error);
      toast.error('Failed to react');
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

  const getCategoryColor = (category) => {
    const colors = {
      general: darkMode ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-secondary/10 text-cyan-600 border-secondary/30',
      wellness: darkMode ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200',
      anxiety: darkMode ? 'bg-accent/10 text-accent border-accent/20' : 'bg-accent/10 text-accent border-accent/30',
      depression: darkMode ? 'bg-primary/10 text-primary border-primary/20' : 'bg-primary/10 text-primary border-primary/30',
      support: darkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200'
    };
    return colors[category] || colors.general;
  };

  const getCategoryDotColor = (category) => {
    const colors = {
      general: darkMode ? 'bg-secondary' : 'bg-secondary',
      wellness: darkMode ? 'bg-green-400' : 'bg-green-500',
      anxiety: darkMode ? 'bg-accent' : 'bg-accent',
      depression: darkMode ? 'bg-primary' : 'bg-primary',
      support: darkMode ? 'bg-blue-400' : 'bg-blue-500'
    };
    return colors[category] || colors.general;
  };

  const getAvatarInitials = (anonymousId) => {
    if (!anonymousId) return 'A';
    return anonymousId.charAt(0).toUpperCase();
  };

  const filteredPosts = posts.filter(p => 
    searchQuery === '' || 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ---------------- POST VIEW ---------------- */
  if (id && post) {
    const bgMain = darkMode ? 'bg-black' : 'bg-white';
    const textMain = darkMode ? 'text-white' : 'text-black';
    const cardBg = darkMode ? 'bg-surface-card' : 'bg-white';
    const cardBorder = darkMode ? 'border-border-dark' : 'border-border-light';
    
    return (
      <div className={`min-h-screen ${bgMain} ${textMain} transition-colors pt-32 pb-24 px-4 sm:px-6 lg:px-8`}>
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => navigate('/forum')} 
            className={`mb-6 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'} font-medium flex items-center gap-2 transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Forum
          </button>

          <div className={`${cardBg} border ${cardBorder} rounded-2xl shadow-lg p-6 mb-6`}>
            <h1 className={`text-3xl font-bold mb-4 ${textMain}`}>{post.title}</h1>
            <div className="mb-4 flex items-center gap-3">
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getCategoryColor(post.category || 'general')}`}>
                {post.category || 'general'}
              </span>
              {post.createdAt && (
                <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap leading-relaxed`}>{post.content}</p>
          </div>

          <div className={`${cardBg} border ${cardBorder} rounded-2xl shadow-lg p-6 mb-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${textMain}`}>Replies ({post.replies?.length || 0})</h2>
            {post.replies && post.replies.length > 0 ? (
              <div className="space-y-4">
                {post.replies.map((r, i) => (
                  <div key={i} className={`border-l-4 ${darkMode ? 'border-primary/50' : 'border-primary'} pl-4 py-2 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-r-lg`}>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{r.content}</p>
                    {r.createdAt && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} italic`}>No replies yet. Be the first to reply!</p>
            )}
          </div>

          <div className={`${cardBg} border ${cardBorder} rounded-2xl shadow-lg p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${textMain}`}>Add a Reply</h3>
            <form onSubmit={handleAddReply}>
              <textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                className={`w-full border ${darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-3 focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-primary' : 'focus:ring-primary'} focus:border-transparent resize-none`}
                placeholder="Write your reply..."
                rows={4}
                required
              />
              <button 
                type="submit"
                className={`mt-3 ${darkMode ? 'bg-primary hover:bg-primary/90' : 'bg-primary hover:bg-primary/90'} text-white font-medium px-6 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg`}
              >
                Post Reply
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- LIST VIEW ---------------- */
  const bgMain = darkMode ? 'bg-black' : 'bg-white';
  const textMain = darkMode ? 'text-white' : 'text-black';
  const surfaceCard = darkMode ? 'bg-surface-card' : 'bg-white';
  const borderDark = darkMode ? 'border-border-dark' : 'border-border-light';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const textTertiary = darkMode ? 'text-gray-500' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bgMain} ${textMain} transition-colors`}>
      {/* Background Effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        {darkMode ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] opacity-20 animate-float"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] opacity-10 animate-pulse"></div>
            <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern height="40" id="grid-pattern" patternUnits="userSpaceOnUse" width="40">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"></path>
                </pattern>
              </defs>
              <rect fill="url(#grid-pattern)" height="100%" width="100%"></rect>
            </svg>
          </>
        ) : (
          <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern height="40" id="grid-pattern-light" patternUnits="userSpaceOnUse" width="40">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" strokeWidth="1"></path>
              </pattern>
            </defs>
            <rect fill="url(#grid-pattern-light)" height="100%" width="100%"></rect>
          </svg>
        )}
      </div>

      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 relative z-0">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 reveal-up">
          <div>
            <h1 className={`text-4xl font-display font-bold ${textMain} tracking-tight mb-2`}>
              Community Forum
            </h1>
            <p className={`${textSecondary} max-w-xl font-light`}>
              Share experiences, ask questions, and find support in a safe, moderated space.
            </p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0 md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className={`w-5 h-5 ${textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2.5 ${surfaceCard} border ${borderDark} rounded-xl text-sm placeholder-gray-500 focus:outline-none ${darkMode ? 'focus:border-primary focus:ring-1 focus:ring-primary text-white' : 'focus:border-primary focus:ring-1 focus:ring-primary text-black'} transition-all`}
                placeholder="Search discussions..."
              />
            </div>
            <button
              onClick={() => setShowCreatePost(true)}
              className={`${darkMode ? 'bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(124,77,255,0.4)]' : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20'} text-white px-6 py-2.5 rounded-xl font-semibold transition-all transform hover:-translate-y-1 flex items-center gap-2 whitespace-nowrap group`}
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Post
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6 reveal-up delay-100">
            <div className={`${surfaceCard} border ${borderDark} rounded-2xl p-4 sticky top-32 ${darkMode ? '' : 'shadow-sm'}`}>
              <div className={`pb-4 border-b ${darkMode ? 'border-white/5' : 'border-gray-100'} mb-4`}>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Feeds</h3>
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => setSelectedFeed('all')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium border-l-2 transition-colors ${
                    selectedFeed === 'all'
                      ? darkMode
                        ? 'bg-white/5 text-white border-primary'
                        : 'bg-black text-white border-primary'
                      : darkMode
                        ? 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                        : 'text-black hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  All Discussions
                </button>
                <button
                  onClick={() => setSelectedFeed('trending')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium border-l-2 transition-colors ${
                    selectedFeed === 'trending'
                      ? darkMode
                        ? 'bg-white/5 text-white border-primary'
                        : 'bg-black text-white border-primary'
                      : darkMode
                        ? 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                        : 'text-black hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                  Trending
                </button>
                <button
                  onClick={() => setSelectedFeed('saved')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium border-l-2 transition-colors ${
                    selectedFeed === 'saved'
                      ? darkMode
                        ? 'bg-white/5 text-white border-primary'
                        : 'bg-black text-white border-primary'
                      : darkMode
                        ? 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                        : 'text-black hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Saved
                </button>
                <button
                  onClick={() => setSelectedFeed('following')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium border-l-2 transition-colors ${
                    selectedFeed === 'following'
                      ? darkMode
                        ? 'bg-white/5 text-white border-primary'
                        : 'bg-black text-white border-primary'
                      : darkMode
                        ? 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                        : 'text-black hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Following
                </button>
              </nav>

              <div className={`pb-4 border-b ${darkMode ? 'border-white/5' : 'border-gray-100'} mb-4 mt-8`}>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Categories</h3>
              </div>
              <nav className="space-y-1">
                {categories.map((cat) => {
                  const categoryValue = cat.value || cat;
                  const categoryLabel = cat.label || cat;
                  const isSelected = selectedCategory === categoryValue;
                  return (
                    <button
                      key={categoryValue}
                      onClick={() => {
                        setSelectedCategory(isSelected ? '' : categoryValue);
                        setSelectedFeed('all');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${
                        isSelected
                          ? darkMode
                            ? 'bg-white/5'
                            : 'bg-gray-100'
                          : darkMode
                            ? 'text-gray-400 hover:text-white hover:bg-white/5'
                            : 'text-black hover:bg-gray-100 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${getCategoryDotColor(categoryValue)}`}></span>
                        {categoryLabel}
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/5 text-gray-500 group-hover:text-white' : 'bg-gray-100 text-gray-600'} font-bold`}>
                        {posts.filter(p => (p.category || 'general') === categoryValue).length}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${darkMode ? 'border-primary' : 'border-primary'} mx-auto mb-4`}></div>
                  <p className={textSecondary}>Loading posts...</p>
                </div>
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((p, idx) => {
                const isAnnouncement = p.isPinned || p.category === 'announcement';
                const isExpanded = expandedPostId === p._id;
                const counts = getReactionCounts(p);
                return (
                  <React.Fragment key={p._id}>
                    <div
                      onClick={() => {
                        const next = isExpanded ? null : p._id;
                        setExpandedPostId(next);
                        setExpandedPost(null);
                        if (next) {
                          fetchExpandedPost(next);
                        }
                      }}
                      className={`reveal-up delay-${idx < 3 ? (idx + 1) * 100 : 300} group ${surfaceCard} border ${
                        isAnnouncement
                          ? darkMode
                            ? 'border-primary/30 bg-mesh-card'
                            : 'border-primary/40 bg-mesh-card'
                          : borderDark
                      } rounded-2xl p-6 transition-all duration-300 ${
                        darkMode
                          ? isAnnouncement
                            ? 'hover:border-primary/60 card-glow'
                            : 'hover:border-white/20 hover:bg-white/[0.02]'
                          : isAnnouncement
                            ? 'hover:shadow-lg hover:shadow-primary/5'
                            : 'hover:border-gray-400 hover:shadow-md'
                      } cursor-pointer`}
                    >
                    {isAnnouncement && (
                      <div className="absolute top-4 right-4">
                        <svg className={`w-5 h-5 ${darkMode ? 'text-primary/60' : 'text-primary'} transform rotate-45`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {p.anonymousId && p.anonymousId !== 'Anonymous' ? (
                          <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-800 border border-white/10' : 'bg-gray-100 border border-gray-200'} flex items-center justify-center overflow-hidden`}>
                            <img
                              alt="User"
                              className={`w-full h-full object-cover ${darkMode ? 'opacity-80 group-hover:opacity-100' : 'group-hover:scale-105'} transition-all`}
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.anonymousId)}&background=7C4DFF&color=fff&size=128`}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className={`w-full h-full ${darkMode ? 'bg-accent/10 border border-accent/30 text-accent' : 'bg-accent/10 border border-accent/30 text-accent'} rounded-full items-center justify-center hidden`}>
                              <span className="text-sm font-bold">{getAvatarInitials(p.anonymousId)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-surface-dark border border-white/10 text-gray-500' : 'bg-gray-50 border border-gray-200 text-gray-500'} flex items-center justify-center`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300 group-hover:text-white' : 'text-black'} transition-colors`}>
                              {p.anonymousId && p.anonymousId !== 'Anonymous' ? `${p.anonymousId.substring(0, 8)}...` : 'Anonymous User'}
                            </span>
                            <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getCategoryColor(p.category || 'general')}`}>
                              {categories.find(c => (c.value || c) === (p.category || 'general'))?.label || p.category || 'General'}
                            </span>
                          </div>
                          {p.createdAt && (
                            <span className={`text-xs ${textTertiary}`}>
                              {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <h3 className={`text-lg font-display font-semibold ${textMain} mb-2 ${darkMode ? 'group-hover:text-secondary' : 'group-hover:text-primary'} transition-colors`}>
                          {p.title}
                        </h3>
                        <p className={`${textSecondary} text-sm leading-relaxed mb-4 line-clamp-2`}>
                          {p.content}
                        </p>
                        <div className={`flex items-center gap-6 text-xs ${textTertiary} font-medium`}>
                          <div className={`flex items-center gap-1.5 ${darkMode ? 'group-hover:text-secondary' : 'group-hover:text-primary'} transition-colors`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{p.replies?.length || 0} {p.replies?.length === 1 ? 'Reply' : 'Replies'}</span>
                          </div>
                          <div className="flex items-center gap-3 ml-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReact(p._id, 'like');
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                                darkMode ? 'text-gray-400 hover:text-primary hover:bg-white/5' : 'text-gray-600 hover:text-primary hover:bg-gray-100'
                              }`}
                              title="Like"
                            >
                              <span className="material-symbols-outlined text-base">thumb_up</span>
                              <span className="font-bold">{counts.likes}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReact(p._id, 'dislike');
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                                darkMode ? 'text-gray-400 hover:text-secondary hover:bg-white/5' : 'text-gray-600 hover:text-secondary hover:bg-gray-100'
                              }`}
                              title="Dislike"
                            >
                              <span className="material-symbols-outlined text-base">thumb_down</span>
                              <span className="font-bold">{counts.dislikes}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                    {isExpanded && (
                    <div
                      className={`${surfaceCard} border ${borderDark} rounded-2xl p-6 -mt-2 mb-4 ${
                        darkMode ? 'bg-white/[0.02]' : 'bg-gray-50'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!expandedPost ? (
                        <div className="py-6 text-center">
                          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${darkMode ? 'border-primary' : 'border-primary'} mx-auto mb-3`}></div>
                          <p className={textSecondary}>Loading thread...</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-lg font-display font-bold ${textMain}`}>
                              Replies ({expandedPost.replies?.length || 0})
                            </h4>
                            <button
                              type="button"
                              onClick={() => navigate(`/forum/${p._id}`)}
                              className={`text-xs font-bold uppercase tracking-widest ${
                                darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                              } transition-colors`}
                            >
                              Open Full View →
                            </button>
                          </div>

                          <div className="space-y-4">
                            {expandedPost.replies && expandedPost.replies.length > 0 ? (
                              expandedPost.replies.map((r, i) => (
                                <div
                                  key={i}
                                  className={`${darkMode ? 'bg-surface-card border-white/10' : 'bg-white border-gray-200'} border rounded-xl p-4`}
                                >
                                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed whitespace-pre-wrap`}>
                                    {r.content}
                                  </p>
                                  {r.createdAt && (
                                    <p className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                      {new Date(r.createdAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} italic`}>
                                No replies yet. Be the first to reply!
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={replyDraftByPostId[p._id] || ''}
                              onChange={(e) => setReplyDraftByPostId(prev => ({ ...prev, [p._id]: e.target.value }))}
                              className={`flex-grow ${
                                darkMode
                                  ? 'bg-white/5 border-white/10 text-white placeholder-gray-500'
                                  : 'bg-white border-gray-200 text-black placeholder-gray-500'
                              } border rounded-full py-3 px-6 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all text-sm`}
                              placeholder="Write a reply..."
                            />
                            <button
                              type="button"
                              onClick={() => handleAddReplyInline(p._id)}
                              className={`${darkMode ? 'bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(124,77,255,0.35)]' : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20'} text-white font-bold px-6 py-3 rounded-full flex items-center gap-2 transition-all btn-glow whitespace-nowrap`}
                            >
                              <span>Post Reply</span>
                              <span className="material-symbols-outlined text-lg">send</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <div className={`${surfaceCard} border ${borderDark} rounded-2xl p-12 text-center`}>
                <p className={`${textSecondary} text-lg mb-4`}>No posts found. Be the first to start a discussion!</p>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className={`${darkMode ? 'bg-primary hover:bg-primary/90' : 'bg-primary hover:bg-primary/90'} text-white font-medium px-6 py-2 rounded-lg transition-colors`}
                >
                  Create First Post
                </button>
              </div>
            )}

            {filteredPosts.length > 0 && (
              <div className="reveal-up delay-400 text-center pt-4">
                <button
                  className={`text-sm ${textSecondary} hover:${textMain} border-b ${darkMode ? 'border-gray-700 hover:border-white' : 'border-gray-300 hover:border-black'} transition-all pb-1 font-medium`}
                  onClick={() => {
                    // Load more functionality can be added here
                    toast.info('Loading more posts...');
                  }}
                >
                  Load more discussions
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreatePost(false)}
        >
          <div
            className={`${surfaceCard} border ${borderDark} rounded-xl p-6 max-w-2xl w-full shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-2xl font-bold mb-4 ${textMain}`}>Create New Post</h2>
            <form onSubmit={handleCreatePost}>
              <div className="mb-4">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Title</label>
                <input
                  placeholder="Enter post title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className={`w-full border ${darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                  required
                />
              </div>
              <div className="mb-4">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Category</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className={`w-full border ${darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                >
                  {categories.map((cat) => {
                    const value = cat.value || cat;
                    const label = cat.label || cat;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              </div>
              <div className="mb-4">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Content</label>
                <textarea
                  placeholder="Write your post content..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className={`w-full border ${darkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none`}
                  rows={6}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className={`flex-1 ${darkMode ? 'bg-primary hover:bg-primary/90' : 'bg-primary hover:bg-primary/90'} text-white font-medium px-6 py-2 rounded-lg transition-colors`}
                >
                  Create Post
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className={`px-6 py-2 border ${borderDark} ${textMain} rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40 items-end">
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
            className={`${surfaceCard} border ${borderDark} rounded-xl p-6 max-w-md w-full shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Emergency Support</h2>
            <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              If you are in immediate danger, please call <strong className="text-red-600 dark:text-red-400">911</strong> or your local emergency services.
            </p>
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>National Suicide Prevention Lifeline:</strong>
                <a href="tel:988" className="text-red-600 dark:text-red-400 font-semibold text-lg hover:underline">988</a>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Crisis Text Line:</strong>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Text HOME to 741741</p>
              </div>
              {emergencyContacts?.institutionEmail && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Institution Email:</strong>
                  <a href={`mailto:${emergencyContacts.institutionEmail}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                    {emergencyContacts.institutionEmail}
                  </a>
                </div>
              )}
              {emergencyContacts?.institutionPhone && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Institution Phone:</strong>
                  <a href={`tel:${emergencyContacts.institutionPhone}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                    {emergencyContacts.institutionPhone}
                  </a>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEmergencyModal(false)}
              className={`w-full ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-black hover:bg-gray-900'} text-white font-bold py-2 px-4 rounded-lg transition-colors`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;
