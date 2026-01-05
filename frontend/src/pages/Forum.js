import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import API_BASE_URL from '../config';

const Forum = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

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
      const res = await axios.get(
        `${API_BASE_URL}/api/forum/categories`,
        authHeader
      );
      setCategories(res.data.categories);
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
      const res = await axios.get(
        `${API_BASE_URL}/api/forum/posts${q}`,
        authHeader
      );
      setPosts(res.data.posts || []);
    } catch {
      toast.error('Failed to fetch posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPost = async (postId) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/forum/posts/${postId}`,
        authHeader
      );
      setPost(res.data.post);
    } catch {
      toast.error('Failed to fetch post');
    }
  };

  /* ---------------- ACTIONS ---------------- */
  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE_URL}/api/forum/posts`,
        newPost,
        authHeader
      );
      toast.success('Post created');
      setShowCreatePost(false);
      setNewPost({ title: '', content: '', category: 'general' });
      fetchPosts();
    } catch {
      toast.error('Failed to create post');
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE_URL}/api/forum/posts/${id}/replies`,
        { content: newReply },
        authHeader
      );
      toast.success('Reply added');
      setNewReply('');
      fetchPost(id);
    } catch {
      toast.error('Failed to add reply');
    }
  };

  /* ---------------- POST VIEW ---------------- */
  if (id && post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/forum')} className="mb-4 text-blue-600">
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
        <p className="mb-6">{post.content}</p>

        <h2 className="font-semibold mb-2">Replies</h2>
        {post.replies?.map((r, i) => (
          <div key={i} className="mb-3 border-l-4 pl-4">
            {r.content}
          </div>
        ))}

        <form onSubmit={handleAddReply}>
          <textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            className="w-full border p-2"
            required
          />
          <button className="mt-2 bg-blue-600 text-white px-4 py-2">
            Reply
          </button>
        </form>
      </div>
    );
  }

  /* ---------------- LIST VIEW ---------------- */
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={() => setShowCreatePost(true)}
        className="mb-6 bg-blue-600 text-white px-4 py-2"
      >
        + New Post
      </button>

      {loading ? (
        <p>Loading…</p>
      ) : (
        posts.map(p => (
          <div
            key={p._id}
            onClick={() => navigate(`/forum/${p._id}`)}
            className="border p-4 mb-4 cursor-pointer"
          >
            <h2 className="font-bold">{p.title}</h2>
            <p>{p.content.slice(0, 100)}...</p>
          </div>
        ))
      )}

      {showCreatePost && (
        <form onSubmit={handleCreatePost} className="mt-6">
          <input
            placeholder="Title"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            className="border w-full mb-2 p-2"
            required
          />
          <textarea
            placeholder="Content"
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            className="border w-full mb-2 p-2"
            required
          />
          <button className="bg-green-600 text-white px-4 py-2">
            Post
          </button>
        </form>
      )}
    </div>
  );
};

export default Forum;
