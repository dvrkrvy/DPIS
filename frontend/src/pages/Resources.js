import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Resources = () => {
  const { token, user } = useAuth();
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [filters, setFilters] = useState({ category: '', contentType: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [personalized, setPersonalized] = useState(true);
  const [testResultsCount, setTestResultsCount] = useState(null);

  useEffect(() => {
    if (token) {
      fetchCategories();
      fetchContentTypes();
      fetchResources();
    }
  }, [filters, token, personalized]);

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

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Add personalization parameter if user is a student
      if (personalized && user?.role === 'student') {
        params.append('personalized', 'true');
      }
      
      if (filters.category) params.append('category', filters.category);
      if (filters.contentType) params.append('contentType', filters.contentType);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/api/resources?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(response.data.resources || []);
      setTestResultsCount(response.data.testResultsCount);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch resources';
      toast.error(errorMessage);
      setResources([]);
      
      // Log more details for debugging
      if (error.response?.data?.error) {
        console.error('Detailed error:', error.response.data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'article': return '📄';
      case 'guide': return '📖';
      default: return '📚';
    }
  };

  const isYouTubeUrl = (url) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('embed')) return url;
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent mb-2">
              Resource Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {personalized && user?.role === 'student' 
                ? 'Personalized resources based on your recent test results' 
                : 'Access mental health resources and support materials'}
            </p>
          </div>
          {user?.role === 'student' && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300">All Resources</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={personalized}
                    onChange={(e) => setPersonalized(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-14 h-7 rounded-full transition-colors ${
                    personalized ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    <div className={`w-6 h-6 rounded-full bg-white transition-transform mt-0.5 ml-0.5 ${
                      personalized ? 'translate-x-7' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Personalized</span>
              </label>
            </div>
          )}
        </div>
        {personalized && user?.role === 'student' && testResultsCount !== null && (
          <div className={`mt-4 p-4 rounded-xl ${
            testResultsCount > 0 
              ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800' 
              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
          }`}>
            {testResultsCount > 0 ? (
              <p className="text-sm text-primary-800 dark:text-primary-200">
                ✨ Showing resources tailored to your last {Math.min(testResultsCount, 3)} test result{testResultsCount > 1 ? 's' : ''}. 
                Take more tests to improve personalization.
              </p>
            ) : (
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                📋 You haven't taken any screening tests yet. 
                <a href="/screening" className="underline font-medium ml-1">Take a test</a> to get personalized resources.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search resources..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Type</label>
            <select
              value={filters.contentType}
              onChange={(e) => setFilters({ ...filters, contentType: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            >
              <option value="">All Types</option>
              {contentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading resources...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map(resource => (
            <div key={resource.id} className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transform hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl transform group-hover:scale-110 transition-transform">{getCategoryIcon(resource.category)}</span>
                <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs rounded-full font-medium">
                  {resource.category}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{resource.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{resource.description}</p>
              
              {resource.category === 'video' && isYouTubeUrl(resource.url) ? (
                <div className="mb-4">
                  <div className="relative pb-[56.25%] h-0 overflow-hidden rounded">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={getYouTubeEmbedUrl(resource.url)}
                      title={resource.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              ) : resource.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors group/link"
                >
                  View Resource <span className="ml-1 group-hover/link:translate-x-1 transition-transform">→</span>
                </a>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-sm">Content available</div>
              )}
              
              {resource.tags && resource.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {resource.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && resources.length === 0 && (
        <div className="text-center py-12">
          {personalized && user?.role === 'student' && testResultsCount === 0 ? (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No personalized resources available yet.
              </p>
              <a 
                href="/screening" 
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Take a Screening Test
              </a>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No resources found. Try adjusting your filters.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Resources;
