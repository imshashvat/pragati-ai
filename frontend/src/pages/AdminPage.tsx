// src/pages/AdminPage.tsx
// Admin: file upload zone + ingestion log table

import React, { useEffect, useRef, useState } from 'react'
import client from '../api/client'
import { usePageTitle } from '../hooks/usePageTitle'

interface IngestionRun {
  ingestion_id:     string
  timestamp:        string | null
  status:           string
  rows_processed:   number
  projects_updated: number
  error_detail?:    string[]
}

interface IngestionResult {
  status:           string
  rows_processed:   number
  projects_updated: number
  errors?:          string[]
}

export default function AdminPage() {
  usePageTitle('Administration')

  const [runs,       setRuns]       = useState<IngestionRun[]>([])
  const [total,      setTotal]      = useState(0)
  const [logLoading, setLogLoading] = useState(true)
  const [logError,   setLogError]   = useState<string | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [dragOver,   setDragOver]   = useState(false)
  const [msg,        setMsg]        = useState<{ ok: boolean; text: string; errors?: string[] } | null>(null)
  const [fileName,   setFileName]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function loadLog() {
    setLogLoading(true)
    setLogError(null)
    client
      .get<{ total: number; items: IngestionRun[] }>('/admin/ingestion-log', { params: { page_size: 20 } })
      .then(r => { setRuns(r.data.items); setTotal(r.data.total) })
      .catch(() => setLogError('Failed to load ingestion log.'))
      .finally(() => setLogLoading(false))
  }

  useEffect(loadLog, [])

  async function downloadTemplate() {
    try {
      const res = await client.get('/admin/template', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'pragati_template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not download template. Make sure you are logged in as admin.')
    }
  }

  async function doUpload(file: File) {
    if (uploading) return
    setUploading(true)
    setMsg(null)
    setFileName(file.name)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await client.post('/admin/ingest', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const d = res.data as IngestionResult
      const ok = d.status === 'success'
      const partial = d.status === 'partial'
      setMsg({
        ok: ok || partial,
        text: `Ingestion ${d.status} — ${d.rows_processed} rows processed, ${d.projects_updated} projects updated.`,
        errors: d.errors,
      })
      loadLog()
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { errors?: string[]; detail?: string } } }).response?.data
      const status  = (err as { response?: { status?: number } }).response?.status
      if (status === 400) {
        setMsg({ ok: false, text: 'File rejected — ensure it is a valid CSV or XLSX file.', errors: errData?.errors })
      } else if (status === 413) {
        setMsg({ ok: false, text: 'File too large. Please reduce the file size and try again.' })
      } else {
        setMsg({ ok: false, text: 'Upload failed. Check your network connection and try again.' })
      }
    } finally {
      setUploading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) doUpload(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) doUpload(file)
  }

  function handleDropZoneKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileRef.current?.click()
    }
  }

  function statusColor(s: string): { bg: string; border: string; color: string } {
    if (s === 'success') return { bg: '#DEFBE6', border: '#A7F0BA', color: '#198038' }
    if (s === 'partial')  return { bg: '#FFF8E1', border: '#FFD54F', color: '#B45309' }
    return { bg: '#FFF0F1', border: '#FF8389', color: '#DA1E28' }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-semibold" style={{ fontSize: '22px', color: '#102A43', letterSpacing: '-0.015em' }}>
          Administration
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#525252' }}>
          Upload PAIMANA export files and monitor ingestion pipeline runs
        </p>
      </div>

      {/* Upload zone */}
      <div className="card" style={{ maxWidth: '580px' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold" style={{ color: '#161616' }}>
            Upload PAIMANA Export
          </h2>
          <button
            id="btn-download-template"
            onClick={downloadTemplate}
            style={{
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #0F62FE',
              color: '#0F62FE',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
            title="Download a template CSV with the correct column headers"
          >
            ⬇ Download Template
          </button>
        </div>

        {/* Column reference */}
        <div style={{
          background: '#F0F4FF',
          border: '1px solid #C7D7F9',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '12px',
          color: '#344563',
        }}>
          <strong>Required columns:</strong> Project Code (or project_id) · Project Name · Original Cost<br />
          <strong>Optional:</strong> Sector · Line Ministry · Revised Cost · Expenditure · Original End Date · Revised End Date · Reporting Month<br />
          <span style={{ color: '#697077' }}>Column names are flexible — download the template if unsure.</span>
        </div>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload file — drag and drop or press Enter to browse"
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          onKeyDown={handleDropZoneKeyDown}
          style={{
            border: `2px dashed ${dragOver ? '#0F62FE' : uploading ? '#A6C8FF' : '#C1C7CD'}`,
            background: dragOver ? '#EDF5FF' : '#F7F8FA',
            borderRadius: '8px',
            padding: '36px 24px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'border-color 150ms ease, background 150ms ease',
            marginBottom: '16px',
          }}
        >
          {uploading ? (
            <>
              <div className="text-[13px] font-medium mb-1" style={{ color: '#525252' }}>
                Processing {fileName ?? 'file'}…
              </div>
              <div className="text-[12px]" style={{ color: '#697077' }}>
                Please wait while the file is being ingested
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-medium mb-1" style={{ color: '#161616' }}>
                Drag &amp; drop file here, or press Enter to browse
              </div>
              <div className="text-[12px]" style={{ color: '#697077' }}>
                Accepted formats: CSV, XLSX · Maximum recommended size: 10 MB
              </div>
            </>
          )}
          <input
            id="input-paimana-file"
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {/* Result message */}
        {msg && (
          <div
            id="upload-result"
            role="alert"
            aria-live="assertive"
          >
            <div
              className="px-3 py-3 rounded text-[13px]"
              style={{
                background: msg.ok ? '#DEFBE6' : '#FFF0F1',
                border: `1px solid ${msg.ok ? '#A7F0BA' : '#FF8389'}`,
                color: msg.ok ? '#198038' : '#DA1E28',
              }}
            >
              {msg.text}
            </div>
            {/* Show error details if any */}
            {msg.errors && msg.errors.length > 0 && (
              <div
                className="mt-2 px-3 py-2.5 rounded text-[12px]"
                style={{
                  background: '#FFF8E1',
                  border: '1px solid #FFD54F',
                  color: '#7C5300',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <strong>Details:</strong>
                {msg.errors.map((e, i) => (
                  <div key={i} style={{ marginTop: '2px' }}>• {e}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingestion log */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E0E4E8' }}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: '#161616' }}>Ingestion Log</h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#697077' }}>
              {logLoading ? 'Loading…' : `${total} total run${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={loadLog}
            className="btn-ghost py-1.5"
            style={{ fontSize: '12px' }}
            disabled={logLoading}
            aria-label="Refresh ingestion log"
          >
            Refresh
          </button>
        </div>

        {logError && (
          <div
            className="mx-6 my-4 px-3 py-2.5 rounded text-[13px]"
            style={{ background: '#FFF0F1', border: '1px solid #FF8389', color: '#DA1E28' }}
            role="alert"
          >
            {logError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table
            className="data-table"
            style={{ minWidth: '400px' }}
            aria-label="Ingestion history"
            aria-busy={logLoading}
          >
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Rows</th>
                <th scope="col" className="text-right">Projects Updated</th>
              </tr>
            </thead>
            <tbody>
              {logLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    <td colSpan={4} style={{ paddingTop: '14px', paddingBottom: '14px' }}>
                      <div className="skeleton h-4 rounded" style={{ width: '60%' }} />
                    </td>
                  </tr>
                ))
              ) : runs.length === 0 && !logError ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state py-10">
                      <p className="text-[14px] font-medium" style={{ color: '#161616' }}>
                        No ingestion runs
                      </p>
                      <p className="text-[13px] mt-1" style={{ color: '#697077' }}>
                        Upload a PAIMANA export above to start the first ingestion run.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                runs.map(r => {
                  const sc = statusColor(r.status)
                  return (
                    <tr key={r.ingestion_id}>
                      <td>
                        {r.timestamp ? (
                          <time
                            dateTime={r.timestamp}
                            className="text-[12px]"
                            style={{ color: '#525252' }}
                          >
                            {new Date(r.timestamp).toLocaleString('en-IN')}
                          </time>
                        ) : (
                          <span className="text-[12px]" style={{ color: '#8D8D8D' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.border}`,
                            fontSize: '11px',
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="text-right tabular" style={{ color: '#161616' }}>
                        {r.rows_processed.toLocaleString()}
                      </td>
                      <td className="text-right tabular" style={{ color: '#161616' }}>
                        {r.projects_updated.toLocaleString()}
                      </td>
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
