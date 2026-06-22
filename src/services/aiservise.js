import { fetchWikipediaInfo } from './wikipediaService';

// ─── Plant.id API Config ──────────────────────────────────────────────────────
const PLANT_ID_API_KEY = 'szDJPlOf294YN1pQH9mItn9UPepAFJNtjNiCvgYXm21VVpzFYd';
const PLANT_ID_URL = 'https://plant.id/api/v3/identification';

// ─── Gemini API Config (for AI assistant only) ────────────────────────────────
const GEMINI_API_KEY = 'AQ.Ab8RN6KwVYESvsx5OvaPTYuWif92MMrKtJDzxESTXh6TORPNLg';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a File object to a base64 data-URL string (with prefix).
 */
const fileToBase64DataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });

/**
 * Convert a File object to a plain base64 string (no prefix).
 */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (err) => reject(err);
  });

// ─── Plant Identification via Plant.id API ────────────────────────────────────

/**
 * Identifies a plant from an image using the Plant.id v3 API,
 * then enriches the result with Wikipedia information.
 *
 * @param {File} imageFile
 * @returns {Promise<{ success: boolean, confidenceScore: number, plantData: object, wikipedia: object|null, error?: string }>}
 */
export const identifyPlant = async (imageFile) => {
  try {
    const base64DataUrl = await fileToBase64DataUrl(imageFile);

    // Plant.id v3: details + modifiers go as URL query parameters
    const detailFields = [
      'common_names',
      'description',
      'taxonomy',
      'url',
      'wiki_description',
      'synonyms',
      'edible_parts',
      'watering',
      'best_light_condition',
      'best_soil_type',
      'toxicity',
    ].join(',');

    const params = new URLSearchParams({
      details: detailFields,
      classification_level: 'species',
    });
    // similar_images needs to be appended separately (boolean flag)
    params.append('similar_images', 'true');

    const requestUrl = `${PLANT_ID_URL}?${params.toString()}`;

    // Only images go in the POST body
    const requestBody = {
      images: [base64DataUrl],
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': PLANT_ID_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Plant.id API error ${response.status}: ${errText}`);
    }


    const data = await response.json();

    // Pull out the top suggestion
    const suggestions = data.result?.classification?.suggestions || [];
    if (!suggestions.length) {
      throw new Error('No plant identified. Please try a clearer, well-lit photo of the plant.');
    }

    const top = suggestions[0];
    const details = top.details || {};

    const confidenceScore = Math.round((top.probability || 0) * 100);

    // Build a structured plantData object from Plant.id response
    const plantData = {
      commonName: details.common_names?.[0] || top.name,
      commonNames: details.common_names || [],
      scientificName: top.name,
      rank: top.rank || 'species',
      family: details.taxonomy?.family || null,
      taxonomy: details.taxonomy || null,   // { kingdom, phylum, class, order, family, genus }
      description:
        details.wiki_description?.value ||
        details.description?.value ||
        `${top.name} is a plant identified by AI analysis.`,
      ayushSystems: inferAYUSHSystems(top.name, details),
      activeCompounds: details.synonyms?.slice(0, 5) || [],
      uses: buildUses(details),
      precautions: buildPrecautions(details),
      tastes: [],
      properties: [details.best_light_condition || null, details.best_soil_type || null].filter(Boolean),
      plantParts: details.edible_parts || [],
      preparation: details.watering ? [`Watering: every ${details.watering.min}–${details.watering.max} days`] : [],
      dosage: null,
      region: null,
      seasonality: null,
      toxicity: details.toxicity || null,
      similarPlants: suggestions.slice(1, 4).map((s) => s.name),
      wikiUrl: details.url || null,
    };


    // Enrich with Wikipedia (non-blocking)
    let wikipedia = null;
    try {
      wikipedia = await fetchWikipediaInfo(plantData.scientificName, plantData.commonName);
    } catch (_) {
      // optional
    }

    return { success: true, confidenceScore, plantData, wikipedia };
  } catch (error) {
    console.error('Plant identification error:', error);
    return { success: false, error: error.message, plantData: null, wikipedia: null };
  }
};

// ─── Helpers for building structured data ────────────────────────────────────

const inferAYUSHSystems = (name, details) => {
  const ayushPlants = {
    'Ocimum tenuiflorum': ['Ayurveda', 'Siddha', 'Unani'],
    'Azadirachta indica': ['Ayurveda', 'Unani'],
    'Curcuma longa': ['Ayurveda', 'Siddha', 'Unani'],
    'Withania somnifera': ['Ayurveda'],
    'Aloe vera': ['Ayurveda', 'Unani', 'Siddha'],
  };
  for (const [key, systems] of Object.entries(ayushPlants)) {
    if (name.toLowerCase().includes(key.toLowerCase().split(' ')[0])) return systems;
  }
  return ['Ayurveda'];
};

const buildUses = (details) => {
  const uses = [];
  if (details.edible_parts?.length) uses.push(`Edible parts: ${details.edible_parts.join(', ')}`);
  if (details.wiki_description?.value) {
    const sentences = details.wiki_description.value.match(/[^.!?]*[.!?]+/g) || [];
    if (sentences[1]) uses.push(sentences[1].trim());
  }
  if (!uses.length) uses.push('Traditional medicinal use', 'Ornamental and garden plant');
  return uses;
};

const buildPrecautions = (details) => {
  const precautions = ['Consult a qualified practitioner before medicinal use.'];
  if (details.toxicity) precautions.push(`Toxicity note: ${details.toxicity}`);
  return precautions;
};

// ─── AI Assistant via Gemini ──────────────────────────────────────────────────

/**
 * Answer a plant-related question using Gemini, enriched with Wikipedia context.
 * @param {string} question
 * @returns {Promise<string>}
 */
export const askQuestion = async (question) => {
  try {
    // Try to enrich with Wikipedia context
    let wikiContext = '';
    try {
      const wikiData = await fetchWikipediaInfo(question, question);
      if (wikiData?.excerpt) {
        wikiContext = `\n\nWikipedia context: ${wikiData.excerpt}`;
      }
    } catch (_) { /* optional */ }

    const systemPrompt = `You are Ayurlens, a knowledgeable Ayurvedic and AYUSH plant assistant.
Provide accurate, educational, and friendly answers about medicinal plants, herbs, active compounds, AYUSH systems, preparation methods, dosages, and precautions.
Always end answers about plant use with: "This is for educational purposes only — consult a qualified practitioner before use."${wikiContext}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser question: ${question}` }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 600 },
      }),
    });

    if (!response.ok) {
      // Gemini unavailable — fall back gracefully
      const wiki = await fetchWikipediaInfo(question, question);
      if (wiki?.summary) return `Here's what Wikipedia says about "${question}":\n\n${wiki.excerpt}\n\nFor more detail, visit: ${wiki.pageUrl}`;
      return "I'm sorry, the AI assistant is temporarily unavailable. Try searching Wikipedia or browse the Plant Library.";
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim() || 'I could not generate an answer at this time. Please try again.';
  } catch (error) {
    console.error('Assistant error:', error);
    return "I'm sorry, I couldn't answer that right now. Please check your connection and try again.";
  }
};
