// src/pages/ProjectsPage.tsx
// Risk-ranked enterprise project table

import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProjects, type ProjectListItem } from '../api/projects'
import RiskBadge, { SeverityBar, riskToSeverity } from '../components/RiskBadge'
import { usePageTitle } from '../hooks/usePageTitle'

const SECTOR_OPTIONS = [
  '', 'Railways', 'Roads', 'Power', 'Irrigation', 'Urban', 'Telecom', 'Health',
]

const PAGE_SIZE = 30

export default function ProjectsPage() {
  usePageTitle('Projects')

  const [items,   setItems]   = useState<ProjectListItem[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [sector,  setSector]  = useState('')
  const [page,    setPage]    = useState(1)

  const abortRef = useRef<AbortController | null>(null)

  function load(newSector = sector, newPage = page) {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)
    listProjects({ sector: newSector || undefined, page: newPage, page_size: PAGE_SIZE })
      .then(d => { setItems(d.items); setTotal(d.total) })
      .catch(e => { if (e?.code !== 'ERR_CANCELED') setError('Failed to load projects. Please try again.') })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    return () => abortRef.current?.abort()
  }, [sector, page]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetFilters() { setSector(''); setPage(1) }

  const hasFilters = !!sector

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
            Projects
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#525252' }}>
            {loading ? 'Loading…' : `${total} project${total !== 1 ? 's' : ''} ranked by composite risk score`}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="filter-sector" className="sr-only">Filter by sector</label>
          <select
            id="filter-sector"
            value={sector}
            onChange={e => { setSector(e.target.value); setPage(1) }}
            className="select"
          >
            <option value="">All sectors</option>
            {SECTOR_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={resetFilters} className="btn-ghost py-1.5" aria-label="Clear filters">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-md"
          style={{ background: '#FFF0F1', border: '1px solid #FF8389' }}
          role="alert"
        >
          <p className="text-[13px]" style={{ color: '#DA1E28' }}>{error}</p>
          <button
            className="btn-action flex-shrink-0"
            onClick={() => load()}
            style={{ borderColor: '#FF8389', color: '#DA1E28' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table card */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="data-table"
            style={{ minWidth: '680px' }}
            aria-label="Projects risk table"
            aria-busy={loading}
          >
            <thead>
              <tr>
                <th scope="col" style={{ width: '4px', padding: 0 }} aria-hidden="true" />
                <th scope="col">Project</th>
                <th scope="col">Sector</th>
                <th scope="col" className="text-right">Cost Risk</th>
                <th scope="col" className="text-right">Delay Risk</th>
                <th scope="col">Overall Risk</th>
                <th scope="col">Alert</th>
                <th scope="col" style={{ width: '20px' }} aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    <td style={{ padding: 0 }} />
                    <td colSpan={7} style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                      <div className="skeleton h-4 rounded" style={{ width: `${50 + (i % 3) * 15}%` }} />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 && !error ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state py-12">
                      <p className="text-[14px] font-medium" style={{ color: '#161616' }}>
                        No projects found
                      </p>
                      <p className="text-[13px] mt-1" style={{ color: '#697077' }}>
                        {hasFilters ? 'Try clearing the sector filter.' : 'No projects have been ingested yet.'}
                      </p>
                      {hasFilters && (
                        <button className="btn-ghost mt-3" onClick={resetFilters}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(p => {
                  const sev = riskToSeverity(p.overall_risk)
                  return (
                    <tr key={p.project_id}>
                      <td style={{ padding: 0, width: '4px' }}>
                        <SeverityBar severity={sev} />
                      </td>
                      <td>
                        <Link
                          to={`/projects/${p.project_id}`}
                          id={`project-link-${p.project_id}`}
                          className="font-medium"
                          style={{ color: '#0F62FE' }}
                        >
                          {p.name}
                        </Link>
                        <div className="text-[11px] mt-0.5 font-mono" style={{ color: '#8D8D8D' }}>
                          {p.project_id}
                        </div>
                      </td>
                      <td style={{ color: '#525252', fontSize: '13px' }}>{p.sector ?? '—'}</td>
                      <td className="text-right tabular font-medium" style={{ color: '#161616' }}>
                        {(p.cost_risk * 100).toFixed(0)}%
                      </td>
                      <td className="text-right tabular font-medium" style={{ color: '#161616' }}>
                        {(p.delay_risk * 100).toFixed(0)}%
                      </td>
                      <td>
                        <RiskBadge risk={p.overall_risk} size="sm" showValue />
                      </td>
                      <td>
                        {p.alert_status ? (
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            {p.alert_status.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span style={{ color: '#C1C7CD', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td
                        style={{ color: '#C1C7CD', textAlign: 'right' }}
                        aria-hidden="true"
                      >
                        ›
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {total > PAGE_SIZE && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: '#E0E4E8' }}
            aria-label="Pagination"
          >
            <span className="text-[12px]" style={{ color: '#697077' }}>
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                id="btn-prev-page"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
                aria-label="Previous page"
              >
                Previous
              </button>
              <button
                id="btn-next-page"
                onClick={() => setPage(p => p + 1)}
                disabled={page * PAGE_SIZE >= total}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
