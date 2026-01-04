import { GoogleGenAI } from "@google/genai";
import { SchemaSummary } from '../types';

const MODEL_NAME = 'gemini-3-pro-preview'; // Using the pro model for complex reasoning and code capability

// We use a singleton pattern for the client
let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

const SYSTEM_INSTRUCTION = `
You are an Expert Data Analyst and Audit Logger running in a web browser environment.
Your goal is to write JavaScript code to answer the user's question about their dataset, while maintaining a strict audit log.

### DATA CONTEXT
You will receive the dataset schema (columns, types, samples).
The actual data is available in the execution environment as a variable named \`dataset\`.
\`dataset\` is an Array of Objects, where each object is a row.

### RULES:
1. **No Hallucinations:** Only use column names provided in the schema.
2. **Atomic Steps:** Break complex requests into logical steps.
3. **JavaScript Execution:** You must write valid, executable JavaScript code that processes the \`dataset\` array.
   - The code MUST end with a \`return\` statement.
   - If the result is a number or string, return it directly.
   - If the result is a table/list, return an Array of Objects.
   - If the user asks for a plot/chart, OR if the data represents a ranking, distribution, comparison, or trend that would be better visualized, you SHOULD return a configuration object containing the processed data:
     \`return { chartType: 'bar'|'line'|'scatter'|'pie', xKey: 'columnName', dataKeys: ['col1', 'col2'], data: processedArray, title: 'Chart Title' };\`
   - IMPORTANT: You MUST include the \`data\` property in the returned object. Do not rely on 'dataset' global.
   - Any calculated metrics (like percentages, totals) should be included as fields in the \`data\` objects so they appear in the results table, even if not used in the chart.
4. **Structured Output:** You must output your response in valid JSON format.

### OUTPUT SCHEMA:
{
  "thought_process": "Brief explanation of the logic before writing code.",
  "code": "The executable JavaScript code string. It must end with a return statement.",
  "audit_log": [
    {
      "step": 1,
      "action_type": "FILTER | IMPUTATION | CALCULATION | AGGREGATION | VISUALIZATION",
      "description": "Human-readable description.",
      "technical_detail": "e.g., 'Filtered dataset where Age > 20'"
    }
  ],
  "final_summary": "A natural language answer to the user, summarizing the findings."
}
`;

export const generateAnalysis = async (
  schema: SchemaSummary,
  query: string
): Promise<string> => {
  const ai = getAiClient();

  const schemaDescription = `
  Dataset Schema:
  Row Count: ${schema.rowCount}
  Columns:
  ${schema.fields.map(f => `- ${f.name} (${f.type}): Sample value "${f.sample}"`).join('\n')}
  `;

  const prompt = `
  ${schemaDescription}

  User Query: "${query}"
  
  Generate the analysis JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1, // Low temperature for deterministic code generation
      },
    });

    return response.text || "{}";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate analysis.");
  }
};