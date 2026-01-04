export interface DataRow {
  [key: string]: string | number | boolean | null;
}

export interface SchemaField {
  name: string;
  type: string;
  sample: string | number | boolean | null;
}

export interface SchemaSummary {
  fields: SchemaField[];
  rowCount: number;
  preview: DataRow[];
}

export interface AuditLogEntry {
  step: number;
  action_type: 'FILTER' | 'IMPUTATION' | 'CALCULATION' | 'AGGREGATION' | 'VISUALIZATION' | 'ANALYSIS';
  description: string;
  technical_detail: string;
}

export interface AnalysisResponse {
  thought_process: string;
  code: string;
  audit_log: AuditLogEntry[];
  final_summary: string;
  chart_config?: {
    chartType: 'bar' | 'line' | 'pie' | 'scatter';
    xKey: string;
    dataKeys: string[];
    title?: string;
    data?: any[];
  };
  table_data?: any[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | AnalysisResponse;
  timestamp: number;
  error?: boolean;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYSIS = 'ANALYSIS',
}