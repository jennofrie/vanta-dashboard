import { useState } from 'react'
import { Icon } from './components/Icon'
import { DashboardView } from './views/DashboardView'
import { NetworkView } from './views/NetworkView'
import { VulnerabilitiesView } from './views/VulnerabilitiesView'
import { DevicesView } from './views/DevicesView'
import { ThreatsView } from './views/ThreatsView'
import { AlertsView } from './views/AlertsView'
import { StubView } from './views/StubView'

type NavItem = { id: string; label: string; icon: string; badge?: { text: string; cls: string } }
const NAV: NavItem[] = [
  { id: "dashboard",       label: "Dashboard",         icon: "grid" },
  { id: "threats",         label: "Threats",           icon: "threat", badge: { text: "6", cls: "red" } },
  { id: "alerts",          label: "Alerts & Incidents",icon: "bell" , badge: { text: "3", cls: "warn" } },
  { id: "devices",         label: "Devices",           icon: "device" },
  { id: "network",         label: "Network",           icon: "network", badge: { text: "Live", cls: "" } },
  { id: "vulnerabilities", label: "Vulnerabilities",   icon: "bug" },
]

function App() {
  const [view, setView] = useState("dashboard");

  const breadcrumb = NAV.find(n => n.id === view)?.label || "Dashboard";

  return (
    <div className="app" data-screen-label={"01 " + breadcrumb}>
      {/* ------- Sidebar ------- */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>V</span></div>
          <div>
            <div className="brand-name">VANTA</div>
            <div className="brand-sub">SEC · OPS</div>
          </div>
        </div>

        <div className="nav-section">
          {NAV.map(n => (
            <div key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
              <Icon name={n.icon}/>
              <span>{n.label}</span>
              {n.badge && <span className={`nav-badge ${n.badge.cls}`}>{n.badge.text}</span>}
            </div>
          ))}
        </div>

        <div className="upsell">
          <h4>Upgrade to PRO</h4>
          <p>Unlock predictive lockdown, custom rulesets, unlimited devices.</p>
          <button>Upgrade now</button>
        </div>

        <div className="nav-section" style={{ marginTop: 0 }}>
          <div className="nav-item" onClick={() => setView("help")}><Icon name="help"/>Help & Support</div>
          <div className="nav-item" onClick={() => setView("settings")}><Icon name="cog"/>Settings</div>
        </div>

        <div className="me">
          <div className="avatar">TA</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="me-name">Toma Andriushchak</div>
            <div className="me-mail">t.andriush@vanta.io</div>
          </div>
          <button className="btn ghost" style={{ padding: "5px 7px" }}><Icon name="logout" size={14}/></button>
        </div>
      </aside>

      {/* ------- Main ------- */}
      <main className="main">
        <div className="topbar">
          <div>
            <span className="crumb">{breadcrumb}</span>
            <span className="crumb-sub">/ vanta.lan / {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
          <div className="topbar-spacer"></div>
          <label className="search">
            <Icon name="search" size={13} style={{ color: "var(--ink-mute)" }}/>
            <input placeholder="Search anything…"/>
            <span className="kbd">⌘ K</span>
          </label>
          <button className="runai">
            <Icon name="sparkle" size={13}/> Run AI
          </button>
        </div>

        {view === "dashboard" && <DashboardView/>}
        {view === "network" && <NetworkView/>}
        {view === "vulnerabilities" && <VulnerabilitiesView/>}
        {view === "devices" && <DevicesView/>}
        {view === "threats" && <ThreatsView/>}
        {view === "alerts" && <AlertsView/>}
        {view === "help" && <StubView title="Help & Support" msg="Search docs, runbooks, or open a ticket with the SOC team."/>}
        {view === "settings" && <StubView title="Settings" msg="Workspace, integrations, billing, and notification preferences."/>}
      </main>
    </div>
  );
}

export default App
