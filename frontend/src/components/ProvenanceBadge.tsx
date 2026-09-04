// src/components/ProvenanceBadge.tsx
// Quiet, informational — warns about demo data without shouting

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
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded ${isDemo ? 'prov-demo text-[#8E6A00]' : 'prov-live text-[#198038]'}`}
        title={isDemo
          ? 'Using synthetic demo data — not real ML predictions'
          : 'Live ML model active'}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: isDemo ? '#F1C21B' : '#198038' }}
        />
        {isDemo ? 'Demo Data' : 'Live'}
      </span>
      {data.last_sync && (
        <span className="hidden sm:block text-[12px]" style={{ color: '#8D8D8D' }}>
          {new Date(data.last_sync).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      )}
    </div>
  )
}
