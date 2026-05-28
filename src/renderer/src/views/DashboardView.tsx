import { useState } from 'react'
import { Icon } from '../components/Icon'
import { HealthGauge, ThreatForecast, NetActivity } from '../components/charts'
import { useDevices } from '../hooks/useDevices'
import { useNetStats } from '../hooks/useNetStats'
import { useScan } from '../hooks/useScan'
import { useThreats } from '../hooks/useThreats'
import { useHealthScore } from '../hooks/useHealthScore'
import { useForecast } from '../hooks/useForecast'

export function DashboardView() {
  const { devices } = useDevices()
  const stats = useNetStats()
  const { result: scan } = useScan()
  const threats = useThreats()
  const healthScore = useHealthScore()
  const forecastData = useForecast()

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
              <div className="metric-val">{stats.rxMbps}</div>
              <div className="metric-lbl">RX Mb/s</div>
            </div>
            <div className="metric">
              <div className="metric-ico" style={{ color: "var(--blue)" }}><Icon name="ram" size={11}/></div>
              <div className="metric-val">{stats.txMbps}</div>
              <div className="metric-lbl">TX Mb/s</div>
            </div>
            <div className="metric">
              <div className="metric-ico" style={{ color: "var(--violet)" }}><Icon name="disk" size={11}/></div>
              <div className="metric-val">{devices.length}</div>
              <div className="metric-lbl">Devices</div>
            </div>
          </div>

          <HealthGauge value={healthScore} size={250}/>

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
              <div className="card-title">Threat Trend</div>
              <div className="card-sub">15-day rolling · live baseline</div>
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
          <ThreatForecast data={forecastData}/>
          <div className="insight">
            <span className="tag">⚡ Insight</span>
            <span>
              {scan.vulns.length > 0
                ? `Scan found ${scan.vulns.length} exposure finding(s). Review the Vulnerabilities tab and harden exposed services.`
                : threats.events.length > 0
                ? `Detected ${threats.events.length} network event(s). Review the Threats tab for details.`
                : 'No findings detected. Run a scan on the Vulnerabilities tab to assess current exposure.'}
            </span>
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
              {devices.slice(0, 5).map((d) => {
                const hostScan = scan.hosts.find((h) => h.mac === d.mac)
                const worstSev = hostScan?.worstSeverity
                const score = worstSev === 'Critical' ? 20 : worstSev === 'High' ? 50 : worstSev === 'Medium' ? 70 : 90
                const scoreState = worstSev === 'Critical' || worstSev === 'High' ? 'high' : worstSev === 'Medium' ? 'med' : 'low'
                const patchText = hostScan && hostScan.vulns.length > 0 ? `${hostScan.vulns.length} finding(s)` : 'Clear'
                const patchColor = patchText === 'Clear' ? 'var(--lime)' : 'var(--amber)'
                return (
                  <tr key={d.mac}>
                    <td><div className="conn"><div className="conn-ico"><Icon name={d.ico} size={13}/></div><span style={{ fontWeight: 500 }}>{d.type}</span></div></td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--ink-dim)" }}>{d.name}</td>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="mono" style={{ fontSize: 12 }}>{score}%</span><div className={`bar ${scoreState === 'high' ? 'red' : scoreState === 'med' ? 'warn' : ''}`}><i style={{ width: `${score}%` }}></i></div></div></td>
                    <td><span className={`sev ${worstSev === 'Critical' ? 'crit' : worstSev === 'High' ? 'high' : worstSev === 'Medium' ? 'med' : 'low'}`}><span className="dot" style={{ width: 5, height: 5, boxShadow: "none" }}></span>{worstSev ?? 'Low'}</span></td>
                    <td className="mono" style={{ fontSize: 11.5, color: patchColor }}>{patchText}</td>
                    <td><button className="btn ghost" style={{ padding: "5px 8px" }}><Icon name="chevron" size={12}/></button></td>
                  </tr>
                )
              })}
              {devices.length === 0 && (
                <tr><td colSpan={6} className="mono" style={{ textAlign: 'center', color: 'var(--ink-mute)', fontSize: 11.5 }}>Scanning your network…</td></tr>
              )}
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
