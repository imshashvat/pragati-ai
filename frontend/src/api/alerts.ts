// src/api/alerts.ts
import client from './client'

export interface AlertItem {
  alert_id: string
  project_id: string
  project_name: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  created_at: string
  updated_at: string
}

export type ReviewAction = 'acknowledge' | 'investigate' | 'resolve' | 'false_positive' | 'escalate'

export async function listAlerts(params?: {
  status?: string
  severity?: string
  sector?: string
  page?: number
  page_size?: number
}) {
  const res = await client.get<{ total: number; items: AlertItem[] }>('/alerts', { params })
  return res.data
}

export async function reviewAlert(alertId: string, action: ReviewAction, note?: string) {
  const res = await client.post<{ alert_id: string; status: string; updated_at: string }>(
    `/alerts/${alertId}/review`,
    { action, note }
  )
  return res.data
}
