// Views: Dashboard, Network, Vulnerabilities, Devices, Threats, Alerts, Settings, Help
const { HealthGauge, ThreatForecast, Sparkline, NetActivity } = window.CHARTS;
const { FORECAST, SYSTEMS, DEVICES, VULNS, THREATS_FEED, NETWORK_NODES, NETWORK_EDGES } = window.DATA;

const SEV_DOT = { Critical: "red", High: "red", Medium: "amber", Low: "" };
const SEV_CLASS = { Critical: "crit", High: "high", Medium: "med", Low: "low" };

// ------------- Dashboard --------------
function DashboardView() {
  const [systemFilter, setSystemFilter] = useState("All systems");
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

// ------------- Network --------------
function NetworkView() {
  const [selected, setSelected] = useState("auth");
  const sel = NETWORK_NODES.find(n => n.id === selected) || NETWORK_NODES[0];

  return (
    <div className="content fade-in">
      <div className="vuln-grid">
        <div className="stat"><div className="num">42</div><div className="lbl">Devices</div><div className="trend up"><Icon name="arrow-up" size={10}/>+2 this week</div><Sparkline data={[28,30,29,33,38,40,42]} color="var(--lime)"/></div>
        <div className="stat"><div className="num">128<span style={{ fontSize: 13, color: "var(--ink-mute)" }}> Mb/s</span></div><div className="lbl">Ingress</div><div className="trend down"><Icon name="arrow-dn" size={10}/>−12% vs avg</div><Sparkline data={[90,110,140,120,130,128,128]} color="var(--blue)"/></div>
        <div className="stat"><div className="num">84<span style={{ fontSize: 13, color: "var(--ink-mute)" }}> Mb/s</span></div><div className="lbl">Egress</div><div className="trend up"><Icon name="arrow-up" size={10}/>+8% vs avg</div><Sparkline data={[60,72,80,82,78,84,84]} color="var(--amber)"/></div>
        <div className="stat"><div className="num">3</div><div className="lbl">Anomalies</div><div className="trend up"><Icon name="arrow-up" size={10}/>+1 in last hr</div><Sparkline data={[0,1,2,2,1,2,3]} color="var(--red)"/></div>
      </div>

      <div className="topology">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Network Topology</div>
              <div className="card-sub">{NETWORK_NODES.length} nodes · {NETWORK_EDGES.length} edges</div>
            </div>
            <div className="filter-bar">
              <button className="chip on">Live</button>
              <button className="chip">Path</button>
              <button className="chip">Heatmap</button>
            </div>
          </div>
          <div className="map topo-map">
            <div className="map-grid"></div>
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
              {NETWORK_EDGES.map(([a, b], i) => {
                const A = NETWORK_NODES.find(n => n.id === a);
                const B = NETWORK_NODES.find(n => n.id === b);
                const hot = A.state === "red" || B.state === "red";
                return (
                  <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                    stroke={hot ? "oklch(0.70 0.22 28)" : "oklch(0.30 0.014 250)"}
                    strokeWidth="0.18"
                    strokeDasharray={hot ? "0.4 0.4" : "0"}
                    opacity={hot ? 0.9 : 0.7} vectorEffect="non-scaling-stroke"/>
                );
              })}
            </svg>
            {NETWORK_NODES.map(n => (
              <div key={n.id} className={`node ${n.state}`} style={{ left: `${n.x}%`, top: `${n.y}%` }} onClick={() => setSelected(n.id)}>
                {n.state === "red" && <><div className="pulse" style={{ width: 30, height: 30 }}></div><div className="pulse b" style={{ width: 30, height: 30 }}></div></>}
                <div className="core" style={{ outline: n.id === selected ? "2px solid var(--lime)" : "none", outlineOffset: 3 }}><Icon name={n.ico} size={13}/></div>
                <div className="label">{n.label}</div>
              </div>
            ))}
            <div className="map-info">{NETWORK_EDGES.length} paths · 2 anomalous</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Nodes</div>
              <div className="card-sub">{NETWORK_NODES.length} total</div>
            </div>
            <button className="btn ghost"><Icon name="filter" size={12}/></button>
          </div>
          <div className="side-list">
            {NETWORK_NODES.map(n => (
              <div key={n.id} className="side-row" onClick={() => setSelected(n.id)} style={{ background: selected === n.id ? "var(--bg-2)" : "" }}>
                <div className="dotwrap"><span className={`dot ${n.state === "ok" ? "" : n.state}`}></span></div>
                <div className="conn-ico" style={{ width: 28, height: 28 }}><Icon name={n.ico} size={13}/></div>
                <div style={{ flex: 1 }}>
                  <div className="name">{n.label}</div>
                  <div className="meta">{n.meta}</div>
                </div>
                <Icon name="chevron" size={12}/>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div className="conn-ico"><Icon name={sel.ico} size={14}/></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{sel.label}</div>
                <div className="card-sub" style={{ marginTop: 1 }}>{sel.meta}</div>
              </div>
            </div>
            <div className="kv-list" style={{ marginTop: 4, paddingTop: 10, gridTemplateColumns: "1fr" }}>
              <div className="kv"><span className="k">Status</span><span className={`v ${sel.state === "red" ? "bad" : sel.state === "warn" ? "warn" : "ok"}`}>● {sel.state.toUpperCase()}</span></div>
              <div className="kv"><span className="k">Latency</span><span className="v">14 ms</span></div>
              <div className="kv"><span className="k">Throughput</span><span className="v">62 Mb/s</span></div>
              <div className="kv"><span className="k">Open ports</span><span className="v">22, 80, 443</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------- Vulnerabilities --------------
function VulnerabilitiesView() {
  const [sev, setSev] = useState("All");
  const filtered = sev === "All" ? VULNS : VULNS.filter(v => v.severity === sev);
  const counts = { Critical: 1, High: 2, Medium: 2, Low: 2 };

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
            {filtered.map((v, i) => {
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

// ------------- Devices --------------
function DevicesView() {
  const [list, setList] = useState(DEVICES);
  const toggleOnline = (i) => setList(l => l.map((d, j) => j === i ? { ...d, online: !d.online } : d));

  return (
    <div className="content fade-in">
      <div className="vuln-grid">
        <div className="stat"><div className="num">{list.length}</div><div className="lbl">Total devices</div></div>
        <div className="stat"><div className="num" style={{ color: "var(--lime)" }}>{list.filter(d => d.online).length}</div><div className="lbl">Online</div></div>
        <div className="stat"><div className="num" style={{ color: "var(--ink-mute)" }}>{list.filter(d => !d.online).length}</div><div className="lbl">Offline</div></div>
        <div className="stat"><div className="num">2</div><div className="lbl">Awaiting pair</div></div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Connected Devices</div>
            <div className="card-sub">vanta.lan · WPA3</div>
          </div>
          <button className="btn primary"><Icon name="plus" size={13}/> Connect device</button>
        </div>

        <div className="dev-grid">
          {list.map((d, i) => (
            <div key={i} className="device">
              <div className="device-head">
                <div className="device-icon"><Icon name={d.ico} size={18}/></div>
                <div>
                  <div className="device-name">{d.name}</div>
                  <div className="device-meta">{d.type} · {d.role}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <span className={`dot ${d.online ? "" : ""}`} style={{ background: d.online ? "var(--lime)" : "var(--ink-mute)", boxShadow: d.online ? "0 0 0 3px oklch(0.88 0.22 135 / .15)" : "none" }}></span>
                </div>
              </div>
              <div className="device-stat">
                <span><Icon name="wifi" size={11} style={{ verticalAlign: "-2px", color: d.online ? "var(--lime)" : "var(--ink-mute)" }}/> {d.online ? `${d.signal}%` : "Offline"}</span>
                <span>{d.ip}</span>
              </div>
              <div className="device-meta">MAC {d.mac}</div>
              <div className="device-actions">
                <button onClick={() => toggleOnline(i)}>{d.online ? "Disconnect" : "Reconnect"}</button>
                <button className="pri">Manage</button>
              </div>
            </div>
          ))}

          <div className="device add" onClick={() => alert("Connect device flow — would open onboarding")}>
            <div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-2)", border: "1px dashed var(--border-2)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                <Icon name="plus" size={20}/>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Connect a device</div>
              <div className="device-meta" style={{ marginTop: 6 }}>Pair via QR, WPS, or manual setup</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------- Threats --------------
function ThreatsView() {
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
            <div className="card-sub">streaming · last 24 hr</div>
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

// ------------- Alerts -------------
function AlertsView() {
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

// ------------- Settings / Help (stubs) -------------
function StubView({ title, msg }) {
  return (
    <div className="content fade-in">
      <div className="card" style={{ minHeight: 360, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{title}</div>
          <div style={{ color: "var(--ink-mute)", marginTop: 8 }}>{msg}</div>
        </div>
      </div>
    </div>
  );
}

window.VIEWS = { DashboardView, NetworkView, VulnerabilitiesView, DevicesView, ThreatsView, AlertsView, StubView };
