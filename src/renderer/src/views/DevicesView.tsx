import { useState } from 'react'
import { Icon } from '../components/Icon'
import { DEVICES } from '../data'

export function DevicesView() {
  const [list, setList] = useState(DEVICES);
  const toggleOnline = (i: number) => setList(l => l.map((d, j) => j === i ? { ...d, online: !d.online } : d));

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
