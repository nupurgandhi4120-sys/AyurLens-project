import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Activity, BookOpen, Search, ShieldAlert,
  Globe, ExternalLink, Loader2, Trees, Tag,
  FlaskConical, Leaf, AlertTriangle, X, ArrowLeft,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { plantDatabase } from '../data/plantdatabase';
import {
  fetchWikipediaFullDetails,
  fetchSearchSuggestions,
} from '../services/wikipediaService';

// ─── Fallback SVG for local cards ─────────────────────────────────────────────
const fallbackColors = [
  ['#1d4a34', '#9caf5d'], ['#2f6b4c', '#d49a32'],
  ['#647a38', '#f3ecd8'], ['#123524', '#8bac56'],
];
const createPlantFallback = (plant) => {
  const colorPair = fallbackColors[plant.id.replace(/\D/g, '') % fallbackColors.length];
  const initials = plant.commonName.split(/[ (]/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360">
    <defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${colorPair[0]}"/><stop offset="1" stop-color="${colorPair[1]}"/>
    </linearGradient></defs>
    <rect width="600" height="360" fill="url(#bg)"/>
    <path d="M300 262 C238 202 238 126 300 76 C362 126 362 202 300 262Z" fill="#fffdf7" opacity=".78"/>
    <text x="300" y="302" text-anchor="middle" font-family="Arial" font-size="54" font-weight="700" fill="#fffdf7">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// ─── Section heading (same style as PlantResult) ──────────────────────────────
function Section({ icon: Icon, title, iconColor = 'text-emerald-600', children }) {
  return (
    <div className="pr-section">
      <h3 className="pr-section-title">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {title}
      </h3>
      <div className="pr-section-body">{children}</div>
    </div>
  );
}

// ─── Taxonomy row ─────────────────────────────────────────────────────────────
function TaxRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="pr-tax-row">
      <span className="pr-tax-label">{label}</span>
      <span className="pr-tax-value">{value}</span>
    </div>
  );
}

// ─── Wikipedia Detail Card (same layout as PlantResult) ──────────────────────
function WikiDetailCard({ data, onClose }) {
  const tax = data.taxonomy || {};
  const hasTax = Object.keys(tax).length > 0;

  return (
    <div className="wdc-wrap">
      {/* Hero */}
      <div className="pr-hero" style={{ height: 200 }}>
        {data.thumbnail
          ? <img src={data.thumbnail} alt={data.title} className="pr-hero-img" />
          : <div className="pr-hero-img" style={{ background: 'linear-gradient(135deg,#064e3b,#10b981)' }} />
        }
        <div className="pr-hero-overlay" />
        <div className="pr-hero-bottom">
          <h2 className="pr-plant-name">{data.title}</h2>
          {data.description && <p className="pr-plant-sci">{data.description}</p>}
        </div>
        <button onClick={onClose} className="wdc-close-btn" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <a href={data.pageUrl} target="_blank" rel="noopener noreferrer"
           className="wdc-wiki-pill">
          <Globe className="w-3 h-3" /> Wikipedia
        </a>
      </div>

      {/* Body */}
      <div className="pr-body">

        {/* Description / Extract */}
        {data.summary && (
          <p className="pr-description">{data.excerpt || data.summary}</p>
        )}

        {/* Badge row */}
        <div className="pr-badge-row">
          <span className="pr-badge pr-badge-green">🌿 Wikipedia</span>
          {data.lastModified && (
            <span className="pr-badge pr-badge-outline">Updated: {data.lastModified}</span>
          )}
        </div>

        <div className="pr-divider" />

        {/* Names */}
        {(data.commonNames?.length > 0 || data.title) && (
          <Section icon={Tag} title="Names" iconColor="text-emerald-600">
            <div className="pr-names-grid">
              <div>
                <p className="pr-label">Article title</p>
                <p className="pr-value-em">{data.title}</p>
              </div>
              {data.commonNames?.length > 0 && (
                <div>
                  <p className="pr-label">Common names</p>
                  <div className="pr-tags">
                    {data.commonNames.map((n, i) => (
                      <span key={i} className="pr-name-tag">{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {tax.family && (
                <div>
                  <p className="pr-label">Family</p>
                  <p className="pr-value">{tax.family}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Taxonomy / Classification */}
        {hasTax && (
          <Section icon={Trees} title="Classification" iconColor="text-teal-600">
            <div className="pr-tax-table">
              <TaxRow label="Kingdom" value={tax.kingdom} />
              <TaxRow label="Phylum"  value={tax.phylum} />
              <TaxRow label="Class"   value={tax.class} />
              <TaxRow label="Order"   value={tax.order} />
              <TaxRow label="Family"  value={tax.family} />
              <TaxRow label="Genus"   value={tax.genus} />
              <TaxRow label="Species" value={tax.species} />
            </div>
          </Section>
        )}

        {/* Full Description */}
        {data.summary && data.summary.length > data.excerpt?.length && (
          <Section icon={BookOpen} title="Full Description" iconColor="text-indigo-500">
            <p className="pr-wiki-excerpt" style={{ whiteSpace: 'pre-line' }}>
              {data.summary}
            </p>
          </Section>
        )}

        {/* Precautions note */}
        <Section icon={ShieldAlert} title="Precautions" iconColor="text-red-500">
          <div className="pr-precaution-box">
            <div className="pr-precaution-header">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-700 font-medium">
                This information is for educational purposes only — consult a qualified
                practitioner before any medicinal use.
              </span>
            </div>
          </div>
        </Section>

        {/* Similar plants */}
        {data.similar?.length > 0 && (
          <Section icon={Leaf} title="Related Wikipedia Articles" iconColor="text-lime-600">
            <div className="pr-tags">
              {data.similar.map((s, i) => (
                <a key={i}
                   href={`https://en.wikipedia.org/wiki/${encodeURIComponent(s)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="pr-similar-tag" style={{ textDecoration: 'none' }}>
                  {s}
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Read full article link */}
        <a href={data.pageUrl} target="_blank" rel="noopener noreferrer"
           className="wdc-full-link">
          <ExternalLink className="w-4 h-4" />
          Read full Wikipedia article — {data.title}
        </a>
      </div>
    </div>
  );
}

// ─── Expandable Wikipedia panel on local DB cards ─────────────────────────────
function LocalCardWikiPanel({ plant }) {
  const [wikiData, setWikiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState(false);

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched) {
      setLoading(true);
      try {
        const result = await fetchWikipediaFullDetails(plant.scientificName || plant.commonName);
        setWikiData(result);
      } catch (_) {
        setWikiData(null);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    }
  }, [open, fetched, plant]);

  return (
    <div className="wiki-panel-wrapper">
      <button type="button" className="wiki-toggle-btn" onClick={toggle} aria-expanded={open}>
        <Globe className="w-4 h-4" />
        <span>Wikipedia Details</span>
        {open ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {open && (
        <div className="wiki-content">
          {loading && (
            <div className="wiki-loading">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span>Fetching Wikipedia info…</span>
            </div>
          )}
          {!loading && !wikiData && (
            <p className="wiki-not-found">No Wikipedia article found for this plant.</p>
          )}
          {!loading && wikiData && (
            <>
              {/* Taxonomy table */}
              {Object.keys(wikiData.taxonomy || {}).length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p className="pr-label" style={{ marginBottom: '0.4rem' }}>Classification</p>
                  <div className="pr-tax-table">
                    <TaxRow label="Kingdom" value={wikiData.taxonomy.kingdom} />
                    <TaxRow label="Phylum"  value={wikiData.taxonomy.phylum} />
                    <TaxRow label="Class"   value={wikiData.taxonomy.class} />
                    <TaxRow label="Order"   value={wikiData.taxonomy.order} />
                    <TaxRow label="Family"  value={wikiData.taxonomy.family} />
                    <TaxRow label="Genus"   value={wikiData.taxonomy.genus} />
                    <TaxRow label="Species" value={wikiData.taxonomy.species} />
                  </div>
                </div>
              )}

              {/* Thumbnail + excerpt */}
              {wikiData.thumbnail && (
                <div className="wiki-thumb-row">
                  <img src={wikiData.thumbnail} alt={plant.commonName} className="wiki-thumb" />
                  <div className="wiki-text-block">
                    <p className="wiki-title">{wikiData.title}</p>
                    {wikiData.description && <p className="wiki-desc">{wikiData.description}</p>}
                  </div>
                </div>
              )}

              <p className="wiki-excerpt">{wikiData.excerpt}</p>

              <a href={wikiData.pageUrl} target="_blank" rel="noopener noreferrer"
                 className="wiki-read-more">
                <ExternalLink className="w-3 h-3" />
                Read full article on Wikipedia
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Plant Library ───────────────────────────────────────────────────────
export default function PlantLibrary() {
  const [query, setQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('All systems');

  // Wikipedia search state
  const [wikiResult, setWikiResult]   = useState(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiError, setWikiError]     = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef(null);
  const searchRef    = useRef(null);

  const systems = useMemo(() => {
    const all = plantDatabase.flatMap(p => p.ayushSystems);
    return ['All systems', ...Array.from(new Set(all)).sort()];
  }, []);

  const filteredPlants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plantDatabase.filter(plant => {
      const matchSys = selectedSystem === 'All systems' || plant.ayushSystems.includes(selectedSystem);
      const text = [
        plant.commonName, plant.scientificName, plant.family, plant.description,
        ...plant.ayushSystems, ...plant.uses, ...plant.precautions,
        ...plant.activeCompounds, ...plant.similarPlants,
      ].join(' ').toLowerCase();
      return matchSys && (!q || text.includes(q));
    });
  }, [query, selectedSystem]);

  // Autocomplete suggestions as user types
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setWikiResult(null);
    setWikiError(null);

    clearTimeout(suggestTimer.current);
    if (val.trim().length >= 2) {
      suggestTimer.current = setTimeout(async () => {
        try {
          const s = await fetchSearchSuggestions(val, 6);
          setSuggestions(s);
          setShowSuggestions(s.length > 0);
        } catch (_) {}
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const runWikiSearch = useCallback(async (searchTerm) => {
    const term = (searchTerm || query).trim();
    if (!term) return;
    setShowSuggestions(false);
    setWikiResult(null);
    setWikiError(null);
    setWikiLoading(true);
    try {
      const data = await fetchWikipediaFullDetails(term);
      if (data) {
        setWikiResult(data);
      } else {
        setWikiError(`No Wikipedia article found for "${term}". Try a more specific name.`);
      }
    } catch (err) {
      setWikiError('Failed to fetch Wikipedia data. Please check your connection.');
    } finally {
      setWikiLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      runWikiSearch();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const pickSuggestion = (s) => {
    setQuery(s);
    setShowSuggestions(false);
    runWikiSearch(s);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <section className="content-panel">

      {/* ── Search bar ── */}
      <div className="library-toolbar" style={{ position: 'relative' }}>
        <div className="search-field-wrap" ref={searchRef} style={{ flex: 1, position: 'relative' }}>
          <label className="search-field" style={{ width: '100%' }}>
            <Search className="w-5 h-5" />
            <input
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search any plant or flower — press Enter for Wikipedia details…"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setWikiResult(null); setWikiError(null); setSuggestions([]); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.25rem' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </label>

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="wiki-suggest-dropdown">
              {suggestions.map((s, i) => (
                <button key={i} type="button" className="wiki-suggest-item" onClick={() => pickSuggestion(s)}>
                  <Globe className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="wiki-search-btn"
          onClick={() => runWikiSearch()}
          disabled={wikiLoading}
        >
          {wikiLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Globe className="w-4 h-4" />
          }
          {wikiLoading ? 'Searching…' : 'Wikipedia'}
        </button>

        <select className="system-select" value={selectedSystem}
          onChange={e => setSelectedSystem(e.target.value)}>
          {systems.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* ── Wikipedia loading state ── */}
      {wikiLoading && (
        <div className="wiki-search-loading">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <p>Fetching details from Wikipedia…</p>
        </div>
      )}

      {/* ── Wikipedia error ── */}
      {wikiError && !wikiLoading && (
        <div className="wiki-search-error">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p>{wikiError}</p>
        </div>
      )}

      {/* ── Wikipedia Detail Card ── */}
      {wikiResult && !wikiLoading && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="wdc-section-label">
            <Globe className="w-4 h-4 text-blue-500" />
            Wikipedia Result for "{query}"
          </div>
          <WikiDetailCard data={wikiResult} onClose={() => setWikiResult(null)} />
        </div>
      )}

      {/* ── Local plant database grid ── */}
      <div className="plant-grid">
        {filteredPlants.map((plant) => (
          <article className="plant-card" key={plant.id}>
            <figure className="plant-photo-frame">
              <img
                src={plant.imageUrl || createPlantFallback(plant)}
                alt={plant.imageAlt}
                loading="lazy"
                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = createPlantFallback(plant); }}
              />
            </figure>

            <div className="plant-card-header">
              <div>
                <h3>{plant.commonName}</h3>
                <p><em>{plant.scientificName}</em></p>
              </div>
              <span>{plant.family}</span>
            </div>

            <p className="plant-description">{plant.description}</p>

            <div className="tag-row">
              {plant.ayushSystems.map(sys => (
                <span className="tag tag-blue" key={sys}>{sys}</span>
              ))}
            </div>

            <div className="plant-info-grid">
              <div>
                <h4><Activity className="w-4 h-4" /> Uses</h4>
                <p>{plant.uses.join(', ')}</p>
              </div>
              <div>
                <h4><BookOpen className="w-4 h-4" /> Compounds</h4>
                <p>{plant.activeCompounds.join(', ')}</p>
              </div>
              <div className="warning-block">
                <h4><ShieldAlert className="w-4 h-4" /> Precautions</h4>
                <p>{plant.precautions.join(' ')}</p>
              </div>
            </div>

            {/* Expandable Wikipedia panel with taxonomy */}
            <LocalCardWikiPanel plant={plant} />
          </article>
        ))}
      </div>

      {filteredPlants.length === 0 && !wikiResult && !wikiLoading && (
        <div className="empty-state">
          <BookOpen className="w-12 h-12" />
          <h3>No plants found in library</h3>
          <p>Press Enter or click "Wikipedia" to search Wikipedia for "{query}".</p>
        </div>
      )}
    </section>
  );
}
