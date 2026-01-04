import { DataRow } from '../types';

/**
 * Executes the generated JavaScript code against the dataset.
 * WARNING: This uses new Function() which is akin to eval(). 
 * Since this is a client-side app analyzing user's own local data, 
 * the security risk is contained to the user's browser session.
 */
export const executeCode = (code: string, dataset: DataRow[]): any => {
  try {
    // Create a safe-ish context function
    // We pass 'dataset' as an argument available to the code
    const executor = new Function('dataset', `
      try {
        ${code}
      } catch (e) {
        throw e;
      }
    `);

    // Execute and return the result
    return executor(dataset);
  } catch (error) {
    console.error("Execution Error:", error);
    throw new Error(`Code execution failed: ${(error as Error).message}`);
  }
};
