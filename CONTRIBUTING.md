
# Contributing to TraceLens NPA

Thank you for your interest in contributing to **TraceLens Network Analyzer
(TraceLens NPA)**.

TraceLens NPA is a source-available project focused on building a powerful,
free, offline-capable network traffic analysis workstation.

Contributions such as bug fixes, improvements, documentation, testing, and
new features are welcome.

---

## Before You Contribute

Please read the project's [`LICENSE`](LICENSE) before contributing.

TraceLens NPA is distributed under a **Personal and Non-Commercial
Source-Available License**.

Contributions to the project do not grant permission for commercial use of
TraceLens NPA. Commercial use requires a separate commercial license from the
copyright holder.

---

## Getting Started

### 1. Fork the Repository

Create your own fork of the TraceLens NPA repository on GitHub.

### 2. Clone Your Fork

```powershell
git clone https://github.com/prince2313/tracelens-npa.git
cd tracelens-npa
```

Replace the repository URL with your own fork URL when necessary.

### 3. Create a Branch

Use a descriptive branch name:

```powershell
git checkout -b feature/my-feature
```

Examples:

```text
feature/packet-filter
feature/dns-analysis
feature/ai-copilot
fix/live-capture
fix/tshark-detection
docs/setup-guide
```

---

## Development Requirements

TraceLens NPA currently targets Windows development.

Recommended environment:

* Python 3.10+
* Node.js 18+
* Wireshark / tshark
* Npcap
* Git
* Ollama (optional for AI features)

Follow the setup instructions in [`README.md`](README.md).

---

## Making Changes

Before submitting a pull request:

1. Understand the existing architecture.
2. Keep changes focused.
3. Avoid unnecessary changes to unrelated files.
4. Follow the existing coding style.
5. Add or update documentation when necessary.
6. Test your changes locally.
7. Make sure existing functionality is not unnecessarily broken.

---

## Backend Contributions

The backend is built with Python and FastAPI.

When modifying backend functionality:

* Keep API endpoints organized.
* Use appropriate type hints.
* Handle errors properly.
* Avoid exposing sensitive information in logs.
* Keep network parsing and analysis logic separated where practical.
* Do not introduce unnecessary blocking operations into asynchronous endpoints.

---

## Frontend Contributions

The frontend uses React, TypeScript, Vite, Tailwind CSS, and related tooling.

When modifying the frontend:

* Prefer TypeScript types over `any`.
* Keep components focused.
* Reuse existing components where practical.
* Maintain keyboard accessibility.
* Keep the UI consistent with the existing workstation-style design.

---

## Network Analysis and Security Features

TraceLens NPA is intended for legitimate network analysis, troubleshooting,
defensive security research, education, and authorized testing.

Do not contribute functionality intended primarily for:

* Unauthorized access.
* Credential theft.
* Malware deployment.
* Destructive attacks.
* Unauthorized surveillance.
* Bypassing security controls for malicious purposes.

Security-related contributions should have a clear legitimate defensive,
research, or educational purpose.

---

## Sensitive Data

Never commit sensitive or private information.

Do not commit:

* Passwords
* API keys
* Access tokens
* Private certificates
* `.env` files containing secrets
* Private PCAP/PCAPNG captures
* Personally identifiable information
* Production databases
* Private logs
* Customer or organizational traffic captures

Before creating a pull request, check:

```powershell
git status
git diff
git diff --cached
```

---

## Commit Messages

Use clear commit messages.

Good:

```text
Add DNS tunneling heuristic
Fix packet table sorting
Improve tshark detection
Add Ollama connection status
Update installation documentation
```

Avoid vague messages such as:

```text
fix
changes
update
stuff
```

---

## Pull Requests

When opening a pull request, explain:

1. What was changed.
2. Why the change was needed.
3. How it was tested.
4. Any limitations or known issues.

Example:

```text
### What changed

Added DNS tunneling detection based on query length and entropy.

### Why

Long, high-entropy DNS queries can be an indicator of DNS tunneling.

### Testing

Tested against sample PCAP files containing normal DNS traffic and
simulated tunneling traffic.

### Notes

The heuristic may produce false positives and should not be treated as
definitive evidence of malicious activity.
```

---

## Issues

Before opening an issue, search existing issues to see whether the problem
has already been reported.

For bug reports, include:

* Operating system
* Python version
* Node.js version
* Wireshark/tshark version
* TraceLens NPA version or commit
* Steps to reproduce
* Expected behavior
* Actual behavior
* Relevant error messages or logs

Do not upload private packet captures or sensitive information.

---

## Feature Requests

Feature requests are welcome.

Please explain:

* What problem the feature solves.
* How you expect it to work.
* Why it would be useful to TraceLens NPA users.
* Any relevant examples or screenshots.

---

## Code of Conduct

Be respectful and constructive.

Harassment, discrimination, personal attacks, malicious behavior, and
intentionally disruptive contributions are not welcome.

---

## License and Contributions

By submitting a contribution to TraceLens NPA, you confirm that:

1. You have the right to submit the contribution.
2. Your contribution does not knowingly violate another person's or
   organization's intellectual property rights.
3. You understand that the project is distributed under its existing
   Personal and Non-Commercial Source-Available License.

Submitting a contribution does not grant commercial rights to the project.

The project maintainer may review, modify, accept, or reject contributions at
their discretion.

---

## Thank You

Every useful contribution helps make TraceLens NPA better.

Thank you for helping improve the project.
