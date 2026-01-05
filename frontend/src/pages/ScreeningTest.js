import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ScreeningTest = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [testType, setTestType] = useState('');
  const [test, setTest] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchTests();
    }
  }, [token]);

  const fetchTests = async () => {
    try {
      const response = await axios.get('/api/screening/tests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Don't auto-select - let user choose
      // Tests are available, user will select manually
    } catch (error) {
      toast.error('Failed to fetch tests');
    }
  };

  useEffect(() => {
    if (testType && token) {
      loadTest();
    }
  }, [testType, token]);

  const loadTest = async () => {
    try {
      const response = await axios.get(`/api/screening/tests/${testType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTest(response.data);
      setResponses({});
      setCurrentQuestion(0);
    } catch (error) {
      toast.error('Failed to load test');
    }
  };

  const handleResponse = (questionId, value) => {
    setResponses({ ...responses, [questionId]: value });
  };

  const handleNext = () => {
    if (currentQuestion < test.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      toast.error('Please login first');
      navigate('/onboarding');
      return;
    }

    if (Object.keys(responses).length !== test.questions.length) {
      toast.error('Please answer all questions');
      return;
    }

    // Verify all questions are answered
    const allAnswered = test.questions.every(q => responses[q.id] !== undefined);
    if (!allAnswered) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    try {
      const responsesArray = test.questions.map(q => responses[q.id] !== undefined ? responses[q.id] : 0);
      const response = await axios.post(
        '/api/screening/submit',
        {
          testType,
          responses: responsesArray
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(response.data.recommendation || 'Test submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit test';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!test && !testType) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent">
            Select Screening Test
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Choose a mental health screening test to assess your wellbeing. All tests are confidential and anonymous.</p>
          <div className="space-y-4">
            <button
              onClick={() => setTestType('PHQ9')}
              className="w-full text-left p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all transform hover:scale-[1.02] group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">PHQ-9 (Depression Screening)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">9 questions about depression symptoms over the past 2 weeks</p>
                  <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">5-10 minutes • Validated assessment</span>
                </div>
                <span className="text-2xl transform group-hover:scale-110 transition-transform">📊</span>
              </div>
            </button>
            <button
              onClick={() => setTestType('GAD7')}
              className="w-full text-left p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all transform hover:scale-[1.02] group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">GAD-7 (Anxiety Screening)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">7 questions about anxiety symptoms and worry</p>
                  <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">3-5 minutes • Validated assessment</span>
                </div>
                <span className="text-2xl transform group-hover:scale-110 transition-transform">😰</span>
              </div>
            </button>
            <button
              onClick={() => setTestType('GHQ')}
              className="w-full text-left p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all transform hover:scale-[1.02] group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">GHQ-12 (General Health Questionnaire)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">12 questions about general psychological wellbeing</p>
                  <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">5-7 minutes • Comprehensive assessment</span>
                </div>
                <span className="text-2xl transform group-hover:scale-110 transition-transform">💚</span>
              </div>
            </button>
          </div>
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> These screening tests are not diagnostic tools. They help identify areas where you might benefit from additional support. If you're experiencing a mental health emergency, please contact emergency services immediately.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!test && testType) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading test...</p>
        </div>
      </div>
    );
  }

  const question = test.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / test.questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{test.name}</h2>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Question {currentQuestion + 1} of {test.questions.length}
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">{question.text}</h3>
          <div className="space-y-3">
            {[0, 1, 2, 3].map(value => (
              <button
                key={value}
                onClick={() => handleResponse(question.id, value)}
                className={`w-full text-left p-4 border-2 rounded-xl transition-all transform hover:scale-[1.02] ${
                  responses[question.id] === value
                    ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 bg-white dark:bg-gray-700'
                }`}
              >
                <span className={`font-medium ${
                  responses[question.id] === value
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {value === 0 && 'Not at all'}
                  {value === 1 && 'Several days'}
                  {value === 2 && 'More than half the days'}
                  {value === 3 && 'Nearly every day'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            Previous
          </button>
          {currentQuestion === test.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={loading || responses[question.id] === undefined}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={responses[question.id] === undefined}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreeningTest;
