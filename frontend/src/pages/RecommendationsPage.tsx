// src/pages/RecommendationsPage.tsx
// "Recommended Projects" tab — senior_official / admin only.
// Shows all projects ranked by continuation suitability (lowest risk first).

import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecommendations, type RecommendationItem } from '../api/projects'
import RiskBadge from '../components/RiskBadge'
import { usePageTitle } from '../hooks/usePageTitle'
import { colors } from '../theme/tokens'

// ── Helpers ───────────────────────────────────────────────────────────────────
type SortKey = keyof RecommendationItem
type SortDir = 'asc' | 'desc'

function fmt(n: number) { return (n * 100).toFixed(0) + '%' }
// original_cost is stored in Crores in the DB — match ProjectDetailPage formatting
function fmtBudget(n: number | null) {
  if (n == null) return '—'
  if (n === 0) return '₹0 Cr'
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Cr'
}

const SECTOR_OPTIONS = ['', 'Railways', 'Roads', 'Power', 'Irrigation', 'Urban', 'Telecom', 'Health']
const MINISTRY_OPTIONS = ['', 'MoRTH', 'MoR', 'MoP', 'MoJal', 'MoHUA', 'MoT', 'MoH']

// Arrow indicator for sort direction
function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.25, marginLeft: 4 }}>↕</span>
  return <span style={{ marginLeft: 4, color: '#0F62FE' }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RecommendationsPage() {
  usePageTitle('Recommendations')

  const navigate = useNavigate()
  const [data,    setData]    = useState<RecommendationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [sector,  setSector]  = useState('')
  const [ministry,setMinistry]= useState('')
  const [sortKey, setSortKey] = useState<SortKey>('overall_risk')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function load() {
    setLoading(true)
    setError(null)
    getRecommendations({ sector: sector || undefined, ministry: ministry || undefined })
      .then(setData)
      .catch(() => setError('Failed to load recommendations. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [sector, ministry]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side sort (dataset is small — no refetch needed)
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Top 5 "Recommended" pill — only when sorted by overall_risk asc
  const showPills = sortKey === 'overall_risk' && sortDir === 'asc'

  // ── Column definitions ──────────────────────────────────────────────────────
  const cols: { key: SortKey; label: string; align?: 'right' | 'left' }[] = [
    { key: 'name',                    label: 'Project Name' },
    { key: 'sector',                  label: 'Sector' },
    { key: 'ministry',                label: 'Ministry' },
    { key: 'overall_risk',            label: 'Overall Risk',       align: 'right' },
    { key: 'cost_risk',               label: 'Cost Risk',          align: 'right' },
    { key: 'delay_risk',              label: 'Delay Risk',         align: 'right' },
    { key: 'original_cost',           label: 'Budget',             align: 'right' },
    { key: 'continuation_suitability',label: 'Suitability',        align: 'right' },
    { key: 'top_reason',              label: 'Key Insight' },
  ]

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-semibold" style={{ fontSize: 22, color: '#102A43', letterSpacing: '-0.015em' }}>
            Recommended Projects
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#525252' }}>
            {loading
              ? 'Loading…'
              : `${sorted.length} project${sorted.length !== 1 ? 's' : ''} ranked by continuation suitability — lowest risk first`}
          </p>
        </div>

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="rec-sector" className="sr-only">Filter by sector</label>
          <select id="rec-sector" value={sector} onChange={e => setSector(e.target.value)} className="select">
            <option value="">All sectors</option>
            {SECTOR_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label htmlFor="rec-ministry" className="sr-only">Filter by ministry</label>
          <select id="rec-ministry" value={ministry} onChange={e => setMinistry(e.target.value)} className="select">
            <option value="">All ministries</option>
            {MINISTRY_OPTIONS.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {(sector || ministry) && (
            <button onClick={() => { setSector(''); setMinistry('') }} className="btn-ghost py-1.5">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-md text-[12px]"
        style={{ background: colors.risk.low.bg, border: `1px solid ${colors.risk.low.border}`, color: colors.risk.low.text }}
      >
        <span style={{ fontWeight: 600 }}>How to read this table:</span>
        <span>
          Continuation Suitability = (1 − Overall Risk) × 100. Higher = safer bet.
          Top 5 rows <span style={{ fontWeight: 600 }}>when sorted by risk ↑</span> are marked
          <span
            style={{
              marginLeft: 4, marginRight: 4,
              background: colors.risk.low.bg, border: `1px solid ${colors.risk.low.border}`,
              color: colors.risk.low.text, fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 4,
            }}
          >Recommended</span>
          as best funding candidates.
        </span>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-md"
          style={{ background: '#FFF0F1', border: '1px solid #FF8389' }}
          role="alert"
        >
          <p className="text-[13px]" style={{ color: '#DA1E28' }}>{error}</p>
          <button className="btn-action flex-shrink-0" onClick={load} style={{ borderColor: '#FF8389', color: '#DA1E28' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" style={{ minWidth: 960 }} aria-label="Recommended projects table" aria-busy={loading}>
            <thead>
              <tr>
                {/* Rank column */}
                <th scope="col" style={{ width: 48, textAlign: 'center' }}>#</th>
                {cols.map(col => (
                  <th
                    key={String(col.key)}
                    scope="col"
                    className={col.align === 'right' ? 'text-right' : ''}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => toggleSort(col.key)}
                    title={`Sort by ${col.label}`}
                  >
                    {col.label}
                    <SortArrow active={sortKey === col.key} dir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    <td colSpan={cols.length + 1} style={{ paddingTop: 16, paddingBottom: 16 }}>
                      <div className="skeleton h-4 rounded" style={{ width: `${40 + (i % 4) * 12}%` }} />
                    </td>
                  </tr>
                ))
              ) : sorted.length === 0 && !error ? (
                <tr>
                  <td colSpan={cols.length + 1}>
                    <div className="empty-state py-12">
                      <p className="text-[14px] font-medium" style={{ color: '#161616' }}>No projects found</p>
                      <p className="text-[13px] mt-1" style={{ color: '#697077' }}>
                        {sector || ministry ? 'Try clearing the filters.' : 'No project data available.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((proj, idx) => {
                  const isTop5 = showPills && idx < 5
                  const rowBg  = isTop5 ? colors.risk.low.bg : undefined

                  return (
                    <tr
                      key={proj.project_id}
                      style={{ cursor: 'pointer', background: rowBg, transition: 'background 120ms' }}
                      onClick={() => navigate(`/projects/${proj.project_id}`)}
                      onMouseEnter={e => { if (!isTop5) (e.currentTarget as HTMLElement).style.background = '#F3F5F7' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg ?? '' }}
                    >
                      {/* Rank */}
                      <td style={{ textAlign: 'center', color: '#8D8D8D', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                        {idx + 1}
                      </td>

                      {/* Project Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="font-medium" style={{ color: '#0F62FE', fontSize: 13 }}>
                            {proj.name}
                          </span>
                          {isTop5 && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                              padding: '1px 6px', borderRadius: 4,
                              background: colors.risk.low.bg,
                              border: `1px solid ${colors.risk.low.border}`,
                              color: colors.risk.low.text,
                              whiteSpace: 'nowrap',
                            }}>
                              ✓ Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] mt-0.5 font-mono" style={{ color: '#8D8D8D' }}>
                          {proj.project_id}
                        </div>
                      </td>

                      {/* Sector */}
                      <td style={{ fontSize: 13, color: '#525252' }}>{proj.sector ?? '—'}</td>

                      {/* Ministry */}
                      <td style={{ fontSize: 13, color: '#525252' }}>{proj.ministry ?? '—'}</td>

                      {/* Overall Risk */}
                      <td className="text-right">
                        <RiskBadge risk={proj.overall_risk} size="sm" showValue />
                      </td>

                      {/* Cost Risk */}
                      <td className="text-right tabular font-medium" style={{ color: '#161616', fontSize: 13 }}>
                        {fmt(proj.cost_risk)}
                      </td>

                      {/* Delay Risk */}
                      <td className="text-right tabular font-medium" style={{ color: '#161616', fontSize: 13 }}>
                        {fmt(proj.delay_risk)}
                      </td>

                      {/* Budget */}
                      <td className="text-right tabular" style={{ color: '#525252', fontSize: 13 }}>
                        {fmtBudget(proj.original_cost)}
                      </td>

                      {/* Continuation Suitability */}
                      <td className="text-right">
                        <span style={{
                          fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                          color: proj.continuation_suitability >= 60
                            ? colors.risk.low.text
                            : proj.continuation_suitability >= 40
                              ? colors.risk.medium.text
                              : colors.risk.high.text,
                        }}>
                          {proj.continuation_suitability}
                        </span>
                        <span style={{ fontSize: 11, color: '#8D8D8D' }}>/100</span>
                      </td>

                      {/* Key Insight */}
                      <td style={{ fontSize: 12, color: '#525252', maxWidth: 280 }}>
                        {proj.top_reason}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        {!loading && sorted.length > 0 && (
          <div
            className="px-4 py-2 border-t text-[11px]"
            style={{ borderColor: '#E0E4E8', color: '#8D8D8D' }}
          >
            Suitability score = (1 − Overall Risk) × 100. Click any row to view full project detail and SHAP drivers.
          </div>
        )}
      </div>
    </div>
  )
}
