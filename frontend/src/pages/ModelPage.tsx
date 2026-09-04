// src/pages/ModelPage.tsx
// Model Performance — status, metrics, activation guide

import React, { useEffect, useState } from 'react'
import { getModelPerformance, type ModelPerformanceData } from '../api/dashboard'
import { usePageTitle } from '../hooks/usePageTitle'

function Metric({ label, value, note }: { label: string; value?: string | number | null; note?: string }) {
  const hasValue = value != null && value !== ''
  return (
    <div className="card-sm">
      <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#697077' }}>
        {label}
      </div>
      <div className="metric-value" style={!hasValue ? { color: '#C1C7CD' } : {}}>
        {hasValue ? value : '—'}
      </div>
      {note && (
        <div className="text-[12px] mt-1" style={{ color: '#8D8D8D' }}>{note}</div>
      )}
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
          Model Performance
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#525252' }}>
          XGBoost prediction model metrics — from{' '}
          <code className="text-[12px] px-1 py-0.5 rounded font-mono" style={{ background: '#F3F5F7', color: '#525252' }}>
            ml/artifacts/model_run_metrics.json
          </code>
        </p>
      </div>

      {/* Model status */}
      <div className="card flex items-center gap-4" role="status">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: loaded ? '#198038' : '#F1C21B' }}
          aria-hidden="true"
        />
        <div>
          <div className="text-[14px] font-semibold" style={{ color: '#161616' }}>
            {loaded
              ? `Model loaded — version ${data?.model_version ?? 'unknown'}`
              : 'No model loaded — running in demo / baseline mode'}
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: '#697077' }}>
            {loaded
              ? `${data?.feature_count ?? '?'} features · ${data?.temporal_validation ? 'Temporal hold-out validation' : 'Standard validation'}`
              : 'Drop trained artifacts into ml/artifacts/ and restart the backend to activate live predictions.'}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Model performance metrics">
        <Metric
          label="Cost Model AUC-ROC"
          value={data?.cost_model_auc != null ? `${(data.cost_model_auc * 100).toFixed(1)}%` : null}
          note="Temporal test set"
        />
        <Metric
          label="Delay Model AUC-ROC"
          value={data?.delay_model_auc != null ? `${(data.delay_model_auc * 100).toFixed(1)}%` : null}
          note="Temporal test set"
        />
        <Metric label="Train Rows" value={data?.trained_on_rows ?? null} note="Training set size" />
        <Metric
          label="Test Rows"
          value={data?.tested_on_rows ?? null}
          note={data?.temporal_validation ? 'Temporal hold-out' : 'Held-out set'}
        />
      </div>

      {data?.note && (
        <div
          className="px-4 py-3 rounded-md text-[13px]"
          style={{ background: '#FEF9E5', border: '1px solid #F1C21B', color: '#8E6A00' }}
          role="note"
        >
          {data.note}
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
                step: 'Run the training notebook',
                detail: 'Open ml/train.ipynb in Google Colab and execute all cells. The notebook trains XGBoost models on PAIMANA project data.',
              },
              {
                step: 'Download the four artifacts',
                detail: 'cost_model.pkl · delay_model.pkl · feature_columns.json · model_run_metrics.json',
                code: true,
              },
              {
                step: 'Place artifacts in ml/artifacts/',
                detail: 'Create the directory at the project root if it does not exist.',
              },
              {
                step: 'Restart the backend',
                detail: 'The FastAPI server auto-loads models on startup. The "Demo Data" badge will change to "Live".',
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
