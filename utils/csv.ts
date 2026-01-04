import { DataRow, SchemaField, SchemaSummary } from '../types';

export const parseCSV = async (file: File): Promise<{ data: DataRow[], schema: SchemaSummary }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
          throw new Error("File is empty");
        }

        // Robust CSV line parser that handles quoted fields with commas
        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              // Handle escaped quotes ("") inside quotes if needed, 
              // but for now simple toggle is better than naive split
              if (inQuotes && line[i + 1] === '"') {
                 current += '"';
                 i++; // skip next quote
              } else {
                 inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result.map(val => val.replace(/^"|"$/g, ''));
        };

        const headers = parseLine(lines[0]);
        
        const data: DataRow[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const currentLine = parseLine(lines[i]);
          
          // Allow for slight mismatch if trailing comma is missing
          if (currentLine.length === headers.length || (currentLine.length === headers.length + 1 && currentLine[headers.length] === '')) {
            const row: DataRow = {};
            headers.forEach((header, index) => {
              const val = currentLine[index];
              if (val !== undefined) {
                 // Try to parse numbers
                 const numVal = Number(val);
                 // Check if it's a valid number and not an empty string (which Number converts to 0)
                 row[header] = !isNaN(numVal) && val !== '' ? numVal : val;
              } else {
                 row[header] = null;
              }
            });
            data.push(row);
          }
        }

        // Generate Schema
        const fields: SchemaField[] = headers.map(header => {
          // Check first few non-null rows for type inference
          const sampleRow = data.find(d => d[header] !== null && d[header] !== '');
          const sampleValue = sampleRow ? sampleRow[header] : null;
          return {
            name: header,
            type: typeof sampleValue,
            sample: sampleValue
          };
        });

        resolve({
          data,
          schema: {
            fields,
            rowCount: data.length,
            preview: data.slice(0, 3)
          }
        });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};