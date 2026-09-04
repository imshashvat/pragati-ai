// src/pages/ModelPage.tsx
// Model Performance — CatBoost schedule delay model metrics, status, and activation guide

import React, { useEffect, useState } from 'react'
import { getModelPerformance, type ModelPerformanceData } from '../api/dashboard'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Metric card ──────────────────────────────────────────────────────────────
function Metric({ label, value, note, accent }: {
  label: string
  value?: string | number | null
  note?: string
  accent?: string
}) {
  const hasValue = value != null && value !== ''
  return (
    <div className="card-sm">
      <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#697077' }}>
        {label}
      </div>
      <div className="metric-value" style={{ color: hasValue ? (accent ?? '#161616') : '#C1C7CD' }}>
        {hasValue ? value : '—'}
      </div>
      {note && (
        <div className="text-[12px] mt-1" style={{ color: '#8D8D8D' }}>{note}</div>
      )}
    </div>
  )
}

// ── Feature importance row ────────────────────────────────────────────────────
function DriverRow({ rank, label, importance, max }: {
  rank: number
  label: string
  importance: number
  max: number
}) {
  const pct = max > 0 ? (importance / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #E0E4E8' }}>
      <span style={{
        fontSize: '11px', fontWeight: 600, color: '#0F62FE',
        minWidth: '18px', flexShrink: 0,
      }}>
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: '#161616', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
        <div style={{ height: '4px', background: '#F3F5F7', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: '99px',
            background: 'linear-gradient(90deg, #0F62FE, #0050E6)',
            transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
      </div>
      <span style={{
        fontSize: '12px', color: '#525252', fontVariantNumeric: 'tabular-nums',
        fontWeight: 500, flexShrink: 0,
      }}>
        {importance.toFixed(1)}
      </span>
    </div>
  )
}

export default function ModelPage() {
  usePageTitle('Model Performance')

  const [data,    setData]    = useState<ModelPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    getModelPerformance()
      .then(setData)
      .catch(() => setError('Could not load model metrics. The backend may be unavailable.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading model performance data">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-20 rounded-md" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-md" />)}
        </div>
        <div className="skeleton h-48 rounded-md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
            Model Performance
          </h1>
        </div>
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

  const loaded = data?.model_loaded ?? false

  // Extract CatBoost-specific metrics
  const valMae   = (data as any)?.val_mae_days
  const valRmse  = (data as any)?.val_rmse_days
  const valR2    = (data as any)?.val_r2
  const testMae  = (data as any)?.test_mae_days
  const testR2   = (data as any)?.test_r2
  const featureImportance: Array<{ feature: string; label: string; importance: number; rank: number }> =
    (data as any)?.feature_importance ?? []
  const maxImportance = featureImportance.length > 0
    ? Math.max(...featureImportance.map(f => f.importance))
    : 1

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
          Model Performance
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#525252' }}>
          CatBoost schedule delay prediction model — metrics sourced from{' '}
          <code className="text-[12px] px-1 py-0.5 rounded font-mono" style={{ background: '#F3F5F7', color: '#525252' }}>
            ml/artifacts/model_run_metrics.json
          </code>
        </p>
      </div>

      {/* Model status */}
      <div
        className="card flex items-start gap-4"
        role="status"
        style={{
          border: loaded ? '1px solid #A7F0BA' : '1px solid #F1C21B',
          background: loaded ? '#DEFBE6' : '#FEF9E5',
        }}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: loaded ? '#198038' : '#F1C21B' }}
          aria-hidden="true"
        />
        <div>
          <div className="text-[14px] font-semibold" style={{ color: loaded ? '#198038' : '#8E6A00' }}>
            {loaded
              ? `✓ CatBoostRegressor loaded — version ${data?.model_version ?? 'catboost_schedule_delay_v3'}`
              : '⚠ No model loaded — running in demo / baseline mode'}
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: loaded ? '#198038' : '#8E6A00', opacity: 0.8 }}>
            {loaded
              ? `${data?.feature_count ?? 61} features · 12 categorical · signed_log transform · Target: schedule delay (days, clipped 0–365)`
              : 'Drop trained CatBoost artifacts into ml/artifacts/ and restart the backend to activate live predictions.'}
          </div>
        </div>
      </div>

      {/* CatBoost Metrics Grid */}
      {loaded && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="CatBoost model performance metrics">
          <Metric
            label="Val MAE"
            value={valMae != null && valMae > 0 ? `${valMae.toFixed(1)} days` : null}
            note="Validation set"
          />
          <Metric
            label="Val R²"
            value={valR2 != null && valR2 !== 0 ? valR2.toFixed(4) : null}
            note="Validation set"
            accent={valR2 > 0.7 ? '#198038' : valR2 > 0.5 ? '#B45309' : '#DA1E28'}
          />
          <Metric
            label="Test MAE"
            value={testMae != null && testMae > 0 ? `${testMae.toFixed(1)} days` : null}
            note="Hold-out test set"
          />
          <Metric
            label="Test R²"
            value={testR2 != null && testR2 !== 0 ? testR2.toFixed(4) : null}
            note="Hold-out test set"
            accent={testR2 > 0.7 ? '#198038' : testR2 > 0.5 ? '#B45309' : undefined}
          />
        </div>
      )}

      {/* When not loaded — basic info grid */}
      {!loaded && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Model configuration">
          <Metric label="Features" value={data?.feature_count ?? 61} note="Input dimensions" />
          <Metric label="Model Type" value="CatBoostRegressor" note="Gradient boosting" />
          <Metric label="Target Transform" value="signed_log" note="Inverse: sign(x)·expm1(|x|)" />
          <Metric label="Output Clamp" value="0 – 365 days" note="Schedule delay range" />
        </div>
      )}

      {/* Note from backend */}
      {(data as any)?.note && (
        <div
          className="px-4 py-3 rounded-md text-[13px]"
          style={{ background: '#FEF9E5', border: '1px solid #F1C21B', color: '#8E6A00' }}
          role="note"
        >
          {(data as any).note}
        </div>
      )}

      {/* Feature importance */}
      {loaded && featureImportance.length > 0 && (
        <div className="card">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold" style={{ color: '#161616' }}>
              Top Feature Importance
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#697077' }}>
              CatBoost native feature importance (PredictionValuesChange), top 5 drivers
            </p>
          </div>
          <div>
            {featureImportance.slice(0, 5).map(f => (
              <DriverRow
                key={f.feature}
                rank={f.rank}
                label={f.label ?? f.feature}
                importance={f.importance}
                max={maxImportance}
              />
            ))}
          </div>
        </div>
      )}

      {/* Activation guide — only when no model loaded */}
      {!loaded && (
        <div className="card">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: '#161616' }}>
            How to Activate Live Predictions
          </h2>
          <ol className="space-y-4" aria-label="Activation steps">
            {[
              {
                step: 'Run the CatBoost training notebook',
                detail: 'Open ml/train.ipynb in Google Colab. The notebook trains Model 3 (CatBoostRegressor) on PAIMANA schedule delay data.',
              },
              {
                step: 'Download the three artifacts',
                detail: 'model_3_schedule_delay.cbm · model_3_schedule_config.pkl · model_run_metrics.json',
                code: true,
              },
              {
                step: 'Place artifacts in ml/artifacts/',
                detail: 'Create the directory at the project root if it does not exist. The .cbm binary model file should be in this directory.',
              },
              {
                step: 'Restart the backend',
                detail: 'The FastAPI server auto-loads the CatBoost model on startup. The "Demo Data" badge in the topbar will update to "Live".',
              },
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
                  style={{ background: '#EDF5FF', color: '#0F62FE', minWidth: '24px' }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div>
                  <div className="text-[14px] font-medium" style={{ color: '#161616' }}>{item.step}</div>
                  <div
                    className={`text-[13px] mt-0.5 ${item.code ? 'font-mono break-all' : ''}`}
                    style={{ color: '#525252' }}
                  >
                    {item.detail}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
