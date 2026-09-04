// src/api/auth.ts
import client from './client'

export interface LoginResponse {
  token: string
  role: string
  user_id: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>('/auth/login', { username, password })
  return res.data
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout')
}
