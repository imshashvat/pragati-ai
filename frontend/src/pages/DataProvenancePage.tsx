// src/pages/DataProvenancePage.tsx
// Data provenance — source, freshness, quality flags

import React, { useEffect, useState } from 'react'
import { getProvenance, type ProvenanceData } from '../api/dashboard'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export default function DataProvenancePage() {
  usePageTitle('Data Provenance')

  const [data,    setData]    = useState<ProvenanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    getProvenance()
      .then(setData)
      .catch(() => setError('Could not load provenance data. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading data provenance">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-20 rounded-md" />
        <div className="skeleton h-48 rounded-md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
          Data Provenance
        </h1>
        <div
          className="flex items-center justify-between gap-3 px-4 py-4 rounded-md"
          style={{ background: '#FFF0F1', border: '1px solid #FF8389' }}
          role="alert"
        >
          <p className="text-[13px]" style={{ color: '#DA1E28' }}>{error}</p>
          <button className="btn-action flex-shrink-0" onClick={load} style={{ borderColor: '#FF8389', color: '#DA1E28' }}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const isDemo = data?.source === 'demo'
  const lastSync = data?.last_sync
    ? new Date(data.last_sync).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
    : 'Never synced'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
          Data Provenance
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#525252' }}>
          Source, freshness and quality indicators for prediction inputs
        </p>
      </div>

      {/* Source banner */}
      <div
        className="flex items-start gap-3 px-4 py-4 rounded-md"
        style={{
          background: isDemo ? '#FEF9E5' : '#DEFBE6',
          border: `1px solid ${isDemo ? '#F1C21B' : '#A7F0BA'}`,
        }}
        role="status"
        aria-live="polite"
      >
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: isDemo ? '#F1C21B' : '#198038' }}
          aria-hidden="true"
        />
        <div>
          <div className="text-[14px] font-semibold" style={{ color: isDemo ? '#8E6A00' : '#198038' }}>
            {isDemo ? 'Demo Data Active' : 'Live ML Predictions Active'}
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: isDemo ? '#8E6A00' : '#198038', opacity: 0.8 }}>
            {isDemo
              ? 'All predictions use seeded demonstration data (model_mode = "demo"). The CatBoost model is loaded and operational, but existing scored records were generated using demo/baseline scoring. Displayed figures are for demonstration only.'
              : 'Live CatBoost model is scoring real PAIMANA project data. Predictions reflect actual risk indicators sourced from ministry MIS exports.'}
          </p>
        </div>
      </div>

      {/* Sync details */}
      <div className="card">
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: '#161616' }}>
          Ingestion Status
        </h2>
        <dl>
          {[
            { label: 'Last successful sync',  value: lastSync,  accent: undefined },
            { label: 'Model status',          value: data?.model_loaded ? `✓ CatBoost loaded — v${data.model_version ?? 'catboost_v3'}` : '⚠ Model not loaded (demo mode)', accent: data?.model_loaded ? '#198038' : '#B45309' },
            { label: 'Feature count',         value: data?.feature_count != null ? `${data.feature_count} features` : '—', accent: undefined },
            { label: 'Data source',           value: isDemo ? 'Synthetic (demo seed)' : 'Live PAIMANA export', accent: undefined },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 py-2.5 border-b last:border-0"
              style={{ borderColor: '#E0E4E8' }}
            >
              <dt className="text-[13px]" style={{ color: '#525252' }}>{label}</dt>
              <dd className="text-[13px] font-medium text-right" style={{ color: accent ?? '#161616' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Quality flags */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: '#E0E4E8' }}>
          <h2 className="text-[15px] font-semibold" style={{ color: '#161616' }}>
            Data Quality Flags
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: '#697077' }}>
            Projects with missing or inconsistent snapshot fields
          </p>
        </div>
        {!data?.data_quality_flags.length ? (
          <div className="empty-state py-10">
            <div className="text-[14px] font-medium" style={{ color: '#198038' }}>
              ✓ No quality issues
            </div>
            <p className="text-[13px] mt-1" style={{ color: '#697077' }}>
              All projects meet data completeness requirements for this period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="data-table"
              style={{ minWidth: '480px' }}
              aria-label="Data quality flags"
            >
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Reporting Month</th>
                  <th scope="col">Issue</th>
                </tr>
              </thead>
              <tbody>
                {data.data_quality_flags.map((f, i) => (
                  <tr key={i}>
                    <td>
                      <Link
                        to={`/projects/${f.project_id}`}
                        className="text-[13px] font-medium"
                        style={{ color: '#0F62FE' }}
                      >
                        {f.project_id}
                      </Link>
                    </td>
                    <td className="text-[13px]" style={{ color: '#525252' }}>{f.report_month}</td>
                    <td className="text-[13px]" style={{ color: '#8E6A00' }}>{f.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
