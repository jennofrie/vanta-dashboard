import { useState } from 'react'
import { Icon } from '../components/Icon'
import { HealthGauge, ThreatForecast, NetActivity } from '../components/charts'
import { FORECAST, SYSTEMS } from '../data'
import { SEV_CLASS } from './constants'

export function DashboardView() {
  const systemFilter = "All systems";
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);

  return (
    <div className="content fade-in">
      {/* Row 1: Health + Forecast */}
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">System Health</div>
              <div className="card-sub">Last scan · 2 min ago</div>
            </div>
            <button className="btn" onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 1200); }}>
              <Icon name="scan" size={13}/> {scanning ? "Scanning…" : "Run Scan"}
            </button>
          </div>

          <div className="metric-row">
            <div className="metric">
              <div className="metric-ico" style={{ color: "var(--lime)" }}><Icon name="cpu" size={11}/></div>
              <div className="metric-val">65<span style={{ fontSize: 11, color: "var(--ink-mute)" }}>%</span></div>
              <div className="metric-lbl">CPU</div>
            </div>
            <div className="metric">
              <div className="metric-ico" style={{ color: "var(--blue)" }}><Icon name="ram" size={11}/></div>
              <div className="metric-val">72<span style={{ fontSize: 11, color: "var(--ink-mute)" }}>%</span></div>
              <div className="metric-lbl">RAM</div>
            </div>
            <div className="metric">
              <div className="metric-ico" style={{ color: "var(--violet)" }}><Icon name="disk" size={11}/></div>
              <div className="metric-val">45<span style={{ fontSize: 11, color: "var(--ink-mute)" }}>%</span></div>
              <div className="metric-lbl">Disk</div>
            </div>
          </div>

          <HealthGauge value={76} size={250}/>

          <div className="kv-list">
            <div className="kv"><span className="k">Firewall</span><span className="v ok">● Active</span></div>
            <div className="kv"><span className="k">SIEM Agent</span><span className="v ok">● Connected</span></div>
            <div className="kv"><span className="k">AI Monitor</span><span className="v ok">Enabled</span></div>
            <div className="kv"><span className="k">SSL Certificate</span><span className="v ok">Valid</span></div>
            <div className="kv"><span className="k">DLP</span><span className="v ok">Enabled</span></div>
            <div className="kv"><span className="k">Backup</span><span className="v warn">12h ago</span></div>
            <div className="kv"><span className="k">Patches</span><span className="v warn">5 pending</span></div>
            <div className="kv"><span className="k">Domain</span><span className="v">vanta.lan</span></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">AI Threat Forecast</div>
              <div className="card-sub">15-day horizon · model v2.1</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="legend">
                <span><i style={{ background: "oklch(0.88 0.22 135)" }}></i>Actual</span>
                <span><i style={{ background: "oklch(0.72 0.10 250)", outline: "1px dashed oklch(0.72 0.10 250)" }}></i>Predicted</span>
              </div>
              <button className="btn ghost" onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }}>
                <Icon name="refresh" size={13} style={{ animation: refreshing ? "spin 1s linear" : "none" }}/> Refresh
              </button>
            </div>
          </div>
          <ThreatForecast data={FORECAST}/>
          <div className="insight">
            <span className="tag">⚡ Insight</span>
            <span>The system detects elevated risk of network intrusions; deviation (+17%) impacts <strong>Lock</strong> and <strong>Cloud</strong> connectors. Consider review of manual patch queue.</span>
          </div>
        </div>
      </div>

      {/* Row 2: Connected Systems + Network Activity */}
      <div className="grid-2b">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Connected Systems</div>
              <div className="card-sub">5 of 12 visible</div>
            </div>
            <div className="filter-bar">
              <button className="chip"><Icon name="filter" size={11}/> View: {systemFilter}</button>
              <button className="chip"><Icon name="more" size={11}/></button>
            </div>
          </div>
          <table className="systems">
            <thead><tr>
              <th>Connector</th><th>Workload</th><th>Security score</th><th>Threats</th><th>Patches</th><th></th>
            </tr></thead>
            <tbody>
              {SYSTEMS.map((s, i) => (
                <tr key={i}>
                  <td>
                    <div className="conn">
                      <div className="conn-ico"><Icon name={s.ico} size={13}/></div>
                      <span style={{ fontWeight: 500 }}>{s.connector}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--ink-dim)" }}>{s.workload}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 12 }}>{s.score}%</span>
                      <div className={`bar ${s.state === "high" ? "red" : s.state === "med" ? "warn" : ""}`}>
                        <i style={{ width: `${s.score}%` }}></i>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`sev ${SEV_CLASS[s.threats === "Med" ? "Medium" : s.threats]}`}>
                      <span className="dot" style={{ width: 5, height: 5, boxShadow: "none" }}></span>{s.threats}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 11.5, color: s.patches.includes("Up") ? "var(--lime)" : "var(--amber)" }}>{s.patches}</td>
                  <td><button className="btn ghost" style={{ padding: "5px 8px" }}><Icon name="chevron" size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Network Activity</div>
              <div className="card-sub">live · {new Date().toTimeString().slice(0, 8)}</div>
            </div>
            <div className="tabbar">
              <button className="on">ALL</button>
              <button>1H</button>
              <button>1D</button>
              <button>7D</button>
              <button>1M</button>
            </div>
          </div>
          <NetActivity/>
        </div>
      </div>
    </div>
  );
}
