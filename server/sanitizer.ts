/**
 * Server-side HTML & RSS sanitization utilities
 */

export function cleanRssContent(raw?: string): string {
  if (!raw) return '';
  let text = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');

  // Decode common XML & HTML entities
  text = text
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8217;/gi, "'")
    .replace(/&#8216;/gi, "'")
    .replace(/&#8220;/gi, '"')
    .replace(/&#8221;/gi, '"')
    .replace(/&#8211;/gi, '-')
    .replace(/&#8212;/gi, '--')
    .replace(/&hellip;/gi, '...')
    .replace(/&#(\d+);/g, (_, code) => {
      const num = parseInt(code, 10);
      return !isNaN(num) ? String.fromCharCode(num) : '';
    });

  // Strip all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Strip any leftover URL parameters or raw links
  text = text.replace(/https?:\/\/\S+/gi, '');

  // Normalize spaces
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Format and ensure a clean, human-readable summary without raw link codes or HTML
 */
export function formatCleanSummary(headline: string, body?: string, sourceName?: string): string {
  const synthesizeInsight = (head: string, src?: string): string => {
    const lower = head.toLowerCase();
    const sourceSuffix = src ? ` via ${src}` : '';
    if (lower.includes('fed') || lower.includes('interest rate') || lower.includes('inflation')) {
      return `Macro interest rate speculation and central bank policy expectations continue to steer immediate asset positioning and liquidity flows${sourceSuffix}.`;
    }
    if (lower.includes('etf') || lower.includes('inflow') || lower.includes('institutional')) {
      return `Institutional capital allocation and exchange-traded fund activity are driving supply-demand dynamics and order book depth${sourceSuffix}.`;
    }
    if (lower.includes('layer-2') || lower.includes('staking') || lower.includes('validator') || lower.includes('on-chain')) {
      return `On-chain network throughput, validator economics, and ecosystem scaling milestones highlight ongoing protocol fundamental adoption${sourceSuffix}.`;
    }
    if (lower.includes('earnings') || lower.includes('revenue') || lower.includes('profit')) {
      return `Quarterly corporate financial metrics and executive guidance reveal key shifts in operating margins and commercial enterprise growth${sourceSuffix}.`;
    }
    if (lower.includes('ai') || lower.includes('chip') || lower.includes('cloud')) {
      return `Enterprise artificial intelligence deployment and cloud computing infrastructure demand continue accelerating capital expenditures${sourceSuffix}.`;
    }
    return `In-depth market intelligence detailing strategic developments, trading volumes, and key technical inflection points${sourceSuffix}.`;
  };

  if (!body) {
    return synthesizeInsight(headline, sourceName);
  }

  // Check if body is an escaped HTML anchor or contains link hash
  if (
    body.includes('&lt;a') ||
    body.includes('<a') ||
    body.includes('news.google.com') ||
    body.includes('href=') ||
    body.startsWith('http') ||
    body.includes('CBMi')
  ) {
    const cleaned = cleanRssContent(body);
    const normHead = headline.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normBody = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (
      cleaned.length > 25 &&
      !cleaned.includes('news.google.com') &&
      !normBody.startsWith(normHead) &&
      !normHead.startsWith(normBody)
    ) {
      return cleaned;
    }
    return synthesizeInsight(headline, sourceName);
  }

  const cleaned = cleanRssContent(body);
  if (!cleaned || cleaned.length < 15) {
    return synthesizeInsight(headline, sourceName);
  }

  return cleaned;
}

/**
 * Sanitize all news and social items in a database instance
 */
export function sanitizeDatabase(db: any): void {
  if (!db) return;

  if (Array.isArray(db.news_items)) {
    for (const item of db.news_items) {
      if (item.headline) {
        item.headline = cleanRssContent(item.headline);
      }
      item.body = formatCleanSummary(item.headline, item.body, item.source_name);

      if (
        item.headline_fa &&
        (item.headline_fa.includes('&lt;') || item.headline_fa.includes('<a') || item.headline_fa.includes('http'))
      ) {
        item.headline_fa = cleanRssContent(item.headline_fa);
      }

      if (
        item.body_fa &&
        (item.body_fa.includes('&lt;') ||
          item.body_fa.includes('<a') ||
          item.body_fa.includes('http') ||
          item.body_fa.includes('CBMi'))
      ) {
        item.body_fa = 'تحلیل رویدادها و تحولات بازار بر اساس آخرین داده‌های دریافتی.';
      }
    }
  }

  if (Array.isArray(db.social_items)) {
    for (const item of db.social_items) {
      if (item.title) {
        item.title = cleanRssContent(item.title);
      }
      if (item.body) {
        item.body = cleanRssContent(item.body);
      }
      if (item.title_fa && (item.title_fa.includes('&lt;') || item.title_fa.includes('<a'))) {
        item.title_fa = cleanRssContent(item.title_fa);
      }
      if (item.body_fa && (item.body_fa.includes('&lt;') || item.body_fa.includes('<a'))) {
        item.body_fa = cleanRssContent(item.body_fa);
      }
    }
  }
}
