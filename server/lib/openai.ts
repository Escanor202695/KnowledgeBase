// Using the javascript_openai blueprint
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 1536,
    });

    return response.data.map(item => item.embedding);
  } catch (error: any) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function chatCompletion(
  systemPrompt: string, 
  userMessage: string,
  options?: ChatCompletionOptions
): Promise<string> {
  try {
    const {
      temperature = 0.7,
      maxTokens = 8192,
      model = "gpt-3.5-turbo",
      conversationHistory = [],
    } = options || {};

    // Build messages array with system prompt, conversation history, and current user message
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    // Some models have restrictions on temperature and max_tokens
    // We'll try with the requested values first and adjust if needed
    const requestOptions: any = {
      model: model,
      messages: messages,
      max_completion_tokens: maxTokens,
      temperature: temperature,
    };

    try {
      const response = await openai.chat.completions.create(requestOptions);
      return response.choices[0].message.content || "I couldn't generate a response.";
    } catch (apiError: any) {
      // Handle temperature not supported error
      if (apiError?.error?.code === 'unsupported_value' && apiError?.error?.param === 'temperature') {
        console.log(`  ⚠️  Model ${model} doesn't support custom temperature, using default (1)`);
        requestOptions.temperature = 1;
        try {
          const response = await openai.chat.completions.create(requestOptions);
          return response.choices[0].message.content || "I couldn't generate a response.";
        } catch (retryError: any) {
          // If it fails again, check for max_tokens issue
          if (retryError?.error?.code === 'invalid_value' && retryError?.error?.param === 'max_tokens') {
            const modelMaxTokens = extractMaxTokensFromError(retryError) || getDefaultMaxTokens(model);
            console.log(`  ⚠️  Model ${model} supports max ${modelMaxTokens} tokens, adjusting from ${requestOptions.max_completion_tokens}`);
            requestOptions.max_completion_tokens = modelMaxTokens;
            const response = await openai.chat.completions.create(requestOptions);
            return response.choices[0].message.content || "I couldn't generate a response.";
          }
          throw retryError;
        }
      }
      
      // Handle max_tokens too large error
      if (apiError?.error?.code === 'invalid_value' && apiError?.error?.param === 'max_tokens') {
        const modelMaxTokens = extractMaxTokensFromError(apiError) || getDefaultMaxTokens(model);
        console.log(`  ⚠️  Model ${model} supports max ${modelMaxTokens} tokens, adjusting from ${requestOptions.max_completion_tokens}`);
        requestOptions.max_completion_tokens = modelMaxTokens;
        const response = await openai.chat.completions.create(requestOptions);
        return response.choices[0].message.content || "I couldn't generate a response.";
      }
      
      // If it's a different error, throw it
      throw apiError;
    }
  } catch (error: any) {
    console.error('Error in chat completion:', error);
    throw new Error(`Failed to generate chat response: ${error.message}`);
  }
}

/**
 * Extract max tokens limit from error message
 */
function extractMaxTokensFromError(error: any): number | null {
  const errorMessage = error?.error?.message || '';
  const maxMatch = errorMessage.match(/at most (\d+) completion tokens/);
  return maxMatch ? parseInt(maxMatch[1], 10) : null;
}

/**
 * Get default max tokens for a model based on known limits
 */
function getDefaultMaxTokens(model: string): number {
  // Model-specific max token limits
  const modelLimits: Record<string, number> = {
    'gpt-3.5-turbo': 4096,
    'gpt-4o-mini': 16384,
    'gpt-4': 8192,
    'gpt-4-turbo': 4096,
    'gpt-4.1': 16384,
    'gpt-4.1-mini': 16384,
    'gpt-4.1-nano': 4096,
    'gpt-4.5': 16384,
    'gpt-5': 16384,
  };
  
  return modelLimits[model] || 4096; // Default to 4096 if model not in list
}

export default openai;
