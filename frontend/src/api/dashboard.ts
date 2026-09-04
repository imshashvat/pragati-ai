// src/api/dashboard.ts
import client from './client'

export interface SectorStat {
  sector: string
  project_count: number
  high_risk_count: number
  avg_risk: number
}

export interface Ministrystat {
  ministry: string
  project_count: number
  high_risk_count: number
  avg_risk: number
}

export interface PortfolioData {
  total_projects: number
  high_risk_count: number
  cost_risk_count: number
  delay_risk_count: number
  by_sector: SectorStat[]
  by_ministry: Ministrystat[]
}

export interface ProvenanceData {
  last_sync: string | null
  source: 'live' | 'demo'
  data_quality_flags: Array<{ project_id: string; report_month: string; flag_type: string; detail: string }>
  model_loaded: boolean
  model_version: string | null
  feature_count: number
}

export interface ModelPerformanceData {
  model_loaded: boolean
  model_version: string | null
  feature_count: number
  trained_on_rows?: number
  tested_on_rows?: number
  temporal_validation?: boolean
  cost_model_auc?: number | null
  delay_model_auc?: number | null
  note?: string
}

export async function getPortfolio(params?: { sector?: string; ministry?: string }): Promise<PortfolioData> {
  const res = await client.get<PortfolioData>('/dashboard/portfolio', { params })
  return res.data
}

export async function getProvenance(): Promise<ProvenanceData> {
  const res = await client.get<ProvenanceData>('/data-provenance')
  return res.data
}

export async function getModelPerformance(): Promise<ModelPerformanceData> {
  const res = await client.get<ModelPerformanceData>('/model-performance')
  return res.data
}
