// IndiaMapSection.tsx — PAIMANA-style India map
// Stats LEFT  |  SVG Map RIGHT
// Hover to update stats; last-hovered state persists after mouse leaves map

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  INDIA_STATES,
  MAP_HEIGHT,
  MAP_WIDTH,
  type StateShape,
} from '../data/india-states'

type RiskBand = 'critical' | 'high' | 'moderate' | 'stable'

const BAND_HEX: Record<RiskBand, string> = {
  critical: '#c0392b', high: '#e07020', moderate: '#d4a017', stable: '#2e7d4f',
}
const BAND_LABEL: Record<RiskBand, string> = {
  critical: 'Critical', high: 'High', moderate: 'Moderate', stable: 'Stable',
}

// ── Inline SVG icons (no broken image references) ─────────────────────────────
function IconProject() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#EEF3FB"/>
      <path d="M9 23V14l7-5 7 5v9H19v-5h-6v5H9Z" fill="#1a237e" fillOpacity="0.18" stroke="#1a237e" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M13 23v-4h6v4" stroke="#1a237e" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
function IconCost() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#FEF9EC"/>
      <circle cx="16" cy="16" r="7" fill="#d4a017" fillOpacity="0.18" stroke="#d4a017" strokeWidth="1.4"/>
      <path d="M13.5 18.5c0 1.1.9 2 2.5 2s2.5-.9 2.5-2-1.1-2-2.5-2-2.5-.9-2.5-2 .9-2 2.5-2 2.5.9 2.5 2" stroke="#d4a017" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M16 11.5v1M16 19.5v1" stroke="#d4a017" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function IconExpenditure() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#E8F6EE"/>
      <rect x="8" y="20" width="4" height="4" rx="1" fill="#2e7d4f" fillOpacity="0.2" stroke="#2e7d4f" strokeWidth="1.2"/>
      <rect x="14" y="15" width="4" height="9" rx="1" fill="#2e7d4f" fillOpacity="0.2" stroke="#2e7d4f" strokeWidth="1.2"/>
      <rect x="20" y="10" width="4" height="14" rx="1" fill="#2e7d4f" fillOpacity="0.2" stroke="#2e7d4f" strokeWidth="1.2"/>
    </svg>
  )
}
function IconCompleted() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#F0F7FF"/>
      <rect x="9" y="8" width="14" height="16" rx="2" stroke="#0f62fe" strokeWidth="1.4"/>
      <path d="M12 8V7M20 8V7" stroke="#0f62fe" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M12 16l2.5 2.5 5.5-5" stroke="#0f62fe" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconNew() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#FDF0F0"/>
      <circle cx="16" cy="16" r="7" stroke="#c0392b" strokeWidth="1.4"/>
      <path d="M16 12v8M12 16h8" stroke="#c0392b" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function IconRevised() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#FFF3E8"/>
      <path d="M10 22V10l6-2 6 2v12l-6 2-6-2Z" stroke="#e07020" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M16 8v16" stroke="#e07020" strokeWidth="1.2" strokeDasharray="2 2"/>
    </svg>
  )
}

// ── State data ─────────────────────────────────────────────────────────────────
interface StateInfo {
  name: string
  projectCount: number
  originalCostCr: number
  revisedCostCr: number
  expenditureCr: number
  completedMonth: number
  newlyAdded: number
  band: RiskBand
}

const STATE_INFO: Record<string, StateInfo> = {
  'Jammu & Kashmir':   { name:'Jammu & Kashmir',   projectCount:34,  originalCostCr:112300,  revisedCostCr:134500,  expenditureCr:98400,   completedMonth:0, newlyAdded:1,  band:'moderate' },
  'Ladakh':            { name:'Ladakh',             projectCount:18,  originalCostCr:68200,   revisedCostCr:72400,   expenditureCr:54100,   completedMonth:0, newlyAdded:0,  band:'stable'   },
  'Himachal Pradesh':  { name:'Himachal Pradesh',   projectCount:28,  originalCostCr:89300,   revisedCostCr:102400,  expenditureCr:78900,   completedMonth:0, newlyAdded:0,  band:'stable'   },
  'Punjab':            { name:'Punjab',             projectCount:53,  originalCostCr:170769,  revisedCostCr:120178,  expenditureCr:118033,  completedMonth:0, newlyAdded:0,  band:'moderate' },
  'Haryana':           { name:'Haryana',            projectCount:48,  originalCostCr:145320,  revisedCostCr:198440,  expenditureCr:111220,  completedMonth:1, newlyAdded:2,  band:'high'     },
  'Delhi':             { name:'Delhi',              projectCount:61,  originalCostCr:234500,  revisedCostCr:278300,  expenditureCr:212100,  completedMonth:2, newlyAdded:3,  band:'high'     },
  'Uttarakhand':       { name:'Uttarakhand',        projectCount:31,  originalCostCr:98400,   revisedCostCr:112300,  expenditureCr:87600,   completedMonth:0, newlyAdded:1,  band:'stable'   },
  'Uttar Pradesh':     { name:'Uttar Pradesh',      projectCount:182, originalCostCr:563100,  revisedCostCr:682540,  expenditureCr:412330,  completedMonth:3, newlyAdded:5,  band:'critical' },
  'Rajasthan':         { name:'Rajasthan',          projectCount:99,  originalCostCr:320450,  revisedCostCr:389120,  expenditureCr:256780,  completedMonth:2, newlyAdded:3,  band:'high'     },
  'Gujarat':           { name:'Gujarat',            projectCount:99,  originalCostCr:463616,  revisedCostCr:503176,  expenditureCr:418592,  completedMonth:0, newlyAdded:0,  band:'high'     },
  'Madhya Pradesh':    { name:'Madhya Pradesh',     projectCount:76,  originalCostCr:234560,  revisedCostCr:278900,  expenditureCr:198340,  completedMonth:1, newlyAdded:2,  band:'moderate' },
  'Chhattisgarh':      { name:'Chhattisgarh',       projectCount:42,  originalCostCr:134600,  revisedCostCr:156900,  expenditureCr:118200,  completedMonth:1, newlyAdded:1,  band:'stable'   },
  'Bihar':             { name:'Bihar',              projectCount:67,  originalCostCr:212500,  revisedCostCr:256800,  expenditureCr:189300,  completedMonth:2, newlyAdded:3,  band:'high'     },
  'Jharkhand':         { name:'Jharkhand',          projectCount:38,  originalCostCr:123400,  revisedCostCr:145600,  expenditureCr:108900,  completedMonth:0, newlyAdded:1,  band:'stable'   },
  'West Bengal':       { name:'West Bengal',        projectCount:71,  originalCostCr:256800,  revisedCostCr:298400,  expenditureCr:223100,  completedMonth:1, newlyAdded:2,  band:'moderate' },
  'Sikkim':            { name:'Sikkim',             projectCount:9,   originalCostCr:28400,   revisedCostCr:31200,   expenditureCr:24800,   completedMonth:0, newlyAdded:0,  band:'stable'   },
  'Odisha':            { name:'Odisha',             projectCount:45,  originalCostCr:156200,  revisedCostCr:178300,  expenditureCr:134500,  completedMonth:1, newlyAdded:2,  band:'stable'   },
  'Arunachal Pradesh': { name:'Arunachal Pradesh',  projectCount:22,  originalCostCr:78500,   revisedCostCr:88200,   expenditureCr:64300,   completedMonth:0, newlyAdded:1,  band:'stable'   },
  'Assam':             { name:'Assam',              projectCount:46,  originalCostCr:156700,  revisedCostCr:178900,  expenditureCr:134500,  completedMonth:1, newlyAdded:2,  band:'moderate' },
  'Meghalaya':         { name:'Meghalaya',          projectCount:14,  originalCostCr:45300,   revisedCostCr:51200,   expenditureCr:38900,   completedMonth:0, newlyAdded:0,  band:'stable'   },
  'Nagaland':          { name:'Nagaland',           projectCount:11,  originalCostCr:35600,   revisedCostCr:40200,   expenditureCr:29800,   completedMonth:0, newlyAdded:0,  band:'stable'   },
  'Manipur':           { name:'Manipur',            projectCount:16,  originalCostCr:52400,   revisedCostCr:60100,   expenditureCr:44700,   completedMonth:0, newlyAdded:1,  band:'moderate' },
  'Mizoram':           { name:'Mizoram',            projectCount:12,  originalCostCr:38900,   revisedCostCr:44500,   expenditureCr:32400,   completedMonth:0, newlyAdded:0,  band:'stable'   },
  'Tripura':           { name:'Tripura',            projectCount:15,  originalCostCr:48700,   revisedCostCr:54300,   expenditureCr:41200,   completedMonth:0, newlyAdded:0,  band:'stable'   },
  'Maharashtra':       { name:'Maharashtra',        projectCount:137, originalCostCr:512340,  revisedCostCr:621450,  expenditureCr:488900,  completedMonth:4, newlyAdded:7,  band:'critical' },
  'Telangana':         { name:'Telangana',          projectCount:58,  originalCostCr:198300,  revisedCostCr:234100,  expenditureCr:176500,  completedMonth:2, newlyAdded:1,  band:'moderate' },
  'Andhra Pradesh':    { name:'Andhra Pradesh',     projectCount:64,  originalCostCr:218700,  revisedCostCr:255400,  expenditureCr:187200,  completedMonth:2, newlyAdded:1,  band:'moderate' },
  'Karnataka':         { name:'Karnataka',          projectCount:83,  originalCostCr:312400,  revisedCostCr:356800,  expenditureCr:289300,  completedMonth:2, newlyAdded:3,  band:'high'     },
  'Goa':               { name:'Goa',               projectCount:8,   originalCostCr:26800,   revisedCostCr:29400,   expenditureCr:22600,   completedMonth:0, newlyAdded:0,  band:'stable'   },
  'Kerala':            { name:'Kerala',             projectCount:39,  originalCostCr:145600,  revisedCostCr:167800,  expenditureCr:131200,  completedMonth:1, newlyAdded:2,  band:'stable'   },
  'Tamil Nadu':        { name:'Tamil Nadu',         projectCount:91,  originalCostCr:345600,  revisedCostCr:378200,  expenditureCr:312100,  completedMonth:3, newlyAdded:4,  band:'high'     },
}

const ALIASES: Record<string, string> = {
  'Orissa': 'Odisha', 'Uttaranchal': 'Uttarakhand',
  'Jammu and Kashmir': 'Jammu & Kashmir',
  'Andaman and Nicobar': 'Andaman & Nicobar',
}
function canonical(name: string) { return ALIASES[name] ?? name }

function inrCr(v: number) {
  return `₹ ${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const MAX_COUNT = Math.max(...Object.values(STATE_INFO).map(s => s.projectCount))
const MIN_ZOOM = 1, MAX_ZOOM = 8

function heatColor(count: number, isHov: boolean): string {
  const t = count / MAX_COUNT
  const r = Math.round(253 + (139 - 253) * t)
  const g = Math.round(232 + (26  - 232) * t)
  const b = Math.round(216 + (14  - 216) * t)
  const a = isHov ? 1 : 0.92
  return `rgba(${r},${g},${b},${a})`
}

// ── Info tooltip ───────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="msw-info-btn"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      aria-label="More information"
    >
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#0f62fe" strokeWidth="1.5"/><path d="M10 9v5M10 7h.01" stroke="#0f62fe" strokeWidth="1.5" strokeLinecap="round"/></svg>
      {open && <span className="msw-tip-box">{text}</span>}
    </span>
  )
}

// ── Stat row ───────────────────────────────────────────────────────────────────
function StatRow({ icon, label, value, tip }: { icon: React.ReactNode; label: string; value: string | number; tip: string }) {
  return (
    <div className="msw-stat-row">
      <div className="msw-stat-icon-wrap">{icon}</div>
      <div className="msw-stat-body">
        <div className="msw-stat-label">
          {label} <InfoTip text={tip} />
        </div>
        <div className="msw-stat-val">{value}</div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
const DEFAULT_STATE = 'Maharashtra'

export default function IndiaMapSection() {
  const [hovered, setHovered] = useState<string>(DEFAULT_STATE)
  const [zoom, setZoom]       = useState(1)
  const [offset, setOffset]   = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const active = STATE_INFO[hovered] ?? STATE_INFO[DEFAULT_STATE]

  const shapeByName = useMemo(() => {
    const m = new Map<string, StateShape>()
    for (const s of INDIA_STATES) m.set(canonical(s.name), s)
    return m
  }, [])

  // Zoom/pan
  const clampOffset = useCallback((o: { x: number; y: number }, z: number) => ({
    x: Math.min(Math.max(o.x, 0), MAP_WIDTH  - MAP_WIDTH  / z),
    y: Math.min(Math.max(o.y, 0), MAP_HEIGHT - MAP_HEIGHT / z),
  }), [])

  const zoomAt = useCallback((next: number, fx: number, fy: number) => {
    setZoom(z => {
      const nz = Math.min(Math.max(next, MIN_ZOOM), MAX_ZOOM)
      setOffset(o => {
        const px = o.x + (MAP_WIDTH / z) * fx
        const py = o.y + (MAP_HEIGHT / z) * fy
        return clampOffset({ x: px - (MAP_WIDTH / nz) * fx, y: py - (MAP_HEIGHT / nz) * fy }, nz)
      })
      return nz
    })
  }, [clampOffset])

  const wheelRef = useRef(zoomAt); wheelRef.current = zoomAt
  const zoomRef  = useRef(zoom);   zoomRef.current  = zoom

  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1)
      const r  = el.getBoundingClientRect()
      wheelRef.current(zoomRef.current * Math.exp(-dy * 0.0018),
        (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current, el = containerRef.current
    if (!d || !el) return
    const r = el.getBoundingClientRect()
    setOffset(clampOffset({
      x: d.ox - ((e.clientX - d.x) / r.width)  * (MAP_WIDTH  / zoom),
      y: d.oy - ((e.clientY - d.y) / r.height) * (MAP_HEIGHT / zoom),
    }, zoom))
  }
  const onPointerUp = () => { dragRef.current = null }

  const reset = () => { setZoom(1); setOffset({ x: 0, y: 0 }) }
  const labelSize = Math.max(0.85, 2.2 / Math.max(1, zoom * 0.8))

  return (
    <section id="statemap" className="msw-section" aria-labelledby="msw-heading">
      <div className="msw-container">

        {/* Heading */}
        <div className="msw-heading-row">
          <h2 id="msw-heading" className="msw-heading">
            State-wise Projects
            <span className="msw-heading-date"> (as of July, 2026)</span>
          </h2>
          <p className="msw-heading-desc">
            Centrally monitored infrastructure projects of ₹150 Cr. and above — tracked under MoSPI's PAIMANA framework.
            Hover over any state on the map to view its project portfolio summary.
          </p>
        </div>

        {/* Layout: stats LEFT | map RIGHT */}
        <div className="msw-layout">

          {/* ── Stats panel ───────────────────────────────────────────── */}
          <div className="msw-panel">
            <div className="msw-panel-header">
              <span className="msw-panel-state-name">{active.name}</span>
            </div>

            <div className="msw-stats-grid">
              <StatRow
                icon={<IconProject />}
                label="Project Count (No.)"
                value={active.projectCount}
                tip="Total number of central sector projects (₹150 Cr. and above) currently under MoSPI monitoring in this state."
              />
              <StatRow
                icon={<IconCost />}
                label="Original Cost (in Cr.)"
                value={inrCr(active.originalCostCr)}
                tip="Aggregate project cost as originally approved at the time of investment sanction — before any revisions."
              />
              <StatRow
                icon={<IconRevised />}
                label="Latest Revised Cost (in Cr.)"
                value={inrCr(active.revisedCostCr)}
                tip="Latest of all reported revised estimates. Captures cost escalations due to scope changes, price escalation, or delays."
              />
              <StatRow
                icon={<IconExpenditure />}
                label="Expenditure (Cumm.) (in Cr.)"
                value={inrCr(active.expenditureCr)}
                tip="Cumulative actual expenditure incurred from the date of sanction up to the last reported quarter."
              />
              <StatRow
                icon={<IconCompleted />}
                label="Completed During Month (No.)"
                value={active.completedMonth}
                tip="Number of projects reported as fully completed and commissioned during the last reporting month."
              />
              <StatRow
                icon={<IconNew />}
                label="Newly Added (No.)"
                value={active.newlyAdded}
                tip="Projects newly brought under MoSPI's monitoring framework during the last reporting month."
              />
            </div>

            {/* Risk indicator strip */}
            <div
              className="msw-risk-strip"
              style={{
                background: BAND_HEX[active.band] + '18',
                borderTop: `3px solid ${BAND_HEX[active.band]}`,
                color: BAND_HEX[active.band],
              }}
            >
              <span className="msw-risk-dot" style={{ background: BAND_HEX[active.band] }} />
              <strong>{BAND_LABEL[active.band]} Predicted Risk</strong>
              <span className="msw-risk-note">
                — Based on ML risk model scores across {active.projectCount} projects
              </span>
            </div>
          </div>

          {/* ── Map ───────────────────────────────────────────────────── */}
          <div
            ref={containerRef}
            className="msw-map-wrapper"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{ cursor: zoom > 1 ? 'grab' : 'default', touchAction: 'none' }}
          >
            {/* Zoom buttons */}
            <div className="msw-zoom-ctrl">
              <button className="msw-zoom-btn" onClick={() => zoomAt(zoom * 1.5, 0.5, 0.5)} title="Zoom in" aria-label="Zoom in">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <button className="msw-zoom-btn" onClick={() => zoomAt(zoom / 1.5, 0.5, 0.5)} title="Zoom out" aria-label="Zoom out">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <button className="msw-zoom-btn" onClick={reset} title="Reset" aria-label="Reset view">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </button>
            </div>

            {/* SVG India map */}
            <svg
              viewBox={`${offset.x} ${offset.y} ${MAP_WIDTH / zoom} ${MAP_HEIGHT / zoom}`}
              className="msw-svg"
              role="img"
              aria-label="Interactive map of India — hover a state to see project statistics"
            >
              {INDIA_STATES.map(s => {
                const name  = canonical(s.name)
                const info  = STATE_INFO[name]
                const isHov = hovered === name
                return (
                  <g key={s.name}>
                    <path
                      d={s.d}
                      fill={info ? heatColor(info.projectCount, isHov) : '#dce7f0'}
                      stroke={isHov ? '#1a237e' : '#ffffff'}
                      strokeWidth={isHov ? 0.45 : 0.2}
                      style={{ outline: 'none', transition: 'fill 0.15s, stroke 0.1s' }}
                      className={info ? 'msw-state-path' : ''}
                      onMouseEnter={() => { if (info) setHovered(name) }}
                      tabIndex={info ? 0 : -1}
                      role={info ? 'button' : undefined}
                      aria-label={info ? `${name}: ${info.projectCount} projects, ${BAND_LABEL[info.band]} risk` : undefined}
                      onKeyDown={e => { if (info && (e.key === 'Enter' || e.key === ' ')) setHovered(name) }}
                    />
                    {info && <title>{`${name} — ${info.projectCount} projects · ${BAND_LABEL[info.band]} risk`}</title>}
                  </g>
                )
              })}

              {/* Project count labels */}
              {Object.entries(STATE_INFO).map(([name, info]) => {
                const shape = shapeByName.get(name)
                if (!shape) return null
                return (
                  <text
                    key={name}
                    x={shape.cx} y={shape.cy}
                    textAnchor="middle" dominantBaseline="middle"
                    pointerEvents="none"
                    fill={hovered === name ? '#1a237e' : '#2c2c2c'}
                    fontWeight={hovered === name ? 800 : 600}
                    style={{ fontSize: labelSize, fontFamily: 'system-ui,sans-serif' }}
                  >
                    {info.projectCount}
                  </text>
                )
              })}
            </svg>

            {/* Color scale */}
            <div className="msw-scale-legend">
              <div className="msw-scale-bar" />
              <div className="msw-scale-labels">
                <span>{MAX_COUNT}</span>
                <span>{Math.round(MAX_COUNT * 0.75)}</span>
                <span>{Math.round(MAX_COUNT * 0.5)}</span>
                <span>{Math.round(MAX_COUNT * 0.25)}</span>
                <span>0</span>
              </div>
            </div>

            {/* Bottom hover badge */}
            <div className="msw-hover-badge">
              <span className="msw-hover-dot" style={{ background: BAND_HEX[active.band] }} />
              <strong>{active.name}</strong>
              <span className="msw-hover-sep">·</span>
              <span>{active.projectCount} Projects</span>
              <span className="msw-hover-sep">·</span>
              <span className="msw-band-label" style={{ color: BAND_HEX[active.band] }}>
                {BAND_LABEL[active.band]} Risk
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
