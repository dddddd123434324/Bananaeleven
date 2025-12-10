import React, { useEffect, useState } from 'react';

interface ApiKeyCheckerProps {
  onReady: (key: string) => void;
}

export const ApiKeyChecker: React.FC<ApiKeyCheckerProps> = ({ onReady }) => {
  const [loading, setLoading] = useState(true);
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkKey = async () => {
    try {
      // 1. Check AI Studio Environment (Sandbox)
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        if (selected) {
           // In AI Studio, the key is injected implicitly, but we pass a flag or dummy
           // Actually, standard env variable is used inside. 
           // However, to unify logic, if we are in AI Studio, we rely on process.env.API_KEY usually.
           // But since we changed service to accept a key, we need to handle this.
           // If process.env.API_KEY is available, use it.
           if (process.env.API_KEY) {
             onReady(process.env.API_KEY);
             return;
           }
        }
      }

      // 2. Check Local Storage (User saved key)
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        onReady(storedKey);
        return;
      }
    } catch (e) {
      console.error("Error checking API key status", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKeyAistudio = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      // In sandbox, we reload or re-check. 
      // Assuming process.env.API_KEY becomes available after selection in sandbox refresh
      window.location.reload(); 
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = inputKey.trim();
    if (!key.startsWith('AIza')) {
      setError('유효하지 않은 API 키 형식입니다. (AIza로 시작해야 합니다)');
      return;
    }
    localStorage.setItem('gemini_api_key', key);
    onReady(key);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Checking API configuration...</p>
      </div>
    );
  }

  // If we are here, no key was found. Show selection options.
  const isAiStudio = !!(window.aistudio && window.aistudio.openSelectKey);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 text-center">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          나노바나나 프로 이미지체인저 UI
        </h1>
        <p className="text-gray-300 mb-6 leading-relaxed text-sm">
          Gemini 3 Pro 모델을 사용하기 위해 API 키가 필요합니다.<br/>
          키는 브라우저에만 저장되며 서버로 전송되지 않습니다.
        </p>
        
        {isAiStudio ? (
          <button
            onClick={handleSelectKeyAistudio}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg mb-4"
          >
            AI Studio Key 선택하기
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
             <div className="text-left">
                <label className="block text-xs text-gray-400 mb-1">Gemini API Key</label>
                <input 
                  type="password" 
                  value={inputKey}
                  onChange={(e) => {
                      setInputKey(e.target.value);
                      setError('');
                  }}
                  placeholder="AIza..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white"
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
             </div>
             <button
                type="submit"
                disabled={!inputKey}
                className={`w-full py-3 px-6 font-semibold rounded-lg transition-all shadow-lg ${inputKey ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
             >
                시작하기
             </button>
          </form>
        )}
        
        <div className="mt-6 text-xs text-gray-500 border-t border-gray-700 pt-4">
          API 키가 없으신가요?{' '}
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            여기서 무료로 발급받으세요
          </a>
        </div>
      </div>
    </div>
  );
};