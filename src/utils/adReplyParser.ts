export interface AdReplyData {
  title?: string;
  body?: string;
  sourceUrl?: string;
  sourceId?: string;
  sourceType?: string;
  thumbnailUrl?: string;
}

/**
 * Decodes HTML entities (e.g., &amp;, &lt;, &gt;, &quot;, &#39;, &nbsp;)
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/');
}

/**
 * Parses structured Ad Reply data from JSON, HTML string, or object.
 */
export function parseAdReplyData(
  input: string | AdReplyData | null | undefined
): AdReplyData | null {
  if (!input) return null;

  // 1. Object case
  if (typeof input === 'object') {
    if (input.title || input.body || input.thumbnailUrl || input.sourceUrl) {
      return input as AdReplyData;
    }
    return null;
  }

  if (typeof input !== 'string') return null;
  const str = input.trim();
  if (!str) return null;

  // 2. JSON string case
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        if (parsed.title || parsed.body || parsed.thumbnailUrl || parsed.sourceUrl) {
          return parsed as AdReplyData;
        }
      }
    } catch (e) {
      // JSON parse failed, proceed to HTML check
    }
  }

  // 3. Check for HTML / Meta Ad pattern
  const isHtmlAd =
    str.includes('<a ') ||
    str.includes('<div') ||
    str.includes('Anuncio de Facebook') ||
    str.includes('Anuncio de Instagram') ||
    str.includes('fb.me') ||
    str.includes('facebook.com') ||
    str.includes('instagram.com');

  if (isHtmlAd) {
    return extractAdDataFromHtml(str);
  }

  return null;
}

/**
 * Extracts AdReplyData from an HTML string (e.g., Whaticket Web Ad Card HTML)
 */
export function extractAdDataFromHtml(html: string): AdReplyData | null {
  if (!html || typeof html !== 'string') return null;

  // Extract sourceUrl from href attribute
  let sourceUrl: string | undefined = undefined;
  const hrefMatch = html.match(/href=["']([^"']+)["']/i);
  if (hrefMatch && hrefMatch[1]) {
    sourceUrl = hrefMatch[1];
  }

  // Extract thumbnailUrl from img src attribute
  let thumbnailUrl: string | undefined = undefined;
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    thumbnailUrl = imgMatch[1];
  }

  // Strip <svg>...</svg> blocks to prevent SVG path data string noise
  let cleanHtml = html.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  // Replace block element tags with newlines to keep line separation
  cleanHtml = cleanHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/span>/gi, '\n')
    .replace(/<\/a>/gi, '\n');

  // Remove remaining HTML tags
  cleanHtml = cleanHtml.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  cleanHtml = decodeHtmlEntities(cleanHtml);

  // Split into lines, trim, and filter empty lines
  const lines = cleanHtml
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Filter out badge labels like "Anuncio de Facebook / Instagram", "Anuncio de Facebook", etc.
  const contentLines = lines.filter(line => {
    const lower = line.toLowerCase();
    return (
      !lower.includes('anuncio de facebook') &&
      !lower.includes('anuncio de instagram') &&
      lower !== 'anuncio' &&
      lower !== 'facebook / instagram'
    );
  });

  let title: string | undefined = undefined;
  let body: string | undefined = undefined;

  if (contentLines.length > 0) {
    title = contentLines[0];
  }
  if (contentLines.length > 1) {
    body = contentLines.slice(1).join(' ');
  }

  if (!title && !body && !sourceUrl && !thumbnailUrl) {
    return null;
  }

  return {
    title,
    body,
    sourceUrl,
    thumbnailUrl,
    sourceType: 'facebook/instagram',
  };
}

/**
 * Helper to process a message body and optional adReply property.
 * Returns both structured adData (if an ad card exists) and clean message text.
 */
export function extractAdAndCleanMessage(
  bodyText?: string | null,
  adReplyProp?: string | AdReplyData | null
): { adData: AdReplyData | null; cleanText: string } {
  let adData: AdReplyData | null = null;
  let cleanText = bodyText ? bodyText.trim() : '';

  // 1. Try parsing explicit adReply property first
  if (adReplyProp) {
    adData = parseAdReplyData(adReplyProp);
  }

  // 2. If no adReply found, check if bodyText contains HTML ad card markup
  if (!adData && cleanText && (cleanText.includes('<a ') || cleanText.includes('<div') || cleanText.includes('fb.me') || cleanText.includes('Anuncio de Facebook'))) {
    // Attempt to match full <a>...</a> or <div>...</div> HTML block
    const htmlAnchorMatch = cleanText.match(/<a [^>]*>[\s\S]*?<\/a>/i);
    const htmlDivMatch = !htmlAnchorMatch ? cleanText.match(/<div [^>]*>[\s\S]*?<\/div>/i) : null;
    const htmlBlock = htmlAnchorMatch ? htmlAnchorMatch[0] : (htmlDivMatch ? htmlDivMatch[0] : null);

    if (htmlBlock) {
      adData = extractAdDataFromHtml(htmlBlock);
      // Remove HTML block from message text to get remaining user message
      const textOutsideHtml = cleanText.replace(htmlBlock, '');
      const strippedText = decodeHtmlEntities(textOutsideHtml.replace(/<[^>]+>/g, '')).trim();
      cleanText = strippedText;
    } else {
      // Entire cleanText might be raw unclosed HTML card
      adData = extractAdDataFromHtml(cleanText);
      const strippedText = decodeHtmlEntities(cleanText.replace(/<[^>]+>/g, '')).trim();
      // If strippedText is just the title/body of the ad card, clear cleanText so it isn't rendered twice
      if (adData && (strippedText === adData.title || strippedText === adData.body || strippedText.includes(adData.title || ''))) {
        cleanText = '';
      } else {
        cleanText = strippedText;
      }
    }
  }

  return {
    adData,
    cleanText,
  };
}

/**
 * Formats a message string for list previews (e.g. TicketListItem), stripping HTML tags
 * and replacing raw Meta Ad card HTML with a clean string summary.
 */
export function cleanLastMessagePreview(lastMessage?: string | null): string {
  if (!lastMessage) return 'Sin mensajes';

  if (
    lastMessage.includes('<a ') ||
    lastMessage.includes('<div') ||
    lastMessage.includes('Anuncio de Facebook') ||
    lastMessage.includes('fb.me')
  ) {
    const { adData, cleanText } = extractAdAndCleanMessage(lastMessage);
    if (cleanText) {
      return cleanText;
    }
    if (adData) {
      const detail = adData.title || adData.body || 'Anuncio de Facebook / Instagram';
      return `[Anuncio]: ${detail}`;
    }
    // Fallback: strip all html tags
    const stripped = decodeHtmlEntities(lastMessage.replace(/<[^>]+>/g, ' ')).trim();
    return stripped || '[Anuncio de Meta]';
  }

  return lastMessage;
}
