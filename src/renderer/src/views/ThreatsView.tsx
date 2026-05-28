import { useState } from 'react'
import { SEV_DOT, SEV_CLASS } from './constants'
import { useThreats } from '../hooks/useThreats'

export function ThreatsView() {
  const { events: THREATS_FEED, lastUpdated } = useThreats()
  const [sev, setSev] = useState("All");
  const filtered = sev === "All" ? THREATS_FEED : THREATS_FEED.filter(t => t.sev === sev);
  return (
    <div className="content fade-in">
      <div className="vuln-grid">
        <div className="stat"><div className="num" style={{ color: "var(--red)" }}>{THREATS_FEED.filter(t=>t.sev==="Critical").length}</div><div className="lbl">Critical</div></div>
        <div className="stat"><div className="num" style={{ color: "var(--amber)" }}>{THREATS_FEED.filter(t=>t.sev==="High").length}</div><div className="lbl">High</div></div>
        <div className="stat"><div className="num">{THREATS_FEED.filter(t=>t.sev==="Medium").length}</div><div className="lbl">Medium</div></div>
        <div className="stat"><div className="num">{THREATS_FEED.filter(t=>t.sev==="Low").length}</div><div className="lbl">Low</div></div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Live Threat Feed</div>
            <div className="card-sub">streaming · live</div>
          </div>
          <div className="filter-bar">
            {["All", "Critical", "High", "Medium", "Low"].map(s => (
              <button key={s} className={`chip ${sev === s ? "on" : ""}`} onClick={() => setSev(s)}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "18px 80px 1fr 110px 110px 80px", gap: 14, padding: "0 12px 10px", borderBottom: "1px solid var(--border)", fontSize: 10.5, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: ".1em" }}>
          <span></span><span>Source</span><span>Event</span><span>Region</span><span>Severity</span><span>Time</span>
        </div>
        {filtered.length === 0 && (
          <div className="card-sub">
            {lastUpdated ? 'No threat events detected.' : 'Monitoring your network — events appear here when detected.'}
          </div>
        )}
        {filtered.map((t, i) => (
          <div key={i} className="thr-row">
            <span className={`dot ${SEV_DOT[t.sev] || ""}`}></span>
            <span className="src">{t.source}</span>
            <div>
              <div className="ttl">{t.title}</div>
              <div className="desc mono">{t.desc}</div>
            </div>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>{t.region}</span>
            <span><span className={`sev ${SEV_CLASS[t.sev]}`}>{t.sev}</span></span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-mute)" }}>{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
