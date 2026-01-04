import React, { useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';

interface DataVizProps {
  data: any[];
  config: {
    chartType: string;
    xKey: string;
    dataKeys: string[];
    title?: string;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const truncateLabel = (value: any) => {
  if (typeof value === 'string' && value.length > 15) {
    return `${value.substring(0, 15)}...`;
  }
  return value;
};

const DataViz: React.FC<DataVizProps> = ({ data, config }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!data || !config || data.length === 0) return null;

  const handleDownload = async () => {
    if (ref.current) {
      setDownloading(true);
      try {
        const dataUrl = await toPng(ref.current, { backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `${config.title || 'chart'}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to download chart image', err);
      } finally {
        setDownloading(false);
      }
    }
  };

  // Common margins to prevent label clipping, especially with rotation
  const commonMargin = { top: 20, right: 30, left: 20, bottom: 60 };

  const renderChart = () => {
    switch (config.chartType?.toLowerCase()) {
      case 'line':
        return (
          <LineChart data={data} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey={config.xKey} 
              tick={{fontSize: 11}} 
              tickLine={false} 
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
              interval="preserveStartEnd"
              tickFormatter={truncateLabel}
            />
            <YAxis tick={{fontSize: 11}} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="top" height={36}/>
            {config.dataKeys.map((key, index) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={COLORS[index % COLORS.length]} 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        );
      case 'scatter':
        return (
          <ScatterChart margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              type="number" 
              dataKey={config.xKey} 
              name={config.xKey} 
              tick={{fontSize: 11}} 
              tickLine={false} 
              axisLine={false}
            />
            <YAxis 
              type="number" 
              dataKey={config.dataKeys[0]} 
              name={config.dataKeys[0]} 
              tick={{fontSize: 11}} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend verticalAlign="top" height={36}/>
            <Scatter name={config.title || 'Data'} data={data} fill={COLORS[0]} />
          </ScatterChart>
        );
      case 'pie':
        return (
          <PieChart margin={{ top: 20, bottom: 20 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              // Improved label with truncation to prevent overlap issues
              label={({ name, percent }) => `${truncateLabel(name)} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={100}
              fill="#8884d8"
              dataKey={config.dataKeys[0]}
              nameKey={config.xKey}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={data} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey={config.xKey} 
              tick={{fontSize: 11}} 
              tickLine={false} 
              axisLine={false} 
              angle={-45}
              textAnchor="end"
              height={60}
              interval="preserveStartEnd"
              tickFormatter={truncateLabel}
            />
            <YAxis tick={{fontSize: 11}} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend verticalAlign="top" height={36}/>
            {config.dataKeys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={COLORS[index % COLORS.length]} 
                radius={[4, 4, 0, 0]} 
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="relative group">
      <div ref={ref} className="w-full h-[450px] mt-6 mb-2 p-4 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col">
        {config.title && (
          <h4 className="text-center text-sm font-semibold text-gray-600 mb-2 flex-shrink-0">{config.title}</h4>
        )}
        <div className="flex-1 w-full min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Download Button Overlay */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-lg border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Download Chart as PNG"
      >
        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </button>
    </div>
  );
};

export default DataViz;