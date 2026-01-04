import React from 'react';
import { AuditLogEntry } from '../types';
import { CheckCircle2, Activity, Filter, Calculator, BarChart3, Database } from 'lucide-react';

interface AuditLogProps {
  logs: AuditLogEntry[];
}

const getIconForAction = (action: string) => {
  switch (action) {
    case 'FILTER': return <Filter size={16} />;
    case 'CALCULATION': return <Calculator size={16} />;
    case 'VISUALIZATION': return <BarChart3 size={16} />;
    case 'AGGREGATION': return <Database size={16} />;
    default: return <Activity size={16} />;
  }
};

const AuditLog: React.FC<AuditLogProps> = ({ logs }) => {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
        <CheckCircle2 size={16} className="text-green-600" />
        <h3 className="text-sm font-semibold text-gray-700">Audit Log</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-4 py-2 w-12 text-center">Step</th>
              <th className="px-4 py-2 w-32">Action</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-gray-400">Technical Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log, index) => (
              <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs">{log.step}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {getIconForAction(log.action_type)}
                    {log.action_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{log.description}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-xs" title={log.technical_detail}>
                  {log.technical_detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLog;
