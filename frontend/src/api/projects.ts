// src/api/projects.ts
import client from './client'

export interface ProjectListItem {
  project_id: string
  name: string
  sector: string | null
  ministry: string | null
  overall_risk: number
  cost_risk: number
  delay_risk: number
  alert_status: string | null
  alert_id: string | null
  model_mode: string
  priority_score: number
}

export interface TrendPoint {
  month: string
  expenditure_ratio: number
  cost_growth_ratio: number
  expenditure: number | null
  revised_cost: number | null
}

export interface ProjectDetail {
  project_id: string
  name: string
  sector: string | null
  ministry: string | null
  original_cost: number | null
  cost_risk: number | null
  delay_risk: number | null
  overall_risk: number | null
  model_mode: string | null
  model_version: string | null
  trend: TrendPoint[]
  data_quality_flag: number
}

export interface Driver {
  feature: string
  label: string
  impact: number
  direction: 'increases_risk' | 'decreases_risk'
  rank: number
}

export interface DriversResponse {
  project_id: string
  drivers: Driver[]
}

export async function listProjects(params?: {
  status?: string
  sector?: string
  ministry?: string
  min_risk?: number
  page?: number
  page_size?: number
}) {
  const res = await client.get<{ total: number; page: number; page_size: number; items: ProjectListItem[] }>(
    '/projects',
    { params }
  )
  return res.data
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const res = await client.get<ProjectDetail>(`/projects/${projectId}`)
  return res.data
}

export async function getProjectDrivers(projectId: string): Promise<DriversResponse> {
  const res = await client.get<DriversResponse>(`/projects/${projectId}/drivers`)
  return res.data
}

export interface RecommendationItem {
  project_id: string
  name: string
  sector: string | null
  ministry: string | null
  overall_risk: number
  cost_risk: number
  delay_risk: number
  original_cost: number | null
  model_mode: string
  continuation_suitability: number
  top_reason: string
}

export async function getRecommendations(params?: {
  sector?: string
  ministry?: string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}): Promise<RecommendationItem[]> {
  const res = await client.get<RecommendationItem[]>('/projects/recommendations', { params })
  return res.data
}

/** POST /projects/{id}/assistant — LLM narrates pre-computed risk data only. */
export async function askAssistant(
  projectId: string,
  question: string | null,
): Promise<string> {
  const res = await client.post<{ answer: string }>(
    `/projects/${projectId}/assistant`,
    { question },
  )
  return res.data.answer
}
