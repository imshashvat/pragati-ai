// src/pages/DashboardPage.tsx
// "National Infrastructure Intelligence" — 4-layer dashboard

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from 'recharts'
import { getPortfolio, type PortfolioData } from '../api/dashboard'
import RiskBadge, { riskToSeverity } from '../components/RiskBadge'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Color helpers ─────────────────────────────────────────────────────────
function riskColor(r: number) {
  if (r >= 0.80) return '#DA1E28'
  if (r >= 0.65) return '#FF832B'
  if (r >= 0.50) return '#F1C21B'
  return '#198038'
}

function riskLabel(r: number) {
  if (r >= 0.80) return 'Critical'
  if (r >= 0.65) return 'High'
  if (r >= 0.50) return 'Moderate'
  return 'Healthy'
}

// ── KPI tile ──────────────────────────────────────────────────────────────
function KpiTile({
  label, value, sub, accent, id,
}: { label: string; value: number | string; sub?: string; accent?: string; id?: string }) {
  return (
    <div className="card-sm flex flex-col gap-2" id={id}>
      <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#697077' }}>
        {label}
      </div>
      <div className="metric-value" style={accent ? { color: accent } : {}}>
        {value}
      </div>
      {sub && (
        <div className="text-[12px]" style={{ color: '#8D8D8D' }}>{sub}</div>
      )}
    </div>
  )
}

// ── Custom chart tooltip ──────────────────────────────────────────────────
interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}
function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="card-sm text-[12px] min-w-[120px]"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
    >
      <div className="font-medium mb-1" style={{ color: '#161616' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4" style={{ color: '#525252' }}>
          <span>{p.name}</span>
          <span className="font-medium tabular" style={{ color: p.color }}>
            {(p.value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Priority risk queue row ───────────────────────────────────────────────
function RiskQueueRow({
  ministry, avg_risk, project_count, high_risk_count,
}: { ministry: string; avg_risk: number; project_count: number; high_risk_count: number }) {
  return (
    <div
      className="flex items-center gap-3 py-3 border-b last:border-0 hover:bg-[#F7F8FA] transition-colors -mx-4 px-4"
      style={{ borderColor: '#E0E4E8' }}
    >
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: riskColor(avg_risk), minHeight: '32px' }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: '#161616' }}>{ministry}</div>
        <div className="text-[12px] mt-0.5" style={{ color: '#697077' }}>
          {project_count} project{project_count !== 1 ? 's' : ''} · {high_risk_count} at risk
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[15px] font-semibold tabular" style={{ color: riskColor(avg_risk) }}>
          {(avg_risk * 100).toFixed(0)}%
        </span>
        <span className="text-[10px] font-medium" style={{ color: riskColor(avg_risk) }}>
          {riskLabel(avg_risk)}
        </span>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading portfolio data">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-md" />)}
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 skeleton h-72 rounded-md" />
        <div className="lg:col-span-2 skeleton h-72 rounded-md" />
      </div>
      <div className="skeleton h-48 rounded-md" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  usePageTitle('Portfolio Dashboard')

  const [data,     setData]    = useState<PortfolioData | null>(null)
  const [loading,  setLoading] = useState(true)
  const [error,    setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPortfolio()
      .then(d  => { if (!cancelled) { setData(d); setError(null) } })
      .catch(() => { if (!cancelled) setError('Unable to load portfolio data. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="empty-state" role="alert">
        <p className="text-[14px] font-medium" style={{ color: '#161616' }}>
          Failed to load portfolio
        </p>
        <p className="text-[13px] mt-1" style={{ color: '#697077' }}>{error ?? 'No data available.'}</p>
        <button
          className="btn-primary mt-4"
          onClick={() => { setLoading(true); setError(null); getPortfolio().then(setData).catch(() => setError('Still unavailable.')).finally(() => setLoading(false)) }}
        >
          Try again
        </button>
      </div>
    )
  }

  const highPct = data.total_projects > 0
    ? Math.round((data.high_risk_count / data.total_projects) * 100)
    : 0

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const sortedSectors   = [...data.by_sector].sort((a, b) => b.avg_risk - a.avg_risk)
  const sortedMinistry  = [...data.by_ministry].sort((a, b) => b.avg_risk - a.avg_risk)

  return (
    <div className="space-y-6">

      {/* Layer 1: Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
            National Infrastructure Intelligence
          </h1>
          <p className="text-[13px] mt-1" style={{ color: '#525252' }}>
            Prioritised risk view across the monitored PAIMANA project portfolio
          </p>
        </div>
        <time
          dateTime={new Date().toISOString().split('T')[0]}
          className="text-[12px] flex-shrink-0"
          style={{ color: '#8D8D8D', paddingTop: '4px' }}
        >
          {today}
        </time>
      </div>

      {/* Layer 2: Executive metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Executive metrics">
        <KpiTile id="kpi-total"      label="Total Projects"       value={data.total_projects}     sub="Under PAIMANA monitoring" />
        <KpiTile id="kpi-attention"  label="Requiring Attention"  value={data.high_risk_count}    sub={`${highPct}% of portfolio`} accent="#DA1E28" />
        <KpiTile id="kpi-cost"       label="Cost Risk Flagged"    value={data.cost_risk_count}    sub="Above threshold" accent="#FF832B" />
        <KpiTile id="kpi-delay"      label="Delay Risk Flagged"   value={data.delay_risk_count}   sub="Above threshold" accent="#B45309" />
      </div>

      {/* Layer 3: Primary intelligence (60/40 split) */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* Sector risk chart */}
        <div className="card lg:col-span-3" role="region" aria-label="Risk distribution by sector">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold" style={{ color: '#161616' }}>
              Risk Distribution by Sector
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#697077' }}>
              Average risk score per infrastructure sector
            </p>
          </div>
          {sortedSectors.length === 0 ? (
            <div className="empty-state py-10">
              <p className="text-[13px]" style={{ color: '#697077' }}>No sector data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={sortedSectors}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="#F3F5F7" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 11, fill: '#8D8D8D' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="sector"
                  width={130}
                  tick={{ fontSize: 12, fill: '#525252' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F7F8FA' }} />
                <Bar dataKey="avg_risk" name="Avg Risk" radius={[0, 3, 3, 0]} maxBarSize={24}>
                  {sortedSectors.map((entry, i) => (
                    <Cell key={i} fill={riskColor(entry.avg_risk)} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Priority risk queue */}
        <div className="card lg:col-span-2" role="region" aria-label="Ministry priority risk queue">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold" style={{ color: '#161616' }}>
              Priority Risk Queue
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#697077' }}>
              Ministries ranked by average portfolio risk
            </p>
          </div>
          {sortedMinistry.length === 0 ? (
            <div className="empty-state py-8">
              <p className="text-[13px]" style={{ color: '#697077' }}>No ministry data</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
              {sortedMinistry.map(m => (
                <RiskQueueRow key={m.ministry} {...m} />
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: '#E0E4E8' }}>
            <Link to="/projects" className="text-[13px] font-medium" style={{ color: '#0F62FE' }}>
              View all projects →
            </Link>
          </div>
        </div>
      </div>

      {/* Layer 4: Ministry breakdown table */}
      <div className="card p-0 overflow-hidden" role="region" aria-label="Ministry portfolio breakdown">
        <div className="px-6 py-4 border-b" style={{ borderColor: '#E0E4E8' }}>
          <h2 className="text-[15px] font-semibold" style={{ color: '#161616' }}>
            Ministry Portfolio Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table" aria-label="Ministry risk breakdown">
            <thead>
              <tr>
                <th scope="col">Ministry</th>
                <th scope="col" className="text-right">Projects</th>
                <th scope="col" className="text-right">High Risk</th>
                <th scope="col" className="text-right">Avg Risk Score</th>
                <th scope="col">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {data.by_ministry
                .sort((a, b) => b.avg_risk - a.avg_risk)
                .map(m => (
                  <tr key={m.ministry}>
                    <td className="font-medium">{m.ministry}</td>
                    <td className="text-right tabular" style={{ color: '#525252' }}>{m.project_count}</td>
                    <td className="text-right tabular" style={{ color: m.high_risk_count > 0 ? '#DA1E28' : '#198038' }}>
                      {m.high_risk_count}
                    </td>
                    <td className="text-right tabular font-semibold" style={{ color: riskColor(m.avg_risk) }}>
                      {(m.avg_risk * 100).toFixed(1)}%
                    </td>
                    <td>
                      <RiskBadge risk={m.avg_risk} size="sm" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
