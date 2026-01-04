import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Loader2, Sparkles, AlertTriangle, FileText, Table as TableIcon } from 'lucide-react';
import { SchemaSummary, DataRow, ChatMessage, AnalysisResponse } from '../types';
import { generateAnalysis } from '../services/gemini';
import { executeCode } from '../services/executor';
import AuditLog from './AuditLog';
import DataViz from './DataViz';
import ReactMarkdown from 'markdown-to-jsx';
import { generateHtmlReport, downloadFile } from '../utils/export';

interface ChatInterfaceProps {
  schema: SchemaSummary;
  data: DataRow[];
  currentUser: string;
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ schema, data, currentUser, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 1. Get Reasoning & Code from Gemini
      const jsonResponse = await generateAnalysis(schema, userMsg.content as string);
      
      // 2. Parse JSON
      let analysis: AnalysisResponse;
      try {
        // Clean markdown code blocks if Gemini wraps json in ```json ... ```
        const cleanJson = jsonResponse.replace(/```json\n?|\n?```/g, '').trim();
        analysis = JSON.parse(cleanJson);
      } catch (e) {
        console.error("JSON Parse Error", e);
        throw new Error("Failed to parse reasoning engine output.");
      }

      // 3. Execute Code in Sandbox
      let executionResult;
      let vizData = null;
      let vizConfig = null;
      let tableData = null;

      try {
        executionResult = executeCode(analysis.code, data);
        
        if (executionResult) {
          const isObj = typeof executionResult === 'object' && executionResult !== null;
          const isArray = Array.isArray(executionResult);

          // Case A: Chart Configuration
          if (isObj && !isArray && (executionResult.chartType || executionResult.type)) {
             // Normalize 'type' to 'chartType' to handle potential inconsistencies from LLM
             const isChart = executionResult.chartType || executionResult.type;
             
             if (isChart) {
               vizData = executionResult.data; // The code MUST attach data to the config object
               vizConfig = {
                 ...executionResult,
                 chartType: executionResult.chartType || executionResult.type,
               };
               
               // If data is missing but we have a chart config, this is an error
               if (!vizData || !Array.isArray(vizData)) {
                 console.warn("Chart configuration detected but data is missing or invalid.");
               } else {
                 // CRITICAL FIX: If we have valid chart data, ALSO show it as a table.
                 // This ensures metrics like "Percentage" (which might not be plotted) are visible.
                 tableData = vizData;
               }
             }
          } 
          // Case B: Tabular Data (Direct Array of Objects)
          else if (isArray && executionResult.length > 0) {
             tableData = executionResult;
          }
          // Case C: Composite Object (Dictionary containing arrays or scalars)
          // e.g. { top_3: [...], total: 100 }
          else if (isObj && !isArray) {
             // 1. Search for the most significant array to display as a table
             const entries = Object.entries(executionResult);
             const arrayCandidate = entries.find(([_, val]) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object');
             
             if (arrayCandidate) {
               tableData = arrayCandidate[1];
             } else {
               // 2. If no array found, check if it's a flat object of scalars (Single Row Summary)
               const isFlat = entries.every(([_, val]) => typeof val !== 'object' || val === null);
               if (isFlat && entries.length > 0) {
                 tableData = [executionResult];
               }
             }
          }
        }
      } catch (execError) {
        console.error("Execution Error", execError);
        executionResult = `Error executing code: ${(execError as Error).message}`;
        analysis.final_summary += `\n\n**Note:** I encountered an error while calculating the exact numbers: ${(execError as Error).message}`;
      }

      // 4. Augment response with execution result
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: {
          ...analysis,
          chart_config: vizConfig ? vizConfig : undefined,
          table_data: tableData ? tableData : undefined,
        },
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try again or rephrase your question.",
        timestamp: Date.now(),
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (analysis: AnalysisResponse, queryMsg: ChatMessage) => {
    // Generate HTML report instead of Markdown
    const report = generateHtmlReport(queryMsg.content as string, analysis, currentUser);
    downloadFile(report, `analysis_report_${Date.now()}.html`, 'text/html');
  };

  const renderDataTable = (data: any[]) => {
    if (!data || data.length === 0) return null;
    const headers = Object.keys(data[0]);
    
    // Limit display rows to avoid freezing the UI on massive datasets
    const displayData = data.slice(0, 100);
    const hasMore = data.length > 100;

    return (
      <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableIcon size={16} className="text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">Result Data</h3>
          </div>
          <span className="text-xs text-gray-500">
            {data.length} row{data.length !== 1 ? 's' : ''} {hasMore ? '(showing first 100)' : ''}
          </span>
        </div>
        <div className="overflow-x-auto max-h-[300px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {headers.map(header => (
                  <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayData.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {headers.map(header => (
                    <td key={`${i}-${header}`} className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                      {row[header]?.toString() || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
           <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center italic">
             ... {data.length - 100} more rows (full data included in export) ...
           </div>
        )}
      </div>
    );
  };

  const renderMessageContent = (msg: ChatMessage, index: number) => {
    if (typeof msg.content === 'string') {
      return <div className="prose text-gray-800"><ReactMarkdown>{msg.content}</ReactMarkdown></div>;
    }

    const response = msg.content as AnalysisResponse;

    return (
      <div className="space-y-4">
        {/* Thought Process */}
        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
          <span className="font-semibold block mb-1 flex items-center gap-2">
            <Sparkles size={14} /> Reasoning
          </span>
          {response.thought_process}
        </div>

        {/* Code Block */}
        <div className="relative group">
          <div className="absolute -top-3 left-3 bg-gray-800 text-gray-200 text-xs px-2 py-0.5 rounded">JavaScript</div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto font-mono mt-2">
            <code>{response.code}</code>
          </pre>
        </div>

        {/* Final Summary */}
        <div className="prose text-gray-800">
          <ReactMarkdown>{response.final_summary}</ReactMarkdown>
        </div>

        {/* Visualizations */}
        {response.chart_config && (
           (!response.chart_config.data || response.chart_config.data.length === 0) ? (
             <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm flex items-center gap-2">
               <AlertTriangle size={16} />
               Chart configuration generated, but no data points were available to plot. Check if the column names match exactly.
             </div>
           ) : (
             <DataViz data={response.chart_config.data} config={response.chart_config} />
           )
        )}

        {/* Tabular Data Result (Always show if available, even if chart exists) */}
        {response.table_data && renderDataTable(response.table_data)}

        {/* Audit Log */}
        <AuditLog logs={response.audit_log} />

        {/* Action Footer */}
        <div className="pt-2 flex justify-end border-t border-gray-100 mt-4">
          <button 
            onClick={() => {
              // Find the corresponding user message
              const userQuery = messages[index - 1];
              if (userQuery) {
                handleExportReport(response, userQuery);
              }
            }}
            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-purple-600 transition-colors px-2 py-1 rounded hover:bg-purple-50"
          >
            <FileText size={14} />
            Download Full Report
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="text-purple-600" />
            Data Analytics Suite
          </h1>
          <p className="text-sm text-gray-500 mt-1">
             {data.length} rows &bull; {schema.fields.length} columns &bull; Gemini 2.5 Flash
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             {currentUser}
          </div>
          <button 
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            Upload New File
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          {/* Welcome Message */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-purple-600" />
            </div>
            <div className="flex-1 bg-white p-6 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
               <h3 className="font-semibold text-gray-800 mb-2">Dataset Ready</h3>
               <p className="text-gray-600 mb-4">
                 I've analyzed your CSV. Here is a summary of the schema:
               </p>
               <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm font-mono overflow-x-auto">
                 {schema.fields.map(f => (
                   <div key={f.name} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                     <span className="font-semibold text-gray-700">{f.name}</span>
                     <span className="text-gray-500">{f.type}</span>
                   </div>
                 ))}
               </div>
               <p className="text-gray-600 mt-4">
                 Ask me anything about this data! I can filter, aggregate, calculate statistics, or create visualizations.
               </p>
            </div>
          </div>

          {/* Message List */}
          {messages.map((msg, index) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
                ${msg.role === 'user' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                {msg.role === 'user' ? (
                  <span className="text-blue-700 font-bold text-xs">U</span>
                ) : (
                  <Sparkles size={16} className="text-purple-600" />
                )}
              </div>
              
              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                <div className={`p-6 rounded-2xl shadow-sm border 
                  ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none border-blue-700' 
                    : 'bg-white text-gray-800 rounded-tl-none border-gray-100'}`}>
                   {renderMessageContent(msg, index)}
                   
                   {msg.error && (
                     <div className="mt-2 flex items-center gap-2 text-red-200 text-sm">
                       <AlertTriangle size={14} />
                       <span>Analysis failed</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
             <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-purple-600" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-3">
                 <Loader2 className="animate-spin text-purple-600" size={20} />
                 <span className="text-gray-500 text-sm">Analyzing data and writing code...</span>
              </div>
             </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="relative flex items-center max-w-4xl mx-auto">
            <div className="absolute left-4 text-gray-400">
              <Terminal size={20} />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question (e.g., 'Show average salary by department' or 'Plot age distribution')"
              className="w-full pl-12 pr-14 py-4 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 placeholder-gray-400 transition-all shadow-sm"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-3 p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="text-center mt-3">
             <span className="text-xs text-gray-400">Powered by Gemini 2.5 Flash &bull; Data is processed locally in your browser</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatInterface;