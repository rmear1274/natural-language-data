import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import { AppState, DataRow, SchemaSummary } from './types';
import { parseCSV } from './utils/csv';
import { Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [data, setData] = useState<DataRow[]>([]);
  const [schema, setSchema] = useState<SchemaSummary | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      // Simulate slight delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));
      const { data, schema } = await parseCSV(file);
      setData(data);
      setSchema(schema);
      setAppState(AppState.ANALYSIS);
    } catch (error) {
      alert("Failed to parse CSV: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setAppState(AppState.UPLOAD);
    setData([]);
    setSchema(null);
  };

  const handleLogin = (userId: string) => {
    setCurrentUser(userId);
    setAppState(AppState.UPLOAD);
  };

  if (appState === AppState.AUTH) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {appState === AppState.UPLOAD ? (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="absolute top-6 right-6 text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            Logged in as: <span className="font-semibold text-gray-700">{currentUser}</span>
          </div>

          <div className="text-center mb-10 max-w-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-6 shadow-lg">
              <Sparkles size={32} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Natural Language Data Analytics
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Upload your CSV dataset and start asking questions. 
              Our AI engine writes and executes code in real-time to provide insights, 
              charts, and a transparent audit trail.
            </p>
          </div>
          
          <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-4xl">
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Instant Ingestion</h3>
              <p className="text-sm text-gray-500">Drag & drop CSV files. Automatic schema detection and type inference.</p>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Transparent Logic</h3>
              <p className="text-sm text-gray-500">See the exact code and thought process behind every answer.</p>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Secure Sandbox</h3>
              <p className="text-sm text-gray-500">Code executes locally in your browser. Data never leaves your device except for schema analysis.</p>
            </div>
          </div>
        </div>
      ) : (
        <ChatInterface 
          schema={schema!} 
          data={data} 
          currentUser={currentUser}
          onBack={handleBack} 
        />
      )}
    </div>
  );
};

export default App;