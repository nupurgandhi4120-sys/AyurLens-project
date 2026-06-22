/**
 * Wikipedia REST API Service
 * Fetches plant information from Wikipedia using the open REST API (no key required).
 */

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIPEDIA_SEARCH_API = 'https://en.wikipedia.org/w/api.php';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a Wikipedia summary (thumbnail, excerpt, url, description).
 * Tries scientific name → common name → search fallback.
 */
export const fetchWikipediaInfo = async (scientificName, commonName) => {
  const queries = [scientificName, commonName].filter(Boolean);
  for (const query of queries) {
    try {
      const result = await fetchSummaryByTitle(query);
      if (result) return result;
    } catch (_) { /* try next */ }
  }
  try {
    return await searchWikipedia(scientificName || commonName);
  } catch (_) {
    return null;
  }
};

/**
 * Fetch FULL plant details from Wikipedia:
 * summary (description, thumbnail, extract) + taxonomy parsed from wikitext taxobox.
 * This is used by the Plant Library search for rich detail cards.
 *
 * @param {string} query  – plant name (common or scientific)
 * @returns {Promise<WikipediaFullResult|null>}
 */
export const fetchWikipediaFullDetails = async (query) => {
  if (!query?.trim()) return null;

  // Step 1: get the summary (thumbnail, extract, description, url)
  let summary = null;
  try { summary = await fetchSummaryByTitle(query); } catch (_) {}
  if (!summary) {
    try { summary = await searchWikipedia(query); } catch (_) {}
  }
  if (!summary) return null;

  // Step 2: fetch wikitext to parse the taxobox for taxonomy
  let taxonomy = {};
  let commonNames = [];
  let imageCaption = null;
  try {
    const wikitext = await fetchWikitext(summary.title);
    taxonomy = parseTaxobox(wikitext);
    commonNames = parseCommonNames(wikitext);
    imageCaption = parseImageCaption(wikitext);
  } catch (_) { /* taxonomy is optional */ }

  // Step 3: fetch search suggestions for similar plants
  let similar = [];
  try { similar = await fetchSearchSuggestions(query, 4); } catch (_) {}

  return {
    ...summary,
    taxonomy,          // { kingdom, phylum, class, order, family, genus, species }
    commonNames,       // string[]
    imageCaption,
    similar,           // string[] of related titles
  };
};

/**
 * Live search suggestions as user types (for autocomplete).
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
export const fetchSearchSuggestions = async (query, limit = 6) => {
  if (!query || query.length < 2) return [];
  const params = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: String(limit),
    namespace: '0',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${WIKIPEDIA_SEARCH_API}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data[1] || []; // opensearch returns [query, suggestions[], descriptions[], urls[]]
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

const fetchSummaryByTitle = async (title) => {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(`${WIKIPEDIA_API_BASE}/${encoded}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === 'disambiguation' || !data.extract) return null;
  return formatWikipediaResult(data);
};

const searchWikipedia = async (query) => {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: 3,
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${WIKIPEDIA_SEARCH_API}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const hits = data?.query?.search || [];
  if (!hits.length) return null;
  return fetchSummaryByTitle(hits[0].title);
};

/** Fetch the raw wikitext of a page */
const fetchWikitext = async (title) => {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'wikitext',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${WIKIPEDIA_SEARCH_API}?${params}`);
  if (!res.ok) return '';
  const data = await res.json();
  return data.parse?.wikitext?.['*'] || '';
};

/** Parse a Taxobox / Speciesbox from wikitext */
const parseTaxobox = (wikitext) => {
  const tax = {};
  const patterns = {
    kingdom : /\|\s*(?:kingdom|regnum)\s*=\s*([^\n|{}[\]]+)/i,
    phylum  : /\|\s*(?:phylum|divisio|division)\s*=\s*([^\n|{}[\]]+)/i,
    class   : /\|\s*(?:class|classis)\s*=\s*([^\n|{}[\]]+)/i,
    order   : /\|\s*(?:order|ordo)\s*=\s*([^\n|{}[\]]+)/i,
    family  : /\|\s*(?:family|familia)\s*=\s*([^\n|{}[\]]+)/i,
    genus   : /\|\s*genus\s*=\s*([^\n|{}[\]]+)/i,
    species : /\|\s*species\s*=\s*([^\n|{}[\]]+)/i,
  };
  for (const [key, pat] of Object.entries(patterns)) {
    const m = wikitext.match(pat);
    if (m) {
      tax[key] = cleanWikiMarkup(m[1]);
    }
  }
  return tax;
};

/** Parse common_name field from wikitext */
const parseCommonNames = (wikitext) => {
  const m = wikitext.match(/\|\s*(?:common_name|common_names|name)\s*=\s*([^\n|]+)/i);
  if (!m) return [];
  return cleanWikiMarkup(m[1])
    .split(/,|;|\n/)
    .map(s => s.trim())
    .filter(Boolean);
};

/** Parse image caption from wikitext */
const parseImageCaption = (wikitext) => {
  const m = wikitext.match(/\|\s*image_caption\s*=\s*([^\n|]+)/i);
  if (!m) return null;
  return cleanWikiMarkup(m[1]).trim() || null;
};

/** Strip wiki markup from a string */
const cleanWikiMarkup = (str) =>
  str
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')   // [[link|label]] → label
    .replace(/\[\[([^\]]+)\]\]/g, '$1')               // [[link]] → link
    .replace(/{{[^}]*}}/g, '')                        // remove templates
    .replace(/'{2,}/g, '')                            // remove bold/italic
    .replace(/[{}[\]]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

const formatWikipediaResult = (data) => ({
  title      : data.title,
  summary    : data.extract,
  excerpt    : trimToSentences(data.extract, 4),
  thumbnail  : data.thumbnail?.source || null,
  pageUrl    : data.content_urls?.desktop?.page
               || `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
  description: data.description || null,
  lastModified: data.timestamp ? new Date(data.timestamp).toLocaleDateString() : null,
});

const trimToSentences = (text, count) => {
  if (!text) return '';
  const sentences = text.match(/[^.!?]*[.!?]+/g) || [text];
  return sentences.slice(0, count).join(' ').trim();
};
