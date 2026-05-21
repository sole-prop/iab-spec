# 🛠️ iab-tools

Developer CLI utility tooling package for the **IaO (Infrastructure-as-Organization) Protocol Standard**. Exposes command-line validation engines and interactive blueprint compilers.

[![npm version](https://img.shields.io/npm/v/iab-tools.svg?style=flat-square)](https://www.npmjs.com/package/iab-tools)
[![npm downloads](https://img.shields.io/npm/dm/iab-tools.svg?style=flat-square)](https://www.npmjs.com/package/iab-tools)
[![Node version support](https://img.shields.io/badge/node-%3E%3D22.0.0-blue.svg?style=flat-square)](https://nodejs.org)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](LICENSE)
[![Standard Ecosystem](https://img.shields.io/badge/IaO%20Standard-v1.0-green.svg?style=flat-square)](https://github.com/abhisar-ps/iab-spec)

---

## 🗺️ Table of Contents

- [Installation](#-installation)
- [Commands](#-commands)
  - [1. iab-validate](#1-iab-validate)
  - [2. iab-init](#2-iab-init)
- [License](#-license)

---

## 📦 Installation

Install globally via `npm` or `pnpm` to make the CLI binaries available in your system shell:

```bash
npm install -g iab-tools
# or
pnpm add -g iab-tools
```

---

## 🚀 Commands

### 1. `iab-validate`

Validates your organizational blueprint schema structure (Draft-07 compliant) and runs 6 critical cross-referential integrity checks between your human assets, AI agents, recurring workflows, and objectives.

**Usage:**
```bash
iab-validate org.iab.yml
```

**Key Cross-Reference Warnings Evaluated:**
1. Agent owns-workflows map to defined workflows.
2. Agent reporting lines resolve to defined entities.
3. Workflow blocking dependencies map to defined workflows.
4. Workflow goal contributions resolve to defined goal nodes.
5. Workflow step owners map to defined human/agent actors.
6. Goal/OKR owners resolve to valid defined entities.

**Diagnostic Warnings Emitter:**
Exposes duration bottlenecks when a workflow step's average execution duration exceeds its specified SLA threshold limits:
```
✓ org.iab.yml is a valid IaO Blueprint
✓ 1 agents, 1 workflows, 2 goals, 3 people defined.

⚠ Bottlenecks Detected:
  Workflow "admissions-workflow", step "principal_review" (51h avg) exceeds SLA threshold (24h)
```

---

## 2. `iab-init`

Interactive wizard to scaffold new blueprints, or initialize pre-written, highly calibrated vertical blueprints.

**Scaffold from Template:**
Generate a preconfigured boilerplate setup (startup, agency, education, or ngo):
```bash
iab-init --template startup --org "My Organization" --output org.iab.yml
```

**Interactive Wizard Mode:**
Answer the step-by-step structural prompt questions to generate a tailor-made organizational configuration:
```bash
iab-init
```

---

## License

Apache License 2.0. Exposes the IaO standard for community use and modifications.
