import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Sparkline } from '../components/charts'
import { NETWORK_NODES, NETWORK_EDGES } from '../data'

export function NetworkView() {
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
                const A = NETWORK_NODES.find(n => n.id === a)!;
                const B = NETWORK_NODES.find(n => n.id === b)!;
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
