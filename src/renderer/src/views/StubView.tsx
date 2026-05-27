export function StubView({ title, msg }: { title: string; msg: string }) {
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
