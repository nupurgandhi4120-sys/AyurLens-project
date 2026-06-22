import React from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, Globe, ExternalLink, ShieldAlert,
  BookOpen, Activity, Leaf, Tag, FlaskConical,
  Trees, Droplets, AlertTriangle
} from 'lucide-react';

// ─── Small reusable section block ────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlantResult({ result, imagePreview, onReset }) {
  const { plantData, confidenceScore, wikipedia } = result;
  const tax = plantData.taxonomy || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="pr-card"
    >
      {/* ── Hero ── */}
      <div className="pr-hero">
        <img src={imagePreview} className="pr-hero-img" alt="Scanned plant" />
        <div className="pr-hero-overlay" />

        <div className="pr-hero-bottom">
          <h2 className="pr-plant-name">{plantData.commonName}</h2>
          <p className="pr-plant-sci">{plantData.scientificName}</p>
        </div>

        <div className="pr-match-badge">
          {confidenceScore}% Match
        </div>
      </div>

      {/* ── Body ── */}
      <div className="pr-body">

        {/* Description */}
        {plantData.description && (
          <p className="pr-description">{plantData.description}</p>
        )}

        {/* Meta badges */}
        <div className="pr-badge-row">
          <span className="pr-badge pr-badge-green">
            Plant likelihood: {confidenceScore}%
          </span>
          {plantData.rank && (
            <span className="pr-badge pr-badge-outline">
              Rank: {plantData.rank}
            </span>
          )}
          {plantData.ayushSystems?.map(sys => (
            <span key={sys} className="pr-badge pr-badge-blue">{sys}</span>
          ))}
        </div>

        <div className="pr-divider" />

        {/* Names */}
        {plantData.commonNames?.length > 0 && (
          <Section icon={Tag} title="Names" iconColor="text-emerald-600">
            <div className="pr-names-grid">
              <div>
                <p className="pr-label">Scientific name</p>
                <p className="pr-value-em">{plantData.scientificName}</p>
              </div>
              <div>
                <p className="pr-label">Common names</p>
                <div className="pr-tags">
                  {plantData.commonNames.map((n, i) => (
                    <span key={i} className="pr-name-tag">{n}</span>
                  ))}
                </div>
              </div>
              {plantData.family && (
                <div>
                  <p className="pr-label">Family</p>
                  <p className="pr-value">{plantData.family}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Taxonomy / Classification */}
        {Object.keys(tax).length > 0 && (
          <Section icon={Trees} title="Classification" iconColor="text-teal-600">
            <div className="pr-tax-table">
              <TaxRow label="Kingdom"  value={tax.kingdom} />
              <TaxRow label="Phylum"   value={tax.phylum} />
              <TaxRow label="Class"    value={tax.class} />
              <TaxRow label="Order"    value={tax.order} />
              <TaxRow label="Family"   value={tax.family} />
              <TaxRow label="Genus"    value={tax.genus} />
              <TaxRow label="Species"  value={plantData.scientificName} />
            </div>
          </Section>
        )}

        {/* AYUSH Uses */}
        {plantData.uses?.length > 0 && (
          <Section icon={Activity} title="Educational Uses" iconColor="text-emerald-500">
            <ul className="pr-list">
              {plantData.uses.map((u, i) => (
                <li key={i} className="pr-list-item">
                  <span className="pr-dot pr-dot-green" />
                  {u}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Precautions */}
        {plantData.precautions?.length > 0 && (
          <Section icon={ShieldAlert} title="Precautions" iconColor="text-red-500">
            <div className="pr-precaution-box">
              <div className="pr-precaution-header">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-red-700 font-medium">
                  For educational purposes only — not medical advice
                </span>
              </div>
              <ul className="pr-list">
                {plantData.precautions.map((p, i) => (
                  <li key={i} className="pr-list-item text-red-800">
                    <span className="pr-dot pr-dot-red" />
                    {p}
                  </li>
                ))}
              </ul>
              {plantData.toxicity && (
                <p className="pr-toxicity">
                  <strong>Toxicity:</strong> {plantData.toxicity}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* Active Compounds */}
        {plantData.activeCompounds?.length > 0 && (
          <Section icon={FlaskConical} title="Active Compounds / Synonyms" iconColor="text-indigo-500">
            <div className="pr-tags">
              {plantData.activeCompounds.map((c, i) => (
                <span key={i} className="pr-compound-tag">{c}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Plant Parts & Care */}
        {(plantData.plantParts?.length > 0 || plantData.properties?.length > 0 || plantData.preparation?.length > 0) && (
          <Section icon={Leaf} title="Plant Details" iconColor="text-lime-600">
            <div className="pr-details-grid">
              {plantData.plantParts?.length > 0 && (
                <div>
                  <p className="pr-label">Edible parts</p>
                  <p className="pr-value">{plantData.plantParts.join(', ')}</p>
                </div>
              )}
              {plantData.properties?.length > 0 && (
                <div>
                  <p className="pr-label">Light / Soil</p>
                  <p className="pr-value">{plantData.properties.join(' · ')}</p>
                </div>
              )}
              {plantData.preparation?.length > 0 && (
                <div>
                  <p className="pr-label">Care</p>
                  <p className="pr-value">{plantData.preparation.join(', ')}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Similar plants */}
        {plantData.similarPlants?.length > 0 && (
          <Section icon={BookOpen} title="Similar Plants" iconColor="text-purple-500">
            <div className="pr-tags">
              {plantData.similarPlants.map((p, i) => (
                <span key={i} className="pr-similar-tag">{p}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Wikipedia Overview */}
        {wikipedia && (
          <Section icon={Globe} title="Wikipedia Overview" iconColor="text-blue-500">
            <div className="pr-wiki-box">
              <div className="pr-wiki-header">
                <p className="pr-wiki-title">{wikipedia.title}</p>
                <a
                  href={wikipedia.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pr-wiki-link"
                >
                  Full article <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {wikipedia.thumbnail && (
                <div className="pr-wiki-content">
                  <img
                    src={wikipedia.thumbnail}
                    alt={plantData.commonName}
                    className="pr-wiki-thumb"
                  />
                  <p className="pr-wiki-excerpt">{wikipedia.excerpt}</p>
                </div>
              )}
              {!wikipedia.thumbnail && (
                <p className="pr-wiki-excerpt">{wikipedia.excerpt}</p>
              )}

              {plantData.wikiUrl && (
                <a
                  href={plantData.wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pr-wiki-ext-link"
                >
                  <Droplets className="w-3 h-3" /> Plant.id reference page
                </a>
              )}
            </div>
          </Section>
        )}

        {/* Reset button */}
        <button onClick={onReset} className="pr-reset-btn">
          <RefreshCw className="w-4 h-4" /> Scan Another Plant
        </button>
      </div>
    </motion.div>
  );
}
