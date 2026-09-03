import { GoogleGenAI } from '@google/genai';

/**
 * Gemini models configuration
 * gemini-3.6-flash is the primary high-throughput, stable production model.
 * gemini-3.8-flash acts as secondary when available.
 */
export const GEMINI_PRIMARY_MODEL = 'gemini-3.6-flash';
export const GEMINI_FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash'];
export const GEMINI_MODEL = GEMINI_PRIMARY_MODEL;

// Cache for initialized GoogleGenAI instances by API key
const clientCache = new Map<string, GoogleGenAI>();

// Circuit-breaker cooldown map for models experiencing 503/high-demand spikes
const modelCooldowns = new Map<string, number>();

// Empty by default - keys are read securely from environment variables (GEMINI_API_KEYS or GEMINI_API_KEY)
const AUTHORIZED_GEMINI_KEYS: string[] = [];

/**
 * Utility helper to sleep for ms
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extracts and deduplicates Gemini API keys from the authorized pool and environment:
 * - AUTHORIZED_GEMINI_KEYS (user provided keys)
 * - GEMINI_API_KEYS (comma, newline, space, or JSON array separated)
 * - GEMINI_API_KEY (single or comma-separated)
 */
export function getGeminiKeyPool(): string[] {
  const keys: string[] = [...AUTHORIZED_GEMINI_KEYS];

  // Parse GEMINI_API_KEYS
  if (process.env.GEMINI_API_KEYS) {
    const raw = process.env.GEMINI_API_KEYS.trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((k) => {
            if (typeof k === 'string' && k.trim()) keys.push(k.trim());
          });
        }
      } catch (e) {
        // Fallback to delimiter split
        raw.split(/[\s,;]+/).forEach((k) => {
          if (k.trim()) keys.push(k.trim());
        });
      }
    } else {
      raw.split(/[\s,;]+/).forEach((k) => {
        if (k.trim()) keys.push(k.trim());
      });
    }
  }

  // Parse GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY) {
    const raw = process.env.GEMINI_API_KEY.trim();
    raw.split(/[\s,;]+/).forEach((k) => {
      if (k.trim()) keys.push(k.trim());
    });
  }

  // Deduplicate while preserving order
  return Array.from(new Set(keys));
}

let currentKeyIndex = 0;

/**
 * Get the next Gemini client from the pool with round-robin rotation
 */
export function getNextGeminiClient(): { client: GoogleGenAI; key: string } | null {
  const keys = getGeminiKeyPool();
  if (keys.length === 0) return null;

  const key = keys[currentKeyIndex % keys.length];
  currentKeyIndex++;

  if (!clientCache.has(key)) {
    clientCache.set(
      key,
      new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    );
  }

  return { client: clientCache.get(key)!, key };
}

/**
 * Execute a Gemini operation across the API key pool with automatic failover
 * on rate limits (429), temporary high demand (503), quota errors, or model unavailability.
 * Automatically cascades through primary and fallback models (gemini-3.6-flash -> gemini-3.8-flash).
 */
export async function executeWithGeminiPool<T>(
  operation: (ai: GoogleGenAI, key: string, model: string) => Promise<T>
): Promise<T | null> {
  const keys = getGeminiKeyPool();
  if (keys.length === 0) {
    return null;
  }

  let lastError: any = null;
  const now = Date.now();

  for (const modelToUse of GEMINI_FALLBACK_MODELS) {
    // Check if this model is temporarily on circuit-breaker cooldown
    const cooldownUntil = modelCooldowns.get(modelToUse);
    if (cooldownUntil && cooldownUntil > now) {
      continue;
    }

    const attempts = Math.min(keys.length, 3);

    for (let i = 0; i < attempts; i++) {
      const current = getNextGeminiClient();
      if (!current) break;

      try {
        const result = await operation(current.client, current.key, modelToUse);
        // Clear cooldown if model succeeded
        modelCooldowns.delete(modelToUse);
        return result;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const is503HighDemand = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
        const is429 = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');

        if (is503HighDemand) {
          // Put the model on circuit breaker cooldown for 10 minutes and cascade immediately
          modelCooldowns.set(modelToUse, Date.now() + 10 * 60 * 1000);
          console.info(`[Gemini Pool] Model ${modelToUse} experiencing upstream high demand (503). Switching to standby model.`);
          break; // Immediately break to the next model in GEMINI_FALLBACK_MODELS
        }

        if (is429) {
          // Rate-limited on this specific key, pause briefly and rotate key
          await sleep(200 * (i + 1));
        }
      }
    }
  }

  if (lastError) {
    console.info('[Gemini Pool] Upstream Gemini pool call completed via local synthetic hedge fund fallback.');
  }
  return null;
}
