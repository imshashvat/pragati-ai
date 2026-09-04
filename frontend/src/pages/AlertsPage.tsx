// src/pages/AlertsPage.tsx
// Operational alert workflow — enterprise table

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { listAlerts, reviewAlert, type AlertItem, type ReviewAction } from '../api/alerts'
import { SeverityBar } from '../components/RiskBadge'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

const REVIEW_ACTIONS: ReviewAction[] = ['acknowledge', 'investigate', 'resolve', 'escalate', 'false_positive']

const ACTION_LABELS: Record<ReviewAction, string> = {
  acknowledge:    'Acknowledge',
  investigate:    'Investigate',
  resolve:        'Resolve',
  false_positive: 'False Positive',
  escalate:       'Escalate',
}

function validActions(status: string): ReviewAction[] {
  if (status === 'created')       return ['acknowledge', 'resolve', 'false_positive']
  if (status === 'acknowledged')  return ['investigate', 'resolve', 'escalate', 'false_positive']
  if (status === 'investigating') return ['resolve', 'escalate', 'false_positive']
  return []
}

const SEV_MAP: Record<string, 'low' | 'med' | 'high' | 'crit'> = {
  low: 'low', medium: 'med', high: 'high', critical: 'crit',
}

function RelativeTime({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6)
  const full = new Date(iso).toLocaleString('en-IN')
  if (h < 1) return <time dateTime={iso} title={full}>{Math.floor(diff / 60000)}m ago</time>
  if (h < 24) return <time dateTime={iso} title={full}>{h}h ago</time>
  return <time dateTime={iso} title={full}>{Math.floor(h / 24)}d ago</time>
}

function StatusChip({ status }: { status: string }) {
  const clean = status.replace(/_/g, ' ')
  const done = ['resolved', 'false_positive'].includes(status)
  return (
    <span
      className="badge"
      style={{
        background: done ? '#DEFBE6' : '#F3F5F7',
        color: done ? '#198038' : '#525252',
        border: `1px solid ${done ? '#A7F0BA' : '#E0E4E8'}`,
        fontSize: '11px',
        textTransform: 'capitalize',
      }}
    >
      {clean}
    </span>
  )
}

export default function AlertsPage() {
  usePageTitle('Alert Queue')

  const { role } = useAuth()
  const [items,        setItems]        = useState<AlertItem[]>([])
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('created')
  const [acting,       setActing]       = useState<string | null>(null)
  const [actionError,  setActionError]  = useState<string | null>(null)
  const [actionDone,   setActionDone]   = useState<string | null>(null)

  const canAct = role === 'officer' || role === 'admin'

  const loadAlerts = useCallback(() => {
    setLoading(true)
    setError(null)
    listAlerts({ status: statusFilter || undefined, page_size: 50 })
      .then(d => { setItems(d.items); setTotal(d.total) })
      .catch(() => setError('Failed to load alerts. Please try again.'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  async function handleAction(alertId: string, action: ReviewAction) {
    if (acting) return // prevent double-action
    setActing(alertId)
    setActionError(null)
    setActionDone(null)
    try {
      await reviewAlert(alertId, action)
      setActionDone(`Alert ${ACTION_LABELS[action].toLowerCase()}d successfully.`)
      setTimeout(() => setActionDone(null), 3000)
      loadAlerts()
    } catch {
      setActionError('Action failed. Please try again.')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
            Alert Queue
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#525252' }}>
            {loading ? 'Loading…' : `${total} alert${total !== 1 ? 's' : ''} matching current filter`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-alert-status" className="sr-only">Filter alerts by status</label>
          <select
            id="filter-alert-status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select"
          >
            <option value="">All statuses</option>
            <option value="created">Created</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Action feedback */}
      {actionDone && (
        <div
          className="px-4 py-3 rounded-md text-[13px]"
          style={{ background: '#DEFBE6', border: '1px solid #A7F0BA', color: '#198038' }}
          role="status"
          aria-live="polite"
        >
          {actionDone}
        </div>
      )}
      {actionError && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-md"
          style={{ background: '#FFF0F1', border: '1px solid #FF8389' }}
          role="alert"
        >
          <p className="text-[13px]" style={{ color: '#DA1E28' }}>{actionError}</p>
          <button
            className="btn-action flex-shrink-0"
            onClick={() => setActionError(null)}
            style={{ borderColor: '#FF8389', color: '#DA1E28' }}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Load error */}
      {error && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-md"
          style={{ background: '#FFF0F1', border: '1px solid #FF8389' }}
          role="alert"
        >
          <p className="text-[13px]" style={{ color: '#DA1E28' }}>{error}</p>
          <button
            className="btn-action flex-shrink-0"
            onClick={loadAlerts}
            style={{ borderColor: '#FF8389', color: '#DA1E28' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="data-table"
            style={{ minWidth: '680px' }}
            aria-label="Alert queue"
            aria-busy={loading}
          >
            <thead>
              <tr>
                <th scope="col" style={{ width: '4px', padding: 0 }} aria-hidden="true" />
                <th scope="col">Project</th>
                <th scope="col">Status</th>
                <th scope="col">Severity</th>
                <th scope="col">Detected</th>
                {canAct && <th scope="col" style={{ minWidth: '180px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    <td style={{ padding: 0 }} />
                    <td colSpan={canAct ? 5 : 4} style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                      <div className="skeleton h-4 rounded" style={{ width: `${40 + (i % 4) * 12}%` }} />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 && !error ? (
                <tr>
                  <td colSpan={canAct ? 6 : 5}>
                    <div className="empty-state py-12">
                      <p className="text-[14px] font-medium" style={{ color: '#161616' }}>
                        No alerts
                      </p>
                      <p className="text-[13px] mt-1" style={{ color: '#697077' }}>
                        {statusFilter
                          ? 'No alerts match this status filter. Try "All statuses".'
                          : 'All projects are within acceptable risk thresholds.'}
                      </p>
                      {statusFilter && (
                        <button
                          className="btn-ghost mt-3"
                          onClick={() => setStatusFilter('')}
                        >
                          Show all alerts
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(alert => {
                  const sev = SEV_MAP[alert.severity] ?? 'med'
                  const actions = validActions(alert.status)
                  const isActing = acting === alert.alert_id
                  return (
                    <tr key={alert.alert_id}>
                      <td style={{ padding: 0 }}>
                        <SeverityBar severity={sev} />
                      </td>
                      <td>
                        <Link
                          to={`/projects/${alert.project_id}`}
                          id={`alert-project-${alert.alert_id}`}
                          className="font-medium text-[13px]"
                          style={{ color: '#0F62FE' }}
                        >
                          {alert.project_name ?? alert.project_id}
                        </Link>
                        <div className="text-[11px] font-mono mt-0.5" style={{ color: '#8D8D8D' }}>
                          {alert.alert_id}
                        </div>
                      </td>
                      <td><StatusChip status={alert.status} /></td>
                      <td>
                        <span
                          className="text-[11px] font-semibold capitalize px-2 py-0.5 rounded"
                          style={{
                            background: sev === 'crit' ? '#FFF0F1' : sev === 'high' ? '#FFF1E8' : sev === 'med' ? '#FEF9E5' : '#DEFBE6',
                            color: sev === 'crit' ? '#DA1E28' : sev === 'high' ? '#B45309' : sev === 'med' ? '#8E6A00' : '#198038',
                          }}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="text-[12px]" style={{ color: '#697077' }}>
                        <RelativeTime iso={alert.created_at} />
                      </td>
                      {canAct && (
                        <td>
                          {actions.length > 0 ? (
                            <div className="flex gap-1.5 flex-wrap" role="group" aria-label={`Actions for alert ${alert.alert_id}`}>
                              {REVIEW_ACTIONS.filter(a => actions.includes(a)).map(action => (
                                <button
                                  key={action}
                                  id={`btn-${action}-${alert.alert_id}`}
                                  onClick={() => handleAction(alert.alert_id, action)}
                                  disabled={isActing || !!acting}
                                  className={action === 'escalate' ? 'btn-danger' : 'btn-action'}
                                  style={{ fontSize: '11px', padding: '6px 10px', minHeight: '32px' }}
                                  aria-label={`${ACTION_LABELS[action]} alert ${alert.alert_id}`}
                                >
                                  {isActing ? '…' : ACTION_LABELS[action]}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#C1C7CD', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
