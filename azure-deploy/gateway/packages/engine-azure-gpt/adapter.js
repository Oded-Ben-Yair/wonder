import { llmMatch } from './src/lib/llm.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from this engine's .env
dotenv.config({ path: join(__dirname, '.env') });

export async function match(query, allNurses, options = {}) {
  try {
    const result = await llmMatch(query, allNurses);
    return result;
  } catch (error) {
    console.error('[engine-azure-gpt5] Match error:', error.message);
    throw error;
  }
}

export async function health() {
  const hasKey = !!process.env.AZURE_OPENAI_KEY;
  const hasUri = !!(process.env.AZURE_OPENAI_URI || 
    (process.env.AZURE_OPENAI_RESOURCE_HOST && process.env.AZURE_OPENAI_DEPLOYMENT));
  
  return { 
    ok: hasKey && hasUri, 
    engine: "engine-azure-gpt5",
    configured: hasKey && hasUri,
    message: (!hasKey || !hasUri) ? "Missing Azure OpenAI credentials" : "Ready"
  };
}

export const ENGINE_NAME = "engine-azure-gpt5";