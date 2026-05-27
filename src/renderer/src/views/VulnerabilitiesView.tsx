import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Sparkline } from '../components/charts'
import { useScan } from '../hooks/useScan'
import { SEV_CLASS } from './constants'
import type { Severity } from '@shared/types'

export function VulnerabilitiesView() {
  const { result, run } = useScan()
  const VULNS = result.vulns
  const [sev, setSev] = useState('All')
  const filtered = sev === 'All' ? VULNS : VULNS.filter((v) => v.severity === sev)

  const counts: Record<Severity, number> = {
    Critical: VULNS.filter((v) => v.severity === 'Critical').length,
    High:     VULNS.filter((v) => v.severity === 'High').length,
    Medium:   VULNS.filter((v) => v.severity === 'Medium').length,
    Low:      VULNS.filter((v) => v.severity === 'Low').length,
  }

  return (
    <div className="content fade-in">
      <div className="vuln-grid">
        <div className="stat" style={{ borderColor: 'oklch(0.50 0.22 28)' }}>
          <div className="num" style={{ color: 'var(--red)' }}>{counts.Critical}</div>
          <div className="lbl">Critical</div>
          <div className="trend"><Icon name="arrow-up" size={10}/>Current</div>
          <div className="micro"><Sparkline data={[counts.Critical]} color="var(--red)"/></div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: 'var(--amber)' }}>{counts.High}</div>
          <div className="lbl">High</div>
          <div className="trend"><Icon name="arrow-dn" size={10}/>Current</div>
          <div className="micro"><Sparkline data={[counts.High]} color="var(--amber)"/></div>
        </div>
        <div className="stat">
          <div className="num">{counts.Medium}</div>
          <div className="lbl">Medium</div>
          <div className="trend"><Icon name="arrow-dn" size={10}/>Current</div>
          <div className="micro"><Sparkline data={[counts.Medium]} color="var(--blue)"/></div>
        </div>
        <div className="stat">
          <div className="num">{counts.Low}</div>
          <div className="lbl">Low</div>
          <div className="trend"><Icon name="arrow-dn" size={10}/>Current</div>
          <div className="micro"><Sparkline data={[counts.Low]} color="var(--lime)"/></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Active Vulnerabilities</div>
            <div className="card-sub">{result.nmapAvailable ? 'Service detection · sorted by risk' : 'Port exposure · sorted by risk'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn primary" onClick={run}>{result.scanning ? 'Scanning…' : 'Run Scan'}</button>
            <div className="filter-bar">
              {['All', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
                <button key={s} className={`chip ${sev === s ? 'on' : ''}`} onClick={() => setSev(s)}>
                  {s}{s !== 'All' && <span className="mono" style={{ opacity: .7, marginLeft: 4 }}>{counts[s as Severity]}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="card-sub" style={{ padding: '24px 0' }}>
            {result.scanning
              ? 'Scanning your devices…'
              : result.lastScanAt
                ? 'No exposure findings.'
                : 'Run a scan to assess your devices.'}
          </div>
        ) : (
          <table className="cve-table">
            <thead><tr>
              <th>ID</th><th>Title</th><th>Score</th><th>Severity</th><th>Affected</th><th>Patch</th><th>Age</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((v) => {
                const c = v.severity === 'Critical' ? 'var(--red)' : v.severity === 'High' ? 'oklch(0.78 0.20 35)' : v.severity === 'Medium' ? 'var(--amber)' : 'var(--lime)'
                return (
                  <tr key={v.id}>
                    <td className="cve-id" style={{ color: 'var(--ink)' }}>{v.id}</td>
                    <td style={{ maxWidth: 360 }}>{v.title}</td>
                    <td>
                      <div className="scorewrap">
                        <span className="score" style={{ color: c }}>{v.score}</span>
                        <div className="scoremeter"><i style={{ width: `${v.score * 10}%`, background: c }}></i></div>
                      </div>
                    </td>
                    <td><span className={`sev ${SEV_CLASS[v.severity]}`}>{v.severity}</span></td>
                    <td className="mono" style={{ fontSize: 11.5, color: 'var(--ink-dim)' }}>{v.system}</td>
                    <td className="mono" style={{ fontSize: 11.5, color: v.patch === 'Available' ? 'var(--lime)' : v.patch === 'Pending' ? 'var(--amber)' : 'var(--ink-mute)' }}>{v.patch}</td>
                    <td className="mono" style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>{v.age}</td>
                    <td><Icon name="chevron" size={12}/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
