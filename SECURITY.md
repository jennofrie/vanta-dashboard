# Security Policy

## Responsible use

VANTA is a defensive monitoring tool for networks **you own or are explicitly
authorized to monitor**. Scanning networks without authorization may be illegal in
your jurisdiction. By using VANTA you accept responsibility for ensuring you have the
right to scan the target network.

## Built-in safeguards

- **Scope lock:** VANTA derives the subnet from the active interface's own IP and
  netmask and scans **only that local subnet**. It does not scan internet hosts or any
  network beyond the local LAN.
- **Least privilege:** the app runs unprivileged by default. Elevated privileges are
  requested only when you explicitly opt into deep scans that require them.
- **No exfiltration:** VANTA makes no telemetry or cloud calls. All discovery, scan,
  and event data stays in the local store on your machine.
- **Renderer isolation:** the UI runs sandboxed (`contextIsolation: true`,
  `nodeIntegration: false`) and can reach the agent only through a minimal typed
  bridge.

## Scope of detection

VANTA performs **detection and classification only**. It does not exploit
vulnerabilities, alter target devices, or perform any offensive action.

## Reporting a vulnerability

If you discover a security issue in VANTA itself, please report it privately to
**JD Digital Systems** rather than opening a public issue. Include reproduction steps
and affected versions. We aim to acknowledge reports promptly and coordinate a fix.

## Supported versions

The project is pre-release; only the latest `main` is supported during development.

---

Maintained by **JD Digital Systems**.
