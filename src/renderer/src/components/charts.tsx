import { useState, useEffect } from 'react'
import type React from 'react'
import { Icon } from './Icon'
import type { ForecastPoint } from '@shared/types'

// ---------- Animated counter ----------
function useAnimatedNumber(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const s = performance.now();
    const from = val;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - s) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line
  }, [target]);
  return val;
}

// ---------- Half-arc segmented gauge ----------
function HealthGauge({ value = 76, size = 260 }: { value?: number; size?: number }) {
  const segs = 42;
  const animated = useAnimatedNumber(value, 1100);
  const lit = Math.round((animated / 100) * segs);
  const cx = size / 2, cy = size * 0.62, r = size * 0.42;
  const startAngle = 200, endAngle = -20; // sweep
  const total = startAngle - endAngle;

  return (
    <div className="gauge-wrap" style={{ flexDirection: "column" }}>
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`} style={{ overflow: "visible" }}>
        {Array.from({ length: segs }).map((_, i) => {
          const a = (startAngle - (i / (segs - 1)) * total) * Math.PI / 180;
          const x1 = cx + Math.cos(a) * (r - 14);
          const y1 = cy - Math.sin(a) * (r - 14);
          const x2 = cx + Math.cos(a) * (r + 14);
          const y2 = cy - Math.sin(a) * (r + 14);
          const on = i < lit;
          // gradient lime: brighter at the top
          const intensity = 0.55 + (i / segs) * 0.45;
          return (
            <line key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={on ? `oklch(${0.65 + intensity*0.25} 0.22 ${145 - i*0.4})` : "oklch(0.30 0.014 250)"}
              strokeWidth={on ? 6 : 5}
              strokeLinecap="round"
              opacity={on ? 1 : 0.55}
            />
          );
        })}
        {/* tick labels 0 / 100 */}
        <text x={cx - r - 4} y={cy + 14} fill="oklch(0.55 0.012 250)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">0</text>
        <text x={cx + r + 4} y={cy + 14} fill="oklch(0.55 0.012 250)" fontSize="10" fontFamily="JetBrains Mono" textAnchor="start">100</text>
        <foreignObject x={cx - 90} y={cy - 60} width="180" height="80">
          <div style={{ textAlign: "center" }}>
            <div className="gauge-num mono">{Math.round(animated)}%</div>
            <div className="gauge-lbl">calculated device value</div>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

// ---------- AI Threat Forecast (dual-line + tooltip) ----------
function ThreatForecast({ data }: { data: ForecastPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 230;
  const pad = { l: 18, r: 18, t: 14, b: 26 };
  const max = 50, min = 0;
  const xs = data.map((_, i) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r));
  const ys = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

  const linePath = (key: keyof ForecastPoint) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${xs[i].toFixed(1)} ${ys(d[key] as number).toFixed(1)}`).join(" ");
  const areaPath = (key: keyof ForecastPoint) => `${linePath(key)} L ${xs[xs.length-1]} ${H - pad.b} L ${xs[0]} ${H - pad.b} Z`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) * (W / r.width);
    let idx = 0, best = Infinity;
    xs.forEach((xv, i) => { const d = Math.abs(xv - x); if (d < best) { best = d; idx = i; } });
    setHover(idx);
  };
  const onLeave = () => setHover(null);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none"
           onMouseMove={onMove} onMouseLeave={onLeave} style={{ display: "block" }}>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={pad.l} x2={W - pad.r} y1={pad.t + p*(H-pad.t-pad.b)} y2={pad.t + p*(H-pad.t-pad.b)} stroke="oklch(0.28 0.014 250)" strokeDasharray="2 4" strokeWidth="1"/>
        ))}
        {/* x labels — every other day */}
        {data.map((d, i) => i % 2 === 0 ? (
          <text key={i} x={xs[i]} y={H - 8} fontSize="10" fontFamily="JetBrains Mono" fill="oklch(0.55 0.012 250)" textAnchor="middle">{d.d}</text>
        ) : null)}
        {/* y labels */}
        {[0, 25, 50].map(v => (
          <text key={v} x={W - pad.r + 4} y={ys(v) + 3} fontSize="9.5" fontFamily="JetBrains Mono" fill="oklch(0.45 0.012 250)" textAnchor="start">{v}</text>
        ))}

        {/* predicted area */}
        <defs>
          <linearGradient id="actArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.88 0.22 135)" stopOpacity="0.28"/>
            <stop offset="100%" stopColor="oklch(0.88 0.22 135)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaPath("actual")} fill="url(#actArea)"/>

        {/* predicted dashed */}
        <path d={linePath("predicted")} fill="none" stroke="oklch(0.72 0.10 250)" strokeWidth="1.6" strokeDasharray="4 4"/>
        {/* actual */}
        <path d={linePath("actual")} fill="none" stroke="oklch(0.88 0.22 135)" strokeWidth="2"/>

        {/* hover */}
        {hover !== null && (
          <g>
            <line x1={xs[hover]} x2={xs[hover]} y1={pad.t} y2={H - pad.b} stroke="oklch(0.55 0.012 250)" strokeDasharray="2 3"/>
            <circle cx={xs[hover]} cy={ys(data[hover].actual)} r="4" fill="oklch(0.88 0.22 135)" stroke="var(--bg)" strokeWidth="2"/>
            <circle cx={xs[hover]} cy={ys(data[hover].predicted)} r="3.5" fill="oklch(0.72 0.10 250)" stroke="var(--bg)" strokeWidth="2"/>
          </g>
        )}
      </svg>

      {hover !== null && (() => {
        const d = data[hover];
        const dev = ((d.actual - d.predicted) / Math.max(1, d.predicted) * 100).toFixed(0);
        const left = Math.min(Math.max((xs[hover] / W) * 100, 8), 78);
        return (
          <div className="tooltip" style={{ left: `${left}%`, top: 16 }}>
            <h5>{d.d}, 2026</h5>
            <div className="row"><span className="k">Actual threats</span><span className="v">{d.actual}</span></div>
            <div className="row"><span className="k">Predicted</span><span className="v">{d.predicted}</span></div>
            <div className="row"><span className="k">Deviation</span><span className={`v ${Number(dev)>0?'warn':'ok'}`}>{Number(dev) > 0 ? "+" : ""}{dev}%</span></div>
            <div className="row"><span className="k">AI Confidence</span><span className="v">{Math.round(d.conf*100)}%</span></div>
          </div>
        );
      })()}
    </div>
  );
}

// ---------- Sparkline ----------
function Sparkline({ data, color = "var(--lime)", w = 70, h = 24 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / Math.max(1, max - min)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4"/>
    </svg>
  );
}

// ---------- Network activity radar (small) ----------
function NetActivity() {
  return (
    <div className="map" style={{ aspectRatio: "auto", height: 230 }}>
      <div className="map-grid"></div>
      {/* sweeping ring */}
      <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.88 0.22 135)" stopOpacity="0.18"/>
            <stop offset="70%" stopColor="oklch(0.88 0.22 135)" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="84" fill="none" stroke="oklch(0.30 0.014 250)" strokeDasharray="1 4"/>
        <circle cx="100" cy="100" r="60" fill="none" stroke="oklch(0.30 0.014 250)" strokeDasharray="1 4"/>
        <circle cx="100" cy="100" r="36" fill="none" stroke="oklch(0.30 0.014 250)" strokeDasharray="1 4"/>
        <circle cx="100" cy="100" r="84" fill="url(#sweep)">
          <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="6s" repeatCount="indefinite"/>
        </circle>
      </svg>
      {[
        { id: 1, x: 30, y: 35, c: "ok",   ico: "cloud"  },
        { id: 2, x: 70, y: 30, c: "red",  ico: "phone" },
        { id: 3, x: 78, y: 65, c: "warn", ico: "router"},
        { id: 4, x: 40, y: 70, c: "ok",   ico: "server"},
      ].map(n => (
        <div key={n.id} className={`node ${n.c}`} style={{ left: `${n.x}%`, top: `${n.y}%` }}>
          <div className="pulse" style={{ width: 26, height: 26, color: "currentColor" }}></div>
          <div className="pulse b" style={{ width: 26, height: 26 }}></div>
          <div className="core"><Icon name={n.ico} size={13}/></div>
        </div>
      ))}
      <div className="map-info">Repeated failed logins · 12</div>
      <div className="map-stat">
        <div className="pill"><span className="dot red"></span>3 active</div>
      </div>
    </div>
  );
}

export { HealthGauge, ThreatForecast, Sparkline, NetActivity }
