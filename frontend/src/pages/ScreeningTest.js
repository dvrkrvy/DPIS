import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const ScreeningTest = () => {
  const { token } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [testType, setTestType] = useState('');
  const [test, setTest] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(null);

  useEffect(() => {
    if (token) {
      fetchTests();
    }
  }, [token]);

  const fetchTests = async () => {
    try {
      await api.get('/api/screening/tests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Don't auto-select - let user choose
      // Tests are available, user will select manually
    } catch (error) {
      console.error('Failed to fetch tests:', error);
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
      const response = await api.get(`/api/screening/tests/${testType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTest(response.data);
      setResponses({});
      setCurrentQuestion(0);
    } catch (error) {
      console.error('Failed to load test:', error);
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
      const response = await api.post(
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

  const handleEmergencyClick = async () => {
    try {
      const response = await api.get('/api/emergency/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmergencyContacts(response.data.contacts);
      setShowEmergencyModal(true);
    } catch (error) {
      console.error('Failed to fetch emergency contacts:', error);
      // Show default contacts even if API fails
      setEmergencyContacts({
        hotline: '988',
        institutionEmail: 'support@dpis.edu',
        institutionPhone: '1-800-273-8255'
      });
      setShowEmergencyModal(true);
    }
  };

  const bgMain = darkMode ? 'bg-black' : 'bg-gray-50';
  const textMain = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
  const cardBorder = darkMode ? 'border-white/10' : 'border-gray-200';

  const testCards = useMemo(() => ([
    {
      key: 'PHQ9',
      title: 'PHQ-9 (Depression)',
      description: 'A 9-question instrument to screen for the presence and severity of depression.',
      time: '5–10 mins',
      badge: 'Recommended',
      accent: 'purple',
      image:
        "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1600&auto=format&fit=crop"
    },
    {
      key: 'GAD7',
      title: 'GAD-7 (Anxiety)',
      description: 'A 7-item scale used to screen for General Anxiety Disorder and assess severity.',
      time: '3–5 mins',
      badge: null,
      accent: 'cyan',
      image:
        "https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?q=80&w=1600&auto=format&fit=crop"
    },
    {
      key: 'GHQ',
      title: 'GHQ-12 (General Health)',
      description: 'A 12-question screening tool for identifying general psychological wellbeing.',
      time: '5–7 mins',
      badge: null,
      accent: 'green',
      image:
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1600&auto=format&fit=crop"
    }
  ]), []);

  if (!test && !testType) {
    return (
      <div className={`min-h-screen ${bgMain} ${textMain} transition-colors`}>
        <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3 reveal-up">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Select{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-purple-400 to-cyan-400">
                Assessment
              </span>
            </h1>
            <p className={`max-w-2xl mx-auto text-base md:text-lg ${textSecondary}`}>
              Choose a mental health screening test to assess your wellbeing. All tests are confidential and anonymous.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch reveal-up delay-100">
            {testCards.map((card, idx) => {
              const accent =
                card.accent === 'purple'
                  ? 'hover:border-purple-500/50'
                  : card.accent === 'cyan'
                    ? 'hover:border-cyan-500/50'
                    : 'hover:border-green-500/50';

              const badgeBg =
                card.accent === 'purple'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/20'
                  : card.accent === 'cyan'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20'
                    : 'bg-green-500/20 text-green-300 border-green-500/20';

              // Determine button background color and shadow
              const getButtonStyles = () => {
                if (card.accent === 'purple') {
                  return {
                    className: 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25',
                  };
                } else if (card.accent === 'cyan') {
                  return {
                    className: 'bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/25',
                  };
                } else {
                  return {
                    className: 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/25',
                  };
                }
              };

              const buttonStyles = getButtonStyles();

              return (
                <div
                  key={card.key}
                  className={`group relative ${cardBg} border ${cardBorder} ${accent} rounded-2xl overflow-hidden transition-all duration-300 shadow-lg flex flex-col h-full`}
                  style={{ animationDelay: `${0.1 * (idx + 1)}s` }}
                >
                  <div className="w-full relative h-56 overflow-hidden bg-black">
                    <div
                      className={`absolute inset-0 z-10 ${
                        card.accent === 'purple'
                          ? 'bg-purple-500/20'
                          : card.accent === 'cyan'
                            ? 'bg-cyan-500/20'
                            : 'bg-green-500/20'
                      } mix-blend-multiply`}
                    />
                    <img
                      alt={card.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                      src={card.image}
                    />
                    {card.badge && (
                      <div className="absolute top-4 right-4 z-20">
                        <span className={`backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${badgeBg}`}>
                          {card.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-8 flex-1 flex flex-col relative">
                    <div className="mb-auto">
                      <h2 className="text-xl font-bold mb-3">
                        {card.title}
                      </h2>
                      <p className={`text-sm leading-relaxed mb-6 ${textSecondary}`}>
                        {card.description}
                      </p>
                      <div className={`grid grid-cols-2 gap-y-3 gap-x-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'} mb-6`}>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeWidth: '2' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{card.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeWidth: '2' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Validated</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeWidth: '2' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Confidential</span>
                        </div>
                      </div>
                    </div>

                    <div className={`pt-6 mt-4 border-t ${darkMode ? 'border-white/5' : 'border-gray-200'} flex flex-col gap-4`}>
                      <button
                        onClick={() => setTestType(card.key)}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 text-white ${buttonStyles.className}`}
                        style={{
                          backgroundColor: card.accent === 'purple' ? '#9333ea' : card.accent === 'cyan' ? '#06b6d4' : '#10b981',
                        }}
                      >
                        Start Assessment
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeWidth: '2' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`reveal-up delay-300 ${darkMode ? 'bg-gray-900/60 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6 backdrop-blur-sm`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full shrink-0 ${darkMode ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ strokeWidth: '2' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold mb-2">About These Assessments</h4>
                <p className={`text-sm leading-relaxed ${textSecondary}`}>
                  These tools are screening instruments, not diagnostic tools. A high score indicates a higher likelihood of a condition but does not confirm it. If you're in immediate danger, contact emergency services right away.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Floating Action Buttons (same pattern as Dashboard) */}
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
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes reveal-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .reveal-up { animation: reveal-up 0.8s forwards; opacity: 0; }
          .delay-100 { animation-delay: 0.1s; }
          .delay-300 { animation-delay: 0.3s; }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-\\[shimmer_2s_infinite\\] {
            animation: shimmer 2s infinite;
          }
          
          /* Hide any Material Icon text that might leak through */
          .material-symbols-outlined {
            display: none !important;
            visibility: hidden !important;
          }
        `}</style>
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

  const answerLabels = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

  return (
    <div className={`min-h-screen ${bgMain} ${textMain} transition-colors`}>
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-center">
        <div className={`reveal-up relative ${darkMode ? 'bg-gray-900' : 'bg-white'} ${darkMode ? 'border-white/10' : 'border-gray-200'} border rounded-2xl p-6 md:p-8 shadow-2xl ${darkMode ? 'shadow-purple-500/5' : 'shadow-lg'} overflow-hidden backdrop-blur-sm`}>
          {/* Background gradient effects */}
          {darkMode && (
            <>
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] opacity-40 pointer-events-none animate-pulse"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
            </>
          )}

          <div className="relative z-10 space-y-4 mb-8">
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-0.5">
                <h2 className={`text-lg font-bold ${textMain} tracking-tight`}>{test.name}</h2>
                <span className={`text-[10px] font-mono ${textSecondary} tracking-wider uppercase`}>Standardized Screening Protocol</span>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                darkMode 
                  ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' 
                  : 'text-purple-600 bg-purple-50 border-purple-200'
              }`}>
                Question {currentQuestion + 1} of {test.questions.length}
              </span>
            </div>
            <div className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} border ${darkMode ? 'border-white/5' : 'border-gray-200'} h-3 rounded-full overflow-hidden relative`}>
              <div 
                className={`absolute top-0 left-0 h-full bg-gradient-to-r ${darkMode ? 'from-purple-600 to-purple-500' : 'from-purple-600 to-purple-500'} shadow-lg ${darkMode ? 'shadow-purple-500/80' : 'shadow-purple-500/40'} relative overflow-hidden transition-all duration-500`}
                style={{ width: `${progress}%` }}
              >
                {darkMode && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full" style={{ animation: 'shimmer 2s infinite' }}></div>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 mb-8">
            <h1 className={`text-2xl md:text-3xl lg:text-4xl font-bold ${textMain} leading-tight mb-3`}>
              {question.text.split(' ').map((word, idx) => {
                // Highlight certain words with gradient
                const highlightWords = ['doing', 'things', 'feeling', 'trouble', 'feeling'];
                const shouldHighlight = highlightWords.some(hw => word.toLowerCase().includes(hw.toLowerCase()));
                return (
                  <span key={idx}>
                    {shouldHighlight ? (
                      <span className={`bg-clip-text text-transparent ${darkMode ? 'bg-gradient-to-r from-white via-gray-200 to-gray-500' : 'bg-gradient-to-r from-black via-gray-800 to-gray-600'}`}>
                        {word}
                      </span>
                    ) : (
                      word
                    )}
                    {idx < question.text.split(' ').length - 1 && ' '}
                  </span>
                );
              })}
            </h1>
            <p className={`${textSecondary} text-base font-light`}>
              Over the last 2 weeks, how often have you been bothered by this problem?
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-3">
            {[0, 1, 2, 3].map(value => {
              const isSelected = responses[question.id] === value;
              return (
                <button
                  key={value}
                  onClick={() => handleResponse(question.id, value)}
                  className={`group relative w-full text-left p-4 rounded-lg border transition-all duration-200 ease-out transform hover:-translate-y-0.5 ${
                    isSelected
                      ? darkMode
                        ? 'bg-white border-white text-black'
                        : 'bg-black border-black text-white'
                      : darkMode
                        ? `border-white/10 bg-gray-800 hover:bg-white hover:border-white ${textSecondary} hover:text-black`
                        : `border-gray-300 bg-white hover:bg-black hover:border-black ${textMain} hover:text-white`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-base md:text-lg font-medium transition-colors ${
                      isSelected
                        ? darkMode ? 'text-black' : 'text-white'
                        : darkMode ? 'text-gray-300 group-hover:text-black' : 'text-black group-hover:text-white'
                    }`}>
                      {answerLabels[value]}
                    </span>
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full border transition-colors ${
                      isSelected
                        ? darkMode ? 'border-black/30' : 'border-white/30'
                        : darkMode ? 'border-gray-600 group-hover:border-black/30' : 'border-gray-300 group-hover:border-white/30'
                    }`}>
                      <span className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        isSelected
                          ? darkMode ? 'bg-black scale-100' : 'bg-white scale-100'
                          : darkMode ? 'bg-transparent scale-0 group-hover:bg-black group-hover:scale-100' : 'bg-transparent scale-0 group-hover:bg-white group-hover:scale-100'
                      }`}></span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`relative z-10 flex justify-between items-center mt-8 pt-6 border-t ${darkMode ? 'border-white/5' : 'border-gray-200'}`}>
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className={`group flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                darkMode
                  ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:text-black hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            {currentQuestion === test.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={loading || responses[question.id] === undefined}
                className={`group flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-white text-black hover:bg-gray-200 shadow-white/20 hover:shadow-white/40'
                    : 'bg-black text-white hover:bg-gray-900 shadow-xl hover:shadow-2xl'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Assessment'}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={responses[question.id] === undefined}
                className={`group flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-white text-black hover:bg-gray-200 shadow-white/20 hover:shadow-white/40'
                    : 'bg-black text-white hover:bg-gray-900 shadow-xl hover:shadow-2xl'
                }`}
              >
                Next Question
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Buttons (AI Chat & Emergency) */}
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
    </div>
  );
};

export default ScreeningTest;
