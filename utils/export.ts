import { AnalysisResponse } from '../types';

export const generateHtmlReport = (query: string, analysis: AnalysisResponse): string => {
  const date = new Date().toLocaleString();
  
  const auditRows = analysis.audit_log.map(log => 
    `<tr class="border-b hover:bg-gray-50">
      <td class="p-3 text-center text-gray-500 font-mono text-xs">${log.step}</td>
      <td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">${log.action_type}</span></td>
      <td class="p-3 text-gray-700">${log.description}</td>
      <td class="p-3 text-gray-500 font-mono text-xs break-all">${log.technical_detail}</td>
    </tr>`
  ).join('');

  let dataSection = '';
  if (analysis.table_data && analysis.table_data.length > 0) {
      const headers = Object.keys(analysis.table_data[0]);
      const headerRow = headers.map(h => `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">${h}</th>`).join('');
      const rows = analysis.table_data.map(row => 
          `<tr class="border-b hover:bg-gray-50">
             ${headers.map(h => `<td class="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">${row[h] !== null && row[h] !== undefined ? row[h] : ''}</td>`).join('')}
           </tr>`
      ).join('');

      dataSection = `
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg class="text-indigo-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          Results Data
        </h2>
        <div class="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50"><tr>${headerRow}</tr></thead>
            <tbody class="bg-white divide-y divide-gray-200">${rows}</tbody>
          </table>
        </div>
      </section>
      `;
  }

  let chartSection = '';
  let chartScript = '';

  if (analysis.chart_config && analysis.chart_config.data && analysis.chart_config.data.length > 0) {
    const chartDataJson = JSON.stringify(analysis.chart_config.data);
    const chartConfigJson = JSON.stringify(analysis.chart_config);

    chartSection = `
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg class="text-pink-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          Visualization
        </h2>
        <div class="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
          <div id="chart" class="w-full h-[400px]"></div>
        </div>
      </section>
    `;

    chartScript = `
      <script>
        (function() {
          try {
            const rawData = ${chartDataJson};
            const config = ${chartConfigJson};

            let options = {
              chart: {
                height: 400,
                type: config.chartType,
                fontFamily: 'Inter, sans-serif',
                toolbar: { show: true },
                animations: { enabled: true }
              },
              title: {
                text: config.title || undefined,
                align: 'left',
                style: { color: '#374151', fontWeight: 600 }
              },
              colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'],
              stroke: { curve: 'smooth', width: 2 },
              dataLabels: { enabled: false },
              series: [],
              xaxis: { labels: { style: { fontSize: '11px' } } },
              yaxis: { labels: { style: { fontSize: '11px' } } },
              grid: { borderColor: '#f3f4f6' },
              tooltip: { theme: 'light', style: { fontSize: '12px' } }
            };

            if (config.chartType === 'pie') {
              options.labels = rawData.map(d => d[config.xKey]);
              options.series = rawData.map(d => Number(d[config.dataKeys[0]]));
              options.chart.type = 'pie';
            } else if (config.chartType === 'scatter') {
              options.chart.type = 'scatter';
              options.series = config.dataKeys.map(key => ({
                  name: key,
                  data: rawData.map(d => [d[config.xKey], d[key]])
              }));
              options.xaxis = { type: 'numeric', title: { text: config.xKey } };
            } else {
              // Bar or Line
              options.chart.type = config.chartType === 'line' ? 'line' : 'bar';
              options.xaxis.categories = rawData.map(d => {
                  const val = d[config.xKey];
                  return (typeof val === 'string' && val.length > 15) ? val.substring(0, 15) + '...' : val;
              });
              options.xaxis.title = { text: config.xKey };
              options.series = config.dataKeys.map(key => ({
                name: key,
                data: rawData.map(d => d[key])
              }));
            }

            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
          } catch(e) {
            console.error("Chart rendering failed", e);
            document.querySelector("#chart").innerHTML = "<div class='text-red-500 p-4'>Error rendering chart</div>";
          }
        })();
      </script>
    `;
  }

  // specialized function to simple markdown to HTML conversion for the summary
  const formatSummary = (text: string) => {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm text-pink-600 font-mono">$1</code>');
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analysis Report - ${date}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    pre { background: #111827; color: #f3f4f6; padding: 1.5rem; border-radius: 0.75rem; overflow-x: auto; font-family: monospace; }
  </style>
</head>
<body class="bg-gray-100 p-8 min-h-screen">
  <div class="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
    
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 p-8">
      <div class="flex items-center gap-3 mb-2">
        <div class="p-2 bg-purple-100 rounded-lg text-purple-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Data Analysis Report</h1>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-500">
        <div>
          <span class="block font-medium text-gray-700">Generated</span>
          ${date}
        </div>
        <div>
          <span class="block font-medium text-gray-700">Query</span>
          "${query}"
        </div>
      </div>
    </div>
    
    <div class="p-8 space-y-10">
      
      <!-- Executive Summary -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg class="text-blue-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          Executive Summary
        </h2>
        <div class="prose max-w-none text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-xl border border-gray-100">
          ${formatSummary(analysis.final_summary)}
        </div>
      </section>

      <!-- Chart Section -->
      ${chartSection}

      <!-- Data Table if present -->
      ${dataSection}

      <!-- Thought Process -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg class="text-purple-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          Reasoning Engine
        </h2>
        <div class="bg-blue-50/50 border border-blue-100 rounded-xl p-6 text-blue-900 text-sm leading-relaxed">
          ${analysis.thought_process}
        </div>
      </section>

      <!-- Code -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg class="text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          Executed Code
        </h2>
        <div class="relative">
          <span class="absolute top-0 right-0 px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-bl-lg rounded-tr-lg">JavaScript</span>
          <code><pre>${analysis.code}</pre></code>
        </div>
      </section>

      <!-- Audit Log -->
      <section>
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg class="text-green-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Audit Log
        </h2>
        <div class="overflow-hidden border border-gray-200 rounded-xl">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th class="p-3 w-16 text-center">Step</th>
                <th class="p-3 w-32">Action</th>
                <th class="p-3">Description</th>
                <th class="p-3">Technical Detail</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              ${auditRows}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    
    <div class="bg-gray-50 p-6 text-center text-xs text-gray-400 border-t border-gray-200">
      Generated by Natural Language Data Analytics Suite • Powered by Gemini 2.5 Flash
    </div>
  </div>
  ${chartScript}
</body>
</html>`;
};

export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};