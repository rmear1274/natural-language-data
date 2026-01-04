import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (userId: string) => void;
}

// ------------------------------------------------------------------
// CONFIGURATION: Define your valid access codes and associated User IDs here.
// For better security, ensure codes are long and complex.
// ------------------------------------------------------------------
const USER_DATABASE: Record<string, string> = {
  // "Access Code" : "Display Name / ID"
  "Tara!972nl": "Robert Mear",
  "Guest778!27!4": "Guest",
 
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if the entered code exists in our database
    const identifiedUser = USER_DATABASE[code];

    if (identifiedUser) {
      onLogin(identifiedUser);
    } else {
      setError(true);
      setCode('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm text-white mb-4 shadow-inner">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Restricted Access</h2>
          <p className="text-blue-100 mt-2 text-sm">
            Natural Language Data Analytics Suite
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="access-code" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Personal Access Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <ShieldCheck size={18} />
                </div>
                <input
                  id="access-code"
                  type="password"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError(false);
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
                    ${error 
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50' 
                      : 'border-gray-300 focus:ring-purple-200 focus:border-purple-500 bg-gray-50 focus:bg-white'
                    }`}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-xs animate-pulse">
                  <AlertCircle size={12} />
                  <span>Invalid or unauthorized access code.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 hover:bg-black text-white rounded-xl font-medium transition-colors shadow-lg shadow-gray-200"
            >
              <span>Authenticate Session</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              This system monitors all analytical queries. <br />
              Your User ID will be stamped on all generated reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;