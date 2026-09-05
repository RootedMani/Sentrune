import { executeWithGeminiPool, getGeminiKeyPool } from './gemini_pool.js';
import { cleanRssContent } from './sanitizer.js';

export interface AiSummaryResult {
  summary: string;
  hook: string;
  summary_fa: string;
  hook_fa: string;
  key_takeaways?: string[];
  key_takeaways_fa?: string[];
  source_provider: 'gemini' | 'heuristic';
}

// In-memory cache keyed by headline
const aiSummaryCache = new Map<string, AiSummaryResult>();

/**
 * Heuristic fallback generator when Gemini API is unavailable or quota is exceeded.
 * Analyzes market keywords, price levels, Fed/macro signals, and catalysts to craft
 * an engaging 2-line summary and a curiosity-driven hook.
 */
export function generateHeuristicHookAndSummary(
  headline: string,
  body?: string,
  symbol?: string
): AiSummaryResult {
  const cleanH = cleanRssContent(headline);
  const cleanB = cleanRssContent(body || '');
  const combined = `${cleanH} ${cleanB}`;

  // Extract key figures or patterns
  const priceMatch = combined.match(/\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%/);
  const priceSnippet = priceMatch ? priceMatch[0] : '';
  const hasFed = /fed|federal reserve|interest rate|inflation|cpi|powell/i.test(combined);
  const hasEarnings = /earnings|revenue|quarterly|profit|margin|guidance/i.test(combined);
  const hasCrypto = /crypto|bitcoin|btc|ethereum|eth|presale|layer-2|on-chain|token/i.test(combined);
  const hasBreakout = /surges|rallies|breakout|ath|all-time high|skyrockets/i.test(combined);
  const hasDrop = /plummets|drops|slips|falls|crash|bearish|selloff/i.test(combined);

  let summary = '';
  let hook = '';
  let summary_fa = '';
  let hook_fa = '';

  if (hasFed && hasCrypto) {
    summary = `Market dynamics face heightened sensitivity as Ethereum and major digital assets navigate ${priceSnippet ? `the ${priceSnippet} threshold` : 'key technical pivots'} amid macro Federal Reserve monetary policy scrutiny. Traders are actively weighing shifting liquidity flows against upcoming protocol catalysts.`;
    hook = `⚡ Key Catalyst: Can the current support zone hold against Fed pressure, or are whales gearing up for a deeper liquidity sweep? Read the full story inside.`;
    summary_fa = `پویایی بازار در شرایطی حساس قرار گرفته است؛ جایی که اتریوم و دارایی‌های دیجیتال در آستانه تصمیمات سیاست پولی فدرال رزرو، سطوح کلیدی قیمتی را آزمایش می‌کنند و معامله‌گران در حال سنجش جریان نقدینگی نهادی هستند.`;
    hook_fa = `⚡ کاتالیزور کلیدی: آیا سطح حمایتی فعلی در برابر فشارهای فدرال رزرو مقاومت می‌کند یا نهنگ‌ها در تدارک نوسان بزرگ‌تری هستند؟ ادامه گزارش را بخوانید.`;
  } else if (hasEarnings) {
    summary = `Financial reports and corporate metrics reveal pivotal shifts in capital allocation, revenue velocity, and forward margins. Institutional investors are dissecting operational cash flows to gauge sustained valuation upside.`;
    hook = `📈 Critical Takeaway: The reported numbers only reveal half the narrative—discover the hidden margin drivers reshaping analyst price targets. Click to read.`;
    summary_fa = `گزارش‌های مالی و معیارهای عملیاتی حاکی از تغییرات اساسی در جریان درآمدی و حاشیه سود شرکت است و سرمایه‌گذاران نهادی با دقت جزئیات گزارش را ارزیابی می‌کنند.`;
    hook_fa = `📈 نکته کلیدی: ارقام رسمی تنها بخشی از داستان را بیان می‌کنند؛ محرک‌های پنهان سودآوری را که چشم‌انداز تحلیلگران را تغییر داده بخوانید.`;
  } else if (hasBreakout) {
    summary = `Accelerating trading momentum and aggressive buyer accumulation have triggered a significant technical expansion ${priceSnippet ? `towards ${priceSnippet}` : 'into higher liquidity bands'}. Derivatives open interest and spot volumes signal expanding conviction.`;
    hook = `🚀 Momentum Alert: Breakout signals have flashed across key timeframes—find out whether the rally has institutional legs or risks a bull trap.`;
    summary_fa = `شتاب فزاینده معاملات و انباشت تهاجمی خریداران منجر به حرکت صعودی پرقدرت و جهش قیمت شده است؛ در حالی که سود باز قراردادهای مشتقه نشان‌دهنده ورود سرمایه سنگین است.`;
    hook_fa = `🚀 هشدار مومنتوم: آیا این شکست صعودی توسط نهادهای بزرگ حمایت می‌شود یا با تله گاوی مواجهیم؟ تحلیل کامل را بخوانید.`;
  } else if (hasDrop) {
    summary = `Heightened selling pressure and liquidity contraction have pushed valuations toward critical defense lines. Market participants are monitoring order book depth for early signs of stabilization or capitulation.`;
    hook = `⚠️ Risk Watch: Critical support boundaries are under immediate test—uncover the key price floor where smart money is positioning bids.`;
    summary_fa = `فشار فروش و افت نقدینگی موجب عقب‌نشینی قیمت به سمت سطوح حمایتی حساس شده و توجه فعالان بازار به رفتار خریداران در کف‌های قیمتی معطوف است.`;
    hook_fa = `⚠️ ارزیابی ریسک: سطوح حمایتی سرنوشت‌ساز در حال آزمایش هستند؛ ببینید پول هوشمند در چه قیمت‌هایی در حال ثبت سفارش است.`;
  } else {
    const assetRef = symbol || 'the underlying asset';
    summary = `Latest industry intelligence delivers high-impact context regarding strategic developments and macro sentiment for ${assetRef}. Cross-market positioning indicates growing trader focus on immediate technical milestones.`;
    hook = `🔍 Inside Look: Why this breaking development could reshape short-term market momentum—read the complete breakdown now.`;
    summary_fa = `جدیدترین اطلاعات و تحلیل‌های بازار دیدگاهی جامع درباره تحولات استراتژیک و احساسات عمومی معامله‌گران ارائه می‌دهد و مسیر پیش‌روی دارایی را شفاف می‌سازد.`;
    hook_fa = `🔍 نگاهی دقیق: چرا این رویداد تازه می‌تواند جهت حرکت کوتاه‌مدت قیمت را دستخوش تغییر کند؟ متن کامل گزارش را بخوانید.`;
  }

  return {
    summary,
    hook,
    summary_fa,
    hook_fa,
    key_takeaways: [
      `Key inflection zone monitored by institutional market participants`,
      `Macro policy decisions and liquidity dynamics dictating short-term range`,
      `Immediate trading catalyst poised to influence order flow and volatility`,
    ],
    key_takeaways_fa: [
      `سطح کلیدی قیمت زیر ذره‌بین معامله‌گران و نهادهای مالی`,
      `تاثیر مستقیم تصمیمات کلان اقتصادی بر دامنه نوسان قیمت`,
      `رویداد پیش‌رو آماده تغییر در حجم معاملات و نوسانات بازار`,
    ],
    source_provider: 'heuristic',
  };
}

/**
 * Uses Gemini (gemini-3.8-flash) to generate a high-converting hook and a 2-line analytical summary
 * for an article, along with fluent Persian translations.
 */
export async function generateAiSummaryAndHook(item: {
  id?: number;
  headline: string;
  body?: string;
  source_name?: string;
  symbol?: string;
  url?: string;
}): Promise<AiSummaryResult> {
  const cacheKey = item.headline.trim();
  if (aiSummaryCache.has(cacheKey)) {
    return aiSummaryCache.get(cacheKey)!;
  }

  // If no Gemini keys are configured, return the smart heuristic
  if (getGeminiKeyPool().length === 0) {
    const result = generateHeuristicHookAndSummary(item.headline, item.body, item.symbol);
    aiSummaryCache.set(cacheKey, result);
    return result;
  }

  try {
    const geminiResult = await executeWithGeminiPool(async (ai, _key, model) => {
      const prompt = `You are an elite financial journalist and market strategist for a premier institutional trading terminal.
Analyze the following article and generate:
1. "summary": Exactly 2 clear, punchy, analytical lines (max 40 words total) explaining what happened, the financial/crypto context, and why it matters. Avoid generic filler words or repetitive boilerplate.
2. "hook": An irresistible, curiosity-inducing hook (1 sentence, max 25 words) that makes an investor or trader urgently want to click and read the full article. Start with an emoji or compelling phrase (e.g., "⚡ Critical Pivot:", "📈 Whales on the Move:", "⚠️ Liquidity Alert:").
3. "summary_fa": A natural, fluent Persian (فارسی) translation of the 2-line summary using authentic financial/crypto terminology.
4. "hook_fa": A compelling Persian (فارسی) translation of the hook that preserves curiosity and urgency.
5. "key_takeaways": An array of 2-3 concise bullet points (English).
6. "key_takeaways_fa": An array of 2-3 concise bullet points in Persian (فارسی).

Article Data:
Headline: ${item.headline}
Source: ${item.source_name || 'Market Wire'}
Asset/Symbol: ${item.symbol || 'General Market'}
Content/Summary: ${item.body || ''}

Respond with strictly valid JSON only:
{
  "summary": "...",
  "hook": "...",
  "summary_fa": "...",
  "hook_fa": "...",
  "key_takeaways": ["...", "..."],
  "key_takeaways_fa": ["...", "..."]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && parsed.summary && parsed.hook) {
        const res: AiSummaryResult = {
          summary: parsed.summary,
          hook: parsed.hook,
          summary_fa: parsed.summary_fa || '',
          hook_fa: parsed.hook_fa || '',
          key_takeaways: Array.isArray(parsed.key_takeaways) ? parsed.key_takeaways : [],
          key_takeaways_fa: Array.isArray(parsed.key_takeaways_fa) ? parsed.key_takeaways_fa : [],
          source_provider: 'gemini',
        };
        return res;
      }
      return null;
    });

    if (geminiResult) {
      aiSummaryCache.set(cacheKey, geminiResult);
      return geminiResult;
    }
  } catch (err) {
    console.warn('Gemini AI summary generation error, using smart fallback:', err);
  }

  // Fallback if Gemini failed
  const fallback = generateHeuristicHookAndSummary(item.headline, item.body, item.symbol);
  aiSummaryCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Batch enrich news items with AI summaries and hooks
 */
export async function batchEnrichNewsWithAi(
  items: {
    id: number;
    headline: string;
    body?: string;
    source_name?: string;
    summary_ai?: string;
    hook_ai?: string;
    summary_ai_fa?: string;
    hook_ai_fa?: string;
    key_takeaways?: string[];
    key_takeaways_fa?: string[];
  }[],
  assetSymbol?: string
): Promise<void> {
  const needsAi = items.filter((it) => !it.summary_ai || !it.hook_ai);
  if (needsAi.length === 0) return;

  // Process first 6 items with full Gemini intelligence, fallback gracefully for the rest
  const priority = needsAi.slice(0, 6);
  await Promise.all(
    priority.map(async (item) => {
      try {
        const aiData = await generateAiSummaryAndHook({
          id: item.id,
          headline: item.headline,
          body: item.body,
          source_name: item.source_name,
          symbol: assetSymbol,
        });

        item.summary_ai = aiData.summary;
        item.hook_ai = aiData.hook;
        item.summary_ai_fa = aiData.summary_fa;
        item.hook_ai_fa = aiData.hook_fa;
        item.key_takeaways = aiData.key_takeaways;
        item.key_takeaways_fa = aiData.key_takeaways_fa;
      } catch (err) {
        const fb = generateHeuristicHookAndSummary(item.headline, item.body, assetSymbol);
        item.summary_ai = fb.summary;
        item.hook_ai = fb.hook;
        item.summary_ai_fa = fb.summary_fa;
        item.hook_ai_fa = fb.hook_fa;
        item.key_takeaways = fb.key_takeaways;
        item.key_takeaways_fa = fb.key_takeaways_fa;
      }
    })
  );

  // Fill remaining items with fast heuristic so every article has a compelling hook and summary
  for (const item of needsAi.slice(6)) {
    const fb = generateHeuristicHookAndSummary(item.headline, item.body, assetSymbol);
    item.summary_ai = fb.summary;
    item.hook_ai = fb.hook;
    item.summary_ai_fa = fb.summary_fa;
    item.hook_ai_fa = fb.hook_fa;
    item.key_takeaways = fb.key_takeaways;
    item.key_takeaways_fa = fb.key_takeaways_fa;
  }
}
