// src/pages/SectorsPage.tsx
import React, { useState } from "react"
import { Link } from "react-router-dom"
import PublicLayout from "../components/PublicLayout"
import { usePageTitle } from "../hooks/usePageTitle"

const SECTORS = [
  {
    tag: "MoRTH", label: "Roads & Highways", count: "340+", emoji: "🛣️",
    ministry: "Ministry of Road Transport & Highways",
    description: "PRAGATI-AI monitors the largest infrastructure portfolio in India — spanning national highways, expressways, bypass roads, bridges, tunnels, and flyovers. The sector accounts for the highest capital expenditure of all monitored domains, with projects often spanning multiple states and land jurisdictions.",
    types: ["National Highways", "Expressway Corridors", "Bridge & Flyover Projects", "Bypass & Ring Roads", "Hill Road Development (NHIDCL)"],
    riskDrivers: ["Land Acquisition Delays", "Multi-state Contractor Disputes", "Monsoon & Seasonal Impact", "Environmental Clearance Lag", "Utility Shifting Bottlenecks"],
    totalOutlay: "₹14.2 Lakh Cr.",
    avgDelay: "8.4 months",
  },
  {
    tag: "MoR", label: "Railways", count: "180+", emoji: "🚂",
    ministry: "Ministry of Railways",
    description: "Railway infrastructure projects tracked include dedicated freight corridors, new line construction, doubling & electrification of existing lines, high-speed rail feasibility, and station redevelopment under the AMRIT Bharat Station Scheme. These projects involve complex multi-zone coordination across 18 Railway Zones.",
    types: ["Dedicated Freight Corridors", "New Line Construction", "Track Doubling & Electrification", "Station Redevelopment", "Signaling Modernisation"],
    riskDrivers: ["Land Acquisition in Dense Corridors", "Multi-Zone Contractor Coordination", "Rolling Stock Delivery Delays", "Utility Diversion Costs", "Monsoon Work Stoppages"],
    totalOutlay: "₹8.6 Lakh Cr.",
    avgDelay: "11.2 months",
  },
  {
    tag: "MoP", label: "Energy & Power", count: "260+", emoji: "⚡",
    ministry: "Ministry of Power",
    description: "Covers transmission infrastructure, interstate grid strengthening, renewable energy integration projects, and power plant capacity additions. With India's RE targets of 500 GW by 2030, this sector sees the highest number of newly added projects each quarter under the Green Energy Corridor initiative.",
    types: ["Transmission Line Projects", "Green Energy Corridors", "Interstate Grid Interconnects", "Solar Park Grid Integration", "Pumped Storage Projects"],
    riskDrivers: ["Right-of-Way Clearances", "Equipment Import Lead Times", "Grid Stability Integration Risk", "Renewable Intermittency Challenges", "State Utility Coordination"],
    totalOutlay: "₹11.4 Lakh Cr.",
    avgDelay: "6.8 months",
  },
  {
    tag: "MoCA", label: "Civil Aviation", count: "85+", emoji: "✈️",
    ministry: "Ministry of Civil Aviation",
    description: "Airport expansion, new Greenfield airports under the UDAN regional connectivity scheme, runway extensions, terminal capacity additions, and air traffic control modernisation. The sector has seen accelerated investment following post-pandemic air traffic recovery exceeding pre-COVID levels.",
    types: ["Greenfield Airport Development", "Runway Extension Projects", "Terminal Capacity Expansion", "ATC & Navigation Systems", "UDAN Regional Connectivity"],
    riskDrivers: ["Environmental & Forest Clearances", "DGCA Regulatory Approvals", "Land Acquisition near Urban Areas", "Archaeological Survey Clearances", "Airspace Restriction Constraints"],
    totalOutlay: "₹3.8 Lakh Cr.",
    avgDelay: "9.1 months",
  },
  {
    tag: "MoHUA", label: "Urban Development", count: "220+", emoji: "🏙️",
    ministry: "Ministry of Housing & Urban Affairs",
    description: "Tracks metro rail system expansions, Smart City Mission infrastructure deployments, AMRUT water & sewage projects, and urban road/flyover construction. As India's urban population grows toward 600 million by 2036, this sector's project pipeline is among the fastest-expanding monitored.",
    types: ["Metro Rail Expansion", "Smart City Infrastructure", "AMRUT Water & Sewage Systems", "Urban Flyovers & Underpasses", "Affordable Housing (PMAY-U)"],
    riskDrivers: ["Underground Utility Conflicts", "Dense Urban Land Acquisition", "Traffic Diversion Logistics", "Inter-agency Clearance Complexity", "Monsoon Drainage Work Restrictions"],
    totalOutlay: "₹7.1 Lakh Cr.",
    avgDelay: "7.6 months",
  },
  {
    tag: "MoPSW", label: "Ports & Waterways", count: "115+", emoji: "⚓",
    ministry: "Ministry of Ports, Shipping & Waterways",
    description: "Monitors deepwater berth development, port mechanisation, Sagarmala multimodal logistics connectivity, National Waterways development, and coastal shipping infrastructure. India's ambitious target of tripling port capacity by 2047 makes this one of the highest-growth capex sectors.",
    types: ["Deepwater Berth Development", "Port Mechanisation", "Sagarmala Connectivity Projects", "National Waterways Development", "Coastal Shipping Infrastructure"],
    riskDrivers: ["Marine Environmental Clearances", "Dredging Technical Complexity", "Tidal & Weather Interruptions", "Customs & DGFT Coordination", "Inter-state Waterway Jurisdiction"],
    totalOutlay: "₹4.3 Lakh Cr.",
    avgDelay: "5.9 months",
  },
]

export default function SectorsPage() {
  usePageTitle("Sectors — PRAGATI-AI")
  const [active, setActive] = useState<number | null>(null)
  return (
    <PublicLayout>
      <section className="lp-page-hero">
        <div className="lp-container lp-page-hero-inner">
          <div className="lp-page-breadcrumb"><Link to="/">Home</Link><span> / </span><span>Sectors</span></div>
          <p className="lp-eyebrow lp-eyebrow-light">Coverage</p>
          <h1 className="lp-page-h1">Six Critical Infrastructure Sectors</h1>
          <p className="lp-page-hero-sub">PRAGATI-AI covers all major central government capital expenditure sectors tracked under MoSPI's PAIMANA monitoring framework — totalling ₹49+ Lakh Crore in active project portfolio.</p>
        </div>
      </section>

      {/* Aggregate stats */}
      <div className="lp-metrics-band">
        <div className="lp-container lp-metrics-grid">
          {[
            { value: "1,200+", label: "Total Projects Monitored" },
            { value: "6",      label: "Critical Sectors"         },
            { value: "₹49+ Lakh Cr.", label: "Total Portfolio Outlay" },
            { value: "28",     label: "States & UTs Covered"    },
          ].map((m, i) => (
            <div key={i} className="lp-metric">
              <div className="lp-metric-num">{m.value}</div>
              <div className="lp-metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="lp-page-section lp-section-white">
        <div className="lp-container">
          <div className="lp-sectors-detail-grid">
            {SECTORS.map((s, i) => (
              <div key={i} className={"lp-sector-detail-card" + (active === i ? " lp-sector-detail-card--open" : "")}>
                <div className="lp-sector-detail-header" onClick={() => setActive(active === i ? null : i)}>
                  <span className="lp-sector-detail-emoji">{s.emoji}</span>
                  <div className="lp-sector-detail-title-group">
                    <div className="lp-sector-detail-name">{s.label}</div>
                    <div className="lp-sector-detail-ministry">{s.ministry}</div>
                  </div>
                  <div className="lp-sector-detail-meta">
                    <span className="lp-sector-tag">{s.tag}</span>
                    <span className="lp-sector-count">{s.count} projects</span>
                  </div>
                  <svg className="lp-sector-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {active === i ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                  </svg>
                </div>
                {active === i && (
                  <div className="lp-sector-detail-body">
                    <p className="lp-body" style={{ marginBottom: "24px" }}>{s.description}</p>
                    <div className="lp-sector-detail-cols">
                      <div>
                        <div className="lp-sector-detail-list-title">Project Types</div>
                        <ul className="lp-sector-detail-list">
                          {s.types.map((t, j) => <li key={j}>{t}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="lp-sector-detail-list-title">Key Risk Drivers</div>
                        <ul className="lp-sector-detail-list lp-sector-detail-list--risk">
                          {s.riskDrivers.map((r, j) => <li key={j}>{r}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="lp-sector-detail-stats">
                      <div className="lp-sector-stat"><span className="lp-sector-stat-val">{s.totalOutlay}</span><span className="lp-sector-stat-label">Total Portfolio Outlay</span></div>
                      <div className="lp-sector-stat"><span className="lp-sector-stat-val">{s.avgDelay}</span><span className="lp-sector-stat-label">Average Schedule Delay</span></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-page-section lp-section-dark" style={{ textAlign: "center" }}>
        <div className="lp-container">
          <h2 className="lp-h2 lp-h2-white" style={{ marginBottom: "12px" }}>See Projects on the Map</h2>
          <p className="lp-body lp-body-light" style={{ marginBottom: "32px" }}>Explore state-wise project distribution and risk heat-map across all six sectors.</p>
          <Link to="/state-map" className="lp-btn-primary" id="sectors-map-btn">
            Open Interactive State Map
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
