import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Sparkline } from '../components/charts'
import { VULNS } from '../data'
import { SEV_CLASS } from './constants'

export function VulnerabilitiesView() {
  const [sev, setSev] = useState("All");
  const filtered = sev === "All" ? VULNS : VULNS.filter(v => v.severity === sev);
  const counts: Record<string, number> = { Critical: 1, High: 2, Medium: 2, Low: 2 };

  return (
    <div className="content fade-in">
      <div className="vuln-grid">
        <div className="stat" style={{ borderColor: "oklch(0.50 0.22 28)" }}>
          <div className="num" style={{ color: "var(--red)" }}>1</div>
          <div className="lbl">Critical</div>
          <div className="trend up"><Icon name="arrow-up" size={10}/>+1 today</div>
          <div className="micro"><Sparkline data={[0,0,1,0,0,0,1]} color="var(--red)"/></div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: "var(--amber)" }}>2</div>
          <div className="lbl">High</div>
          <div className="trend down"><Icon name="arrow-dn" size={10}/>−2 this week</div>
          <div className="micro"><Sparkline data={[4,4,3,3,2,2,2]} color="var(--amber)"/></div>
        </div>
        <div className="stat">
          <div className="num">2</div>
          <div className="lbl">Medium</div>
          <div className="trend down"><Icon name="arrow-dn" size={10}/>−1 this week</div>
          <div className="micro"><Sparkline data={[3,3,3,3,2,2,2]} color="var(--blue)"/></div>
        </div>
        <div className="stat">
          <div className="num">2</div>
          <div className="lbl">Low</div>
          <div className="trend down"><Icon name="arrow-dn" size={10}/>−3 this month</div>
          <div className="micro"><Sparkline data={[5,4,4,3,3,2,2]} color="var(--lime)"/></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Active Vulnerabilities</div>
            <div className="card-sub">CVSS v4 · sorted by score</div>
          </div>
          <div className="filter-bar">
            {["All", "Critical", "High", "Medium", "Low"].map(s => (
              <button key={s} className={`chip ${sev === s ? "on" : ""}`} onClick={() => setSev(s)}>
                {s}{s !== "All" && <span className="mono" style={{ opacity: .7, marginLeft: 4 }}>{counts[s]}</span>}
              </button>
            ))}
          </div>
        </div>
        <table className="cve-table">
          <thead><tr>
            <th>CVE</th><th>Title</th><th>Score</th><th>Severity</th><th>Affected</th><th>Patch</th><th>Age</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.map((v) => {
              const c = v.severity === "Critical" ? "var(--red)" : v.severity === "High" ? "oklch(0.78 0.20 35)" : v.severity === "Medium" ? "var(--amber)" : "var(--lime)";
              return (
                <tr key={v.id}>
                  <td className="cve-id" style={{ color: "var(--ink)" }}>{v.id}</td>
                  <td style={{ maxWidth: 360 }}>{v.title}</td>
                  <td>
                    <div className="scorewrap">
                      <span className="score" style={{ color: c }}>{v.score}</span>
                      <div className="scoremeter"><i style={{ width: `${v.score * 10}%`, background: c }}></i></div>
                    </div>
                  </td>
                  <td><span className={`sev ${SEV_CLASS[v.severity]}`}>{v.severity}</span></td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>{v.system}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: v.patch === "Available" ? "var(--lime)" : v.patch === "Pending" ? "var(--amber)" : "var(--ink-mute)" }}>{v.patch}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{v.age}</td>
                  <td><Icon name="chevron" size={12}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
