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
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE_URL, {
      auth: { token }
    });

    socket.on('new-post', fetchPosts);
    socket.on('new-reply', () => id && fetchPost(id));

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
        { value: 'anxiety', label: 'Anxiety' },
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

  /* ---------------- POST VIEW ---------------- */
  if (id && post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
        <button 
          onClick={() => navigate('/forum')} 
          className="mb-6 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-2 transition-colors"
        >
          <span>←</span> Back to Forum
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{post.title}</h1>
          <div className="mb-4">
            <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-sm rounded-full font-medium">
              {post.category || 'general'}
            </span>
            {post.createdAt && (
              <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Replies ({post.replies?.length || 0})</h2>
          {post.replies && post.replies.length > 0 ? (
            <div className="space-y-4">
              {post.replies.map((r, i) => (
                <div key={i} className="border-l-4 border-primary-500 dark:border-primary-400 pl-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-r-lg">
                  <p className="text-gray-700 dark:text-gray-300">{r.content}</p>
                  {r.createdAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No replies yet. Be the first to reply!</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add a Reply</h3>
          <form onSubmit={handleAddReply}>
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Write your reply..."
              rows={4}
              required
            />
            <button 
              type="submit"
              className="mt-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium px-6 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              Post Reply
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ---------------- LIST VIEW ---------------- */
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent mb-2">
          Community Forum
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Share experiences, ask questions, and support each other</p>
      </div>

      <button
        onClick={() => setShowCreatePost(true)}
        className="mb-6 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 dark:from-primary-500 dark:hover:from-primary-600 text-white font-bold px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
      >
        <span>+</span> New Post
      </button>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading posts...</p>
          </div>
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map(p => (
            <div
              key={p._id}
              onClick={() => navigate(`/forum/${p._id}`)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  {p.title}
                </h2>
                <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs rounded-full font-medium">
                  {p.category || 'general'}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{p.content}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                {p.replies && (
                  <span className="flex items-center gap-1">
                    💬 {p.replies.length} {p.replies.length === 1 ? 'reply' : 'replies'}
                  </span>
                )}
                {p.createdAt && (
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No posts yet. Be the first to start a discussion!</p>
          <button
            onClick={() => setShowCreatePost(true)}
            className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Create First Post
          </button>
        </div>
      )}

      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreatePost(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Create New Post</h2>
            <form onSubmit={handleCreatePost}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <input
                  placeholder="Enter post title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="depression">Depression</option>
                  <option value="anxiety">Anxiety</option>
                  <option value="stress">Stress</option>
                  <option value="wellness">Wellness</option>
                  <option value="support">Support</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
                <textarea
                  placeholder="Write your post content..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={6}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Create Post
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
          onClick={async () => {
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
          }}
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
            className={`${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-white/10' : 'border-gray-200'} rounded-xl p-6 max-w-md w-full shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Emergency Support</h2>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              If you are in immediate danger, please call <strong className="text-red-600 dark:text-red-400">911</strong> or your local emergency services.
            </p>
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>National Suicide Prevention Lifeline:</strong>
                <a href="tel:988" className="text-red-600 dark:text-red-400 font-semibold text-lg hover:underline">988</a>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Crisis Text Line:</strong>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Text HOME to 741741</p>
              </div>
              {emergencyContacts?.institutionEmail && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Institution Email:</strong>
                  <a href={`mailto:${emergencyContacts.institutionEmail}`} className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                    {emergencyContacts.institutionEmail}
                  </a>
                </div>
              )}
              {emergencyContacts?.institutionPhone && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <strong className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Institution Phone:</strong>
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
    </div>
  );
};

export default Forum;
