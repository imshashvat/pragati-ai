// src/pages/ProjectDetailPage.tsx
// Executive Intelligence Dossier — the flagship page
// Layout: header → assessment → risk timeline → why at risk → action panel

import React, { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { getProject, getProjectDrivers, askAssistant, type ProjectDetail, type Driver } from '../api/projects'
import RiskBadge, { riskToSeverity } from '../components/RiskBadge'
import { usePageTitle } from '../hooks/usePageTitle'

// ── AI Assistant Widget ───────────────────────────────────────────────────
interface Message { role: 'assistant' | 'user'; text: string }

function AIAssistantWidget({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom after each new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // On mount: auto-fetch a plain-language summary (question = null)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    askAssistant(projectId, null)
      .then(answer => {
        if (!cancelled) setMessages([{ role: 'assistant', text: answer }])
      })
      .catch(() => {
        if (!cancelled)
          setMessages([{ role: 'assistant', text: 'Assistant unavailable — showing computed data only.' }])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId])

  async function handleAsk() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const answer = await askAssistant(projectId, q)
      setMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Assistant unavailable — please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ borderColor: '#E0E4E8', padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{
          fontSize: 16, lineHeight: 1,
          background: 'linear-gradient(135deg, #0F62FE, #8A3FFC)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>✦</span>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#161616', margin: 0 }}>
          AI Risk Explainer
        </h2>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#6929C4',
          background: '#F6F2FF', padding: '2px 8px', borderRadius: 20,
          border: '1px solid #D4BBFF',
        }}>Kimi K3 · NVIDIA NIM</span>
      </div>

      {/* Message list */}
      <div style={{
        maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: 12, marginBottom: 16,
        paddingRight: 4,
      }}>
        {messages.length === 0 && loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#697077' }}>Generating summary</span>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#0F62FE',
                  animation: `ai-bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                  display: 'inline-block',
                }} />
              ))}
            </span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: '#EDF5FF', color: '#0043CE',
                  fontSize: 13, padding: '8px 14px', borderRadius: '12px 12px 0 12px',
                  maxWidth: '80%', lineHeight: 1.5,
                }}>
                  {msg.text}
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  background: '#F4F4F4', color: '#161616',
                  fontSize: 13, padding: '10px 14px', borderRadius: '0 12px 12px 12px',
                  maxWidth: '90%', lineHeight: 1.6,
                }}>
                  {msg.text}
                </div>
                <p style={{
                  fontSize: 10, color: '#8D8D8D', marginTop: 4, marginLeft: 4,
                  fontStyle: 'italic', letterSpacing: '0.01em',
                }}>
                  AI-generated explanation, not a new prediction.
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator for follow-up questions */}
        {loading && messages.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: '#8D8D8D',
                animation: `ai-bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                display: 'inline-block',
              }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          placeholder="Ask about this project's risk data…"
          disabled={loading}
          style={{
            flex: 1, fontSize: 13, padding: '8px 12px',
            border: '1px solid #C6C6C6', borderRadius: 6,
            background: loading ? '#F4F4F4' : '#fff',
            color: '#161616', outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#0F62FE' }}
          onBlur={e => { e.target.style.borderColor = '#C6C6C6' }}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !input.trim()}
          style={{
            fontSize: 13, fontWeight: 600, padding: '8px 18px',
            background: loading || !input.trim() ? '#C6C6C6' : '#0F62FE',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          Ask
        </button>
      </div>

      <style>{`
        @keyframes ai-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────
function riskColor(r: number) {
  if (r >= 0.80) return '#DA1E28'
  if (r >= 0.65) return '#FF832B'
  if (r >= 0.50) return '#F1C21B'
  return '#198038'
}

function riskVerb(r: number) {
  if (r >= 0.80) return 'Critical — Immediate attention required'
  if (r >= 0.65) return 'High Risk — Escalation recommended'
  if (r >= 0.50) return 'Moderate — Enhanced monitoring'
  return 'Within acceptable parameters'
}

function narrativeSummary(detail: ProjectDetail, drivers: Driver[]): string {
  const rPct = ((detail.overall_risk ?? 0) * 100).toFixed(0)
  const topDriver = drivers[0]?.label ?? 'multiple risk factors'
  const costFlag = (detail.cost_risk ?? 0) >= 0.5
  const delayFlag = (detail.delay_risk ?? 0) >= 0.5

  let flags = ''
  if (costFlag && delayFlag) flags = 'cost overrun and schedule delay'
  else if (costFlag) flags = 'cost overrun pressure'
  else if (delayFlag) flags = 'schedule delay risk'
  else flags = 'low-level risk signals'

  return `This project carries an estimated composite risk score of ${rPct}%, driven primarily by ${topDriver}. The current indicators suggest ${flags}. ${
    (detail.data_quality_flag ?? 0) > 0
      ? `${detail.data_quality_flag} data field(s) are incomplete, which may affect prediction confidence.`
      : 'Data completeness is satisfactory for this assessment period.'
  }`
}

// ── Sub-components ────────────────────────────────────────────────────────
function GaugeBar({ label, value }: { label: string; value: number | null }) {
  const pct = (value ?? 0) * 100
  const col = riskColor(value ?? 0)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[13px]" style={{ color: '#525252' }}>{label}</span>
        <span className="text-[14px] font-semibold tabular" style={{ color: col }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="gauge-track">
        <div
          className="gauge-fill"
          style={{ width: `${pct}%`, backgroundColor: col }}
        />
      </div>
    </div>
  )
}

function EvidenceRow({ driver, index }: { driver: Driver; index: number }) {
  const isRisk = driver.direction === 'increases_risk'
  const impactPct = (driver.impact * 100).toFixed(1)
  return (
    <div className="evidence-item">
      <div className="evidence-number">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-medium" style={{ color: '#161616' }}>
              {driver.label}
            </div>
            <div className="text-[12px] mt-1" style={{ color: '#697077' }}>
              {isRisk
                ? `Contributing +${impactPct}pts to overall risk score`
                : `Mitigating factor — reducing risk by ${impactPct}pts`}
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: isRisk ? '#FFF1E8' : '#DEFBE6',
                color: isRisk ? '#B45309' : '#198038',
              }}
            >
              {isRisk ? '▲ Risk' : '▼ Mitigating'}
            </span>
          </div>
        </div>
        {/* Impact bar */}
        <div className="mt-2 h-1 rounded-full" style={{ background: '#F3F5F7' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(driver.impact * 200, 100)}%`,
              background: isRisk ? '#FF832B' : '#198038',
              minWidth: '4px',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-5 w-48 rounded" />
      <div className="card skeleton h-28" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card skeleton h-48" />
        <div className="lg:col-span-2 card skeleton h-48" />
      </div>
      <div className="card skeleton h-48" />
    </div>
  )
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-sm text-[12px] shadow-dropdown">
      <div className="font-medium mb-1" style={{ color: '#161616' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex gap-3 justify-between" style={{ color: '#525252' }}>
          <span>{p.name}</span>
          <span className="font-medium tabular" style={{ color: p.color }}>
            {(p.value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [detail,  setDetail]  = useState<ProjectDetail | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  usePageTitle(detail?.name ?? 'Project Detail')

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    Promise.all([
      getProject(projectId),
      getProjectDrivers(projectId).then(d => d.drivers).catch(() => []),
    ])
      .then(([proj, drvs]) => { setDetail(proj); setDrivers(drvs) })
      .catch(e => {
        const status = (e as { response?: { status?: number } }).response?.status
        setError(status === 404 ? 'Project not found.' : 'Failed to load project data.')
      })
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <DetailSkeleton />

  if (error || !detail) {
    return (
      <div className="empty-state">
        <p className="text-[13px]" style={{ color: '#525252' }}>{error ?? 'No data'}</p>
        <Link to="/projects" id="btn-back-projects-error" className="btn-ghost mt-2">
          ← Back to Projects
        </Link>
      </div>
    )
  }

  const sev = riskToSeverity(detail.overall_risk ?? 0)
  const rCol = riskColor(detail.overall_risk ?? 0)
  const summary = narrativeSummary(detail, drivers)
  const riskDrivers = drivers.filter(d => d.direction === 'increases_risk')

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <div className="breadcrumb">
        <Link to="/projects" id="btn-back-projects">Projects</Link>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{detail.name}</span>
      </div>

      {/* ── Project header card ──────────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1
              className="font-semibold leading-tight"
              style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}
            >
              {detail.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <span className="text-[13px]" style={{ color: '#525252' }}>
                <span style={{ color: '#8D8D8D' }}>ID:</span> {detail.project_id}
              </span>
              {detail.sector && (
                <span className="text-[13px]" style={{ color: '#525252' }}>
                  <span style={{ color: '#8D8D8D' }}>Sector:</span> {detail.sector}
                </span>
              )}
              {detail.ministry && (
                <span className="text-[13px]" style={{ color: '#525252' }}>
                  <span style={{ color: '#8D8D8D' }}>Ministry:</span> {detail.ministry}
                </span>
              )}
              {detail.original_cost != null && (
                <span className="text-[13px] tabular" style={{ color: '#525252' }}>
                  <span style={{ color: '#8D8D8D' }}>Budget:</span> ₹{detail.original_cost.toLocaleString('en-IN')} Cr
                </span>
              )}
            </div>
          </div>

          {/* Risk indicator — restrained, not dominating */}
          <div
            className="flex-shrink-0 px-5 py-4 rounded-md"
            style={{ background: '#F7F8FA', border: '1px solid #E0E4E8', minWidth: '160px' }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#697077' }}>
              Risk Assessment
            </div>
            <div
              className="text-[28px] font-semibold tabular leading-none"
              style={{ color: rCol }}
            >
              {((detail.overall_risk ?? 0) * 100).toFixed(0)}%
            </div>
            <div className="text-[12px] mt-1 font-medium" style={{ color: rCol }}>
              {riskVerb(detail.overall_risk ?? 0).split(' — ')[0]}
            </div>
            <div className="text-[11px] mt-2" style={{ color: '#8D8D8D' }}>
              Mode: <span className="font-mono">{detail.model_mode}</span>
            </div>
          </div>
        </div>

        {/* Data quality warning */}
        {(detail.data_quality_flag ?? 0) > 0 && (
          <div
            className="mt-4 flex items-center gap-2 px-3 py-2 rounded"
            style={{ background: '#FEF9E5', border: '1px solid #F1C21B' }}
          >
            <span className="text-[12px] font-medium" style={{ color: '#8E6A00' }}>
              ⚠ {detail.data_quality_flag} data field(s) missing — prediction confidence may be reduced.
            </span>
          </div>
        )}
      </div>

      {/* ── Current Assessment narrative ─────────────────────────── */}
      <div className="card">
        <div className="section-label mb-3">Current Assessment</div>
        <p className="text-[14px] leading-relaxed" style={{ color: '#161616' }}>
          {summary}
        </p>
      </div>

      {/* ── Risk gauges + timeline ───────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Risk breakdown */}
        <div className="card space-y-5">
          <h2 className="text-[15px] font-semibold" style={{ color: '#161616' }}>Risk Breakdown</h2>
          <GaugeBar label="Overall Risk" value={detail.overall_risk} />
          <GaugeBar label="Cost Risk"    value={detail.cost_risk} />
          <GaugeBar label="Delay Risk"   value={detail.delay_risk} />
        </div>

        {/* Cost growth timeline */}
        <div className="card lg:col-span-2">
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: '#161616' }}>
            Risk Timeline
          </h2>
          <p className="text-[12px] mb-4" style={{ color: '#697077' }}>
            Cost growth and expenditure trajectory over reporting periods
          </p>
          {detail.trend.length === 0 ? (
            <div className="empty-state py-8">
              <p className="text-[13px]" style={{ color: '#697077' }}>No trend data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={detail.trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#F3F5F7" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#8D8D8D' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8D8D8D' }}
                  tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine y={0.5} stroke="#FF832B" strokeDasharray="4 4" strokeWidth={1} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E0E4E8', strokeWidth: 1 }} />
                <Line
                  dataKey="cost_growth_ratio"
                  name="Cost Growth"
                  stroke="#0F62FE"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#0F62FE', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  dataKey="expenditure_ratio"
                  name="Expenditure"
                  stroke="#8D8D8D"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Why At Risk? — numbered evidence ──────────────────────── */}
      <div className="card">
        <h2 className="text-[15px] font-semibold mb-1" style={{ color: '#161616' }}>
          Why Is This Project At Risk?
        </h2>
        <p className="text-[12px] mb-4" style={{ color: '#697077' }}>
          {drivers.length > 0
            ? 'Top contributing factors from SHAP feature attribution'
            : 'No risk driver data available for this project.'}
        </p>
        {riskDrivers.length === 0 && drivers.length === 0 ? (
          <div className="empty-state py-8">
            <p className="text-[13px]" style={{ color: '#697077' }}>
              No risk drivers available for this project.
            </p>
          </div>
        ) : (
          <div>
            {drivers.map((d, i) => (
              <EvidenceRow key={d.rank} driver={d} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* ── AI Assistant widget — narrates pre-computed data only ─── */}
      <AIAssistantWidget projectId={projectId!} />

      {/* Recommended Action panel */}
      <div className="card" style={{ borderColor: '#E0E4E8' }}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="flex-1 min-w-0">
            <div className="section-label mb-2">Recommended Monitoring Action</div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: '#FFF1E8', color: '#B45309' }}>
                PRIORITY: {sev === 'crit' ? 'CRITICAL' : sev === 'high' ? 'HIGH' : sev === 'med' ? 'MODERATE' : 'ROUTINE'}
              </span>
            </div>
            <p className="text-[14px]" style={{ color: '#161616' }}>
              {sev === 'crit' || sev === 'high'
                ? 'Validate physical progress reporting and initiate a milestone recovery review. Engage implementing agency for corrective action plan.'
                : sev === 'med'
                ? 'Increase monitoring frequency and request updated progress reports for the next two reporting periods.'
                : 'Continue regular monitoring schedule. No immediate intervention required.'}
            </p>
            <p className="text-[12px] mt-2" style={{ color: '#697077' }}>
              Based on {drivers.length} risk indicator{drivers.length !== 1 ? 's' : ''} across the last {detail.trend.length} reporting period{detail.trend.length !== 1 ? 's' : ''}.
            </p>
          </div>

          {/* Only real action: view related alerts */}
          <div className="flex flex-col gap-2 flex-shrink-0 sm:min-w-[150px]">
            <Link
              to="/alerts"
              className="btn-primary w-full justify-center text-center"
              id="btn-view-alerts"
              style={{ fontSize: '13px', padding: '10px 16px' }}
            >
              View Alert Queue
            </Link>
            <Link
              to="/projects"
              className="btn-secondary w-full justify-center text-center"
              id="btn-back-projects-action"
              style={{ fontSize: '13px' }}
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
