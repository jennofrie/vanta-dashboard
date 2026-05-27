import { THREATS_FEED } from '../data'
import { SEV_DOT, SEV_CLASS } from './constants'

export function AlertsView() {
  return (
    <div className="content fade-in">
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Alerts & Incidents</div>
            <div className="card-sub">8 open · 3 acknowledged</div>
          </div>
          <button className="btn primary">Acknowledge all</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {THREATS_FEED.slice(0, 5).map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: 14, borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)", alignItems: "center" }}>
              <span className={`dot ${SEV_DOT[t.sev] || ""}`} style={{ width: 8, height: 8 }}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 2 }}>{t.source} · {t.desc} · {t.time}</div>
              </div>
              <span className={`sev ${SEV_CLASS[t.sev]}`}>{t.sev}</span>
              <button className="btn ghost" style={{ padding: "6px 10px" }}>Investigate</button>
              <button className="btn" style={{ padding: "6px 10px" }}>Ack</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
