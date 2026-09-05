// src/components/ProvenanceBadge.tsx
// Shows Live ML / Demo Mode badge in the top navbar.
// Uses only inline styles — no Tailwind dependency.

import React, { useEffect, useState } from 'react'
import { getProvenance, type ProvenanceData } from '../api/dashboard'

export default function ProvenanceBadge() {
  const [data, setData] = useState<ProvenanceData | null>(null)

  useEffect(() => {
    getProvenance().then(setData).catch(() => {})
  }, [])

  if (!data) return null

  const isDemo = data.source === 'demo'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {/* Badge pill */}
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600,
          padding: '4px 9px', borderRadius: 20,
          background: isDemo ? '#FFF8E1' : '#DEFBE6',
          color: isDemo ? '#8E6A00' : '#198038',
          border: `1px solid ${isDemo ? '#F1C21B' : '#24A148'}`,
          whiteSpace: 'nowrap', flexShrink: 0,
          fontFamily: "'Inter', sans-serif",
        }}
        title={isDemo
          ? 'No ML model loaded — predictions use baseline heuristics'
          : 'CatBoost ML model loaded — live scoring active'}
      >
        <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
          backgroundColor: isDemo ? '#F1C21B' : '#198038',
          flexShrink: 0,
        }} />
        {isDemo ? 'Demo' : 'Live ML'}
      </span>

      {/* Timestamp — hidden on narrow screens via CSS class */}
      {data.last_sync && (
        <span
          className="provenance-label"
          style={{ fontSize: 11, color: '#8D8D8D', whiteSpace: 'nowrap' }}
        >
          {new Date(data.last_sync).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      )}
    </div>
  )
}
