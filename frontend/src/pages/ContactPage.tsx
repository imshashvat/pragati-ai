// src/pages/ContactPage.tsx
// Contact & Grievance form — sends email to shashvatt68@gmail.com via EmailJS
// EmailJS env vars: VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY

import React, { useState, useRef } from "react"
import emailjs from "@emailjs/browser"
import { Link } from "react-router-dom"
import PublicLayout from "../components/PublicLayout"
import { usePageTitle } from "../hooks/usePageTitle"

const CATEGORIES = [
  "General Inquiry",
  "Technical Issue",
  "Project Data Discrepancy",
  "Officer Access Request",
  "Media / Press Inquiry",
  "Policy / Governance Query",
]

const FAQS = [
  {
    q: "How do I get access to the PRAGATI-AI platform?",
    a: "Access is restricted to authorised government officers from MoSPI, nodal ministries, and partner agencies. Submit an 'Officer Access Request' via the form above, or email your ministry's PAIMANA nodal officer. Access requests are reviewed and provisioned within 5 working days.",
  },
  {
    q: "I found incorrect data for a project in my state. What should I do?",
    a: "Please submit a 'Project Data Discrepancy' inquiry with the Project ID, discrepant field, and correct value as per your ministry's records. Our data team will verify against the source OCMS upload and issue a corrected record within 10 working days.",
  },
  {
    q: "How often is the project data and risk scores updated?",
    a: "PRAGATI-AI ingests monthly OCMS flash data uploads from ministries. Risk scores and alerts are refreshed following each successful ingestion cycle, typically in the first week of each month. Emergency data corrections can be uploaded on request.",
  },
  {
    q: "Is PRAGATI-AI available on mobile?",
    a: "PRAGATI-AI is a responsive web platform optimised for desktop and tablet use, as it is designed for detailed project analysis by government officers. A dedicated mobile dashboard for senior officials is under development and expected in Q4 2026.",
  },
]

function generateRefId() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `PRAGATI-GRV-2026-${n}`
}

type FormState = {
  name: string
  email: string
  ministry: string
  subject: string
  category: string
  message: string
}

const EMPTY: FormState = { name: "", email: "", ministry: "", subject: "", category: CATEGORIES[0], message: "" }

export default function ContactPage() {
  usePageTitle("Contact Us — PRAGATI-AI")
  const formRef = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [refId, setRefId]   = useState("")
  const [errMsg, setErrMsg] = useState("")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.message.length < 20) { setErrMsg("Message must be at least 20 characters."); return }
    setErrMsg("")
    setStatus("loading")

    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string

    try {
      // If EmailJS is not yet configured, show a "demo" success
      if (!serviceId || !templateId || !publicKey) {
        await new Promise(r => setTimeout(r, 1200))
        const id = generateRefId()
        setRefId(id)
        setStatus("success")
        setForm(EMPTY)
        return
      }
      await emailjs.send(
        serviceId, templateId,
        {
          from_name:    form.name,
          from_email:   form.email,
          ministry:     form.ministry || "Not specified",
          category:     form.category,
          subject:      form.subject,
          message:      form.message,
          to_email:     "shashvatt68@gmail.com",
          reply_to:     form.email,
        },
        publicKey
      )
      const id = generateRefId()
      setRefId(id)
      setStatus("success")
      setForm(EMPTY)
    } catch (err) {
      console.error(err)
      setStatus("error")
    }
  }

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="lp-page-hero">
        <div className="lp-container lp-page-hero-inner">
          <div className="lp-page-breadcrumb"><Link to="/">Home</Link><span> / </span><span>Contact</span></div>
          <p className="lp-eyebrow lp-eyebrow-light">Get in Touch</p>
          <h1 className="lp-page-h1">Contact PRAGATI-AI</h1>
          <p className="lp-page-hero-sub">Reach the MoSPI PAIMANA team for platform access requests, technical support, project data queries, or general inquiries.</p>
        </div>
      </section>

      {/* MAIN CONTACT SECTION */}
      <section className="lp-page-section lp-section-white">
        <div className="lp-container">
          <div className="lp-contact-layout">

            {/* Left — Ministry info */}
            <div className="lp-contact-info">
              <h2 className="lp-h2" style={{ fontSize: "1.4rem", marginBottom: "24px" }}>Ministry Contact Details</h2>

              <div className="lp-contact-card">
                <div className="lp-contact-card-icon">🏛️</div>
                <div>
                  <div className="lp-contact-card-title">Ministry Headquarters</div>
                  <p className="lp-contact-card-body">
                    Ministry of Statistics and Programme Implementation<br />
                    Sardar Patel Bhawan, Sansad Marg<br />
                    New Delhi — 110001<br />
                    Government of India
                  </p>
                </div>
              </div>

              <div className="lp-contact-card">
                <div className="lp-contact-card-icon">📧</div>
                <div>
                  <div className="lp-contact-card-title">Official Email</div>
                  <a href="mailto:pragati-ai@mospi.gov.in" className="lp-contact-email">pragati-ai@mospi.gov.in</a>
                  <p className="lp-contact-card-body">For official government correspondence only</p>
                </div>
              </div>

              <div className="lp-contact-card">
                <div className="lp-contact-card-icon">📞</div>
                <div>
                  <div className="lp-contact-card-title">IPMD Helpdesk</div>
                  <p className="lp-contact-card-body">+91 11-2337-4006<br />Working Hours: 9:30 AM – 6:00 PM (Mon–Fri, except Govt. holidays)</p>
                </div>
              </div>

              <div className="lp-contact-card">
                <div className="lp-contact-card-icon">💻</div>
                <div>
                  <div className="lp-contact-card-title">NIC Technical Support</div>
                  <p className="lp-contact-card-body">For platform access issues, data upload errors, or technical bugs — use the inquiry form or email helpdesk@nic.in with subject: PRAGATI-AI Support.</p>
                </div>
              </div>
            </div>

            {/* Right — Contact Form */}
            <div className="lp-contact-form-wrap">
              <h2 className="lp-h2" style={{ fontSize: "1.4rem", marginBottom: "8px" }}>Submit an Inquiry</h2>
              <p className="lp-body" style={{ marginBottom: "28px", color: "#525252" }}>
                All submissions are acknowledged with a reference ID and reviewed within 5 working days.
              </p>

              {status === "success" ? (
                <div className="lp-form-success">
                  <div className="lp-form-success-icon">✅</div>
                  <h3>Inquiry Submitted Successfully</h3>
                  <p>Your inquiry has been received and will be reviewed by the PAIMANA team within 5 working days.</p>
                  <div className="lp-form-refid">Reference ID: <strong>{refId}</strong></div>
                  <p style={{ fontSize: "0.8rem", color: "#525252", marginTop: "8px" }}>Please retain this reference ID for follow-up correspondence.</p>
                  <button className="lp-btn-primary" style={{ marginTop: "20px" }} onClick={() => setStatus("idle")}>Submit Another Inquiry</button>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="lp-contact-form" noValidate>
                  <div className="lp-form-row">
                    <div className="lp-form-group">
                      <label className="lp-form-label" htmlFor="cf-name">Full Name <span className="lp-form-req">*</span></label>
                      <input id="cf-name" className="lp-form-input" type="text" placeholder="Your full name" required value={form.name} onChange={set("name")} />
                    </div>
                    <div className="lp-form-group">
                      <label className="lp-form-label" htmlFor="cf-email">Official Email <span className="lp-form-req">*</span></label>
                      <input id="cf-email" className="lp-form-input" type="email" placeholder="name@ministry.gov.in" required value={form.email} onChange={set("email")} />
                    </div>
                  </div>

                  <div className="lp-form-row">
                    <div className="lp-form-group">
                      <label className="lp-form-label" htmlFor="cf-ministry">Ministry / Department</label>
                      <input id="cf-ministry" className="lp-form-input" type="text" placeholder="e.g. Ministry of Railways" value={form.ministry} onChange={set("ministry")} />
                    </div>
                    <div className="lp-form-group">
                      <label className="lp-form-label" htmlFor="cf-category">Category <span className="lp-form-req">*</span></label>
                      <select id="cf-category" className="lp-form-input lp-form-select" required value={form.category} onChange={set("category")}>
                        {CATEGORIES.map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="lp-form-group" style={{ marginBottom: "18px" }}>
                    <label className="lp-form-label" htmlFor="cf-subject">Subject <span className="lp-form-req">*</span></label>
                    <input id="cf-subject" className="lp-form-input" type="text" placeholder="Brief subject of your inquiry" required value={form.subject} onChange={set("subject")} />
                  </div>

                  <div className="lp-form-group" style={{ marginBottom: "18px" }}>
                    <label className="lp-form-label" htmlFor="cf-message">Message <span className="lp-form-req">*</span></label>
                    <textarea id="cf-message" className="lp-form-input lp-form-textarea" placeholder="Provide details of your inquiry (minimum 20 characters)..." required value={form.message} onChange={set("message")} rows={6} />
                    <div className="lp-form-char">{form.message.length} characters{form.message.length < 20 ? ` (${20 - form.message.length} more needed)` : ""}</div>
                  </div>

                  {errMsg && <div className="lp-form-error">{errMsg}</div>}

                  {status === "error" && (
                    <div className="lp-form-error" style={{ marginBottom: "16px" }}>
                      Submission failed. Please try again or email directly at pragati-ai@mospi.gov.in
                    </div>
                  )}

                  <button type="submit" className="lp-btn-primary" id="contact-submit-btn" disabled={status === "loading"} style={{ width: "100%", justifyContent: "center" }}>
                    {status === "loading" ? (
                      <><span className="lp-form-spinner" />Sending...</>
                    ) : (
                      <>Submit Inquiry <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                    )}
                  </button>
                  <p style={{ fontSize: "0.73rem", color: "#697077", marginTop: "12px", textAlign: "center" }}>
                    By submitting, you agree this inquiry may be reviewed by authorised MoSPI officers.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="lp-page-section lp-section-pale">
        <div className="lp-container">
          <div className="lp-section-head">
            <p className="lp-eyebrow">FAQ</p>
            <h2 className="lp-h2">Frequently Asked Questions</h2>
          </div>
          <div className="lp-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className={"lp-faq-item" + (openFaq === i ? " lp-faq-item--open" : "")}>
                <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {faq.q}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {openFaq === i ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                  </svg>
                </button>
                {openFaq === i && <p className="lp-faq-a">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
