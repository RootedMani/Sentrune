---
name: Institutional Intelligence & Quant Terminal
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#a8ffd2'
  on-tertiary: '#003824'
  tertiary-container: '#5be9ad'
  on-tertiary-container: '#006645'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
  surface-root: '#0A0E17'
  surface-base: '#111827'
  surface-card: '#161F30'
  surface-elevated: '#1E293B'
  border-subtle: '#1F2E47'
  border-focus: '#00E5FF'
  status-bullish: '#10B981'
  status-bearish: '#EF4444'
  status-warning: '#F59E0B'
  status-syncing: '#F59E0B'
  cyan-glow: rgba(0, 229, 255, 0.15)
  cobalt-glow: rgba(59, 130, 246, 0.20)
  bullish-glow: rgba(16, 185, 129, 0.15)
  bearish-glow: rgba(239, 68, 68, 0.15)
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
  metric-value:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  ticker-badge:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  sidebar-width: 260px
  header-height: 56px
  panel-gap: 1rem
---

## Brand & Style

The design system delivers an institutional-grade, high-throughput financial interface engineered for quantitative analysts, portfolio managers, and sophisticated traders. The personality is disciplined, analytical, hyper-precise, and authoritative—stripping away visual noise in favor of high-density clarity and rapid legibility under fast-moving market conditions.

The visual style blends **Technical Minimalism** with refined **Micro-Glassmorphism**. Deep slate and obsidian foundational surfaces suppress eye fatigue during extended multi-monitor sessions, while crisp hairline delineations (1px borders with selective optical glow) partition modular market intelligence primitives. Subtle cobalt and electric cyan backlights elevate key action points and live telemetry streams without degrading signal-to-noise ratio.

## Colors

The palette is tuned specifically for low-light trading desk environments, balancing deep slate backgrounds with high-contrast functional color coding:

- **Primary (`#00E5FF` - Electric Cyan):** Applied to real-time telemetry indicators, active selected states, primary terminal actions, and focal market regime highlights.
- **Secondary (`#3B82F6` - Cobalt Blue):** Anchors institutional structural chrome, secondary metrics, live-charting buttons, and module headers.
- **Semantic Financial States:**
  - **Bullish / Inflow (`#10B981`):** Positive tick values, long bias indicators, and affirmative confidence scores.
  - **Bearish / Outflow (`#EF4444`):** Drawdowns, negative tick deltas, resistance barriers, and short exposure flags.
  - **System Warning / Syncing (`#F59E0B`):** WebSocket queue buffers, exchange sync state, latency warnings, and neutral regime transitions.
- **Neutral Surface Ladder:** Built from absolute dark slate (`#0A0E17`) through layered panels (`#111827`, `#161F30`, and `#1E293B`) to establish depth without heavy drop shadows.

## Typography

The typographic hierarchy uses a dual-engine model: **Inter** handles narrative intelligence, section titles, and interface descriptions, while **JetBrains Mono** governs all quantitative pricing, order parameters, statistical metrics, and ticker symbols.

- **Tabular Figures & Metrics:** Every instance of numerical data (order books, P&L, delta percentages, timestamps) must mandate `font-feature-settings: 'tnum' 1, 'zero' 1` via JetBrains Mono to avoid horizontal jitter across fast-streaming WebSocket updates.
- **Section & Field Labels:** Displayed using `label-caps` in uppercase format with micro-tracking (`letter-spacing: 0.08em`) to guarantee quick recognition in dense dashboard grids.

## Layout & Spacing

The terminal is constructed on a high-density, multi-pane workbench layout designed for full viewport utilization:

- **Desktop Workbench (`>= 1280px`):** Fixed left navigation rail (`sidebar-width: 260px`) paired with a persistent utility topbar (`header-height: 56px`). The core viewport employs a 12-column dynamic CSS grid with fixed `panel-gap: 1rem` gutters. Metric overview modules span 3 columns each (4-column row), executive intelligence spans full-width or 8 columns, and technical depth panels stack beneath.
- **Laptop / Dense Display (`1024px - 1279px`):** Left rail collapses to a micro icon-rail (64px), expanding dashboard real-estate. Metrics collapse into a 2x2 grid (6 columns each).
- **Tablet & Mobile Breakpoints (`< 1024px`):** Grid panes stack vertically with horizontal touch scrolling on segmented navigation tabs. Sidebar docks into a slide-over off-canvas drawer.

## Elevation & Depth

Visual hierarchy is established through a strict three-tier surface and hairline border structure rather than deep, murky shadows:

1. **Root Layer (`#0A0E17`):** The master canvas, unadorned and purely absorbent.
2. **Base Panels (`#111827`):** Side rail, top bar, and primary module groupings, bounded by a 1px solid border (`#1F2E47`).
3. **Card & Widget Layer (`#161F30`):** Metrics cards and interactive containers. Utilizes subtle glassmorphic blur (`backdrop-filter: blur(12px)`) with a 1px composite outline (`rgba(255, 255, 255, 0.06)` top/left, `rgba(0, 0, 0, 0.4)` bottom/right).
4. **Accent Glows:** High-priority or active cards utilize an internal box-shadow highlight: `0 0 16px rgba(0, 229, 255, 0.08)`, expanding to `0 0 24px rgba(0, 229, 255, 0.18)` on hover or focus.

## Shapes

The design system employs controlled, compact geometry to preserve density and convey institutional rigor. Default UI elements (buttons, inputs, metric tiles) use a conservative **4px (`0.25rem`)** corner radius (`roundedness: 1`). Containers, major cards, and charting modules use **8px (`0.5rem`)**.

Segmented tab pills and contextual asset tickers (e.g., `AAPL`, `stock`, `crypto`) use tight internal radiuses (3px to 4px) to retain a structured, compact data density without soft consumer-grade curves.

## Components

### Buttons & Quick Actions
- **Primary Terminal Action:** Solid cyan background (`#00E5FF`) with dark obsidian text (`#0A0E17`), semibold weight, paired with an subtle cyan ambient drop-glow (`0 0 12px rgba(0, 229, 255, 0.3)`).
- **Secondary Ghost Action:** Deep charcoal background (`#161F30`), 1px hairline border (`#1F2E47`), slate-100 typography (`#F8FAFC`), transitioning to a cobalt border (`#3B82F6`) on hover.
- **Syncing / Status Button:** Monospaced label prefix, subtle pulse dot indicator, framed by a muted amber border (`rgba(245, 158, 11, 0.3)`) and dark amber backing.

### Segmented Horizon Tabs
- Clustered inside a unified track (`#0A0E17` with 1px border `#1F2E47`).
- Active segment is filled with solid cyan (`#00E5FF`) or highlighted slate with a bottom active cyan bar (2px). Inactive segments use muted gray (`#94A3B8`) and transition to white on hover.

### Metric Cards & Intelligence Blocks
- **Header:** Monospace category label in `label-caps` (`#94A3B8`) paired with an iconography badge housed in a micro circular glass container (`rgba(255,255,255,0.04)`).
- **Value Core:** Primary metric rendered via `metric-display` in JetBrains Mono (`#F8FAFC`).
- **Trend Delta Tag:** Inline pill with green (`rgba(16, 185, 129, 0.12)`) or red (`rgba(239, 68, 68, 0.12)`) backing, containing directional arrow icon and tabular percentage text.

### Range & Execution Boundary Sliders
- Continuous linear track featuring gradient fills: crimson red for discount/oversold zones, amber for fair-value median, and emerald for distribution/high boundaries.
- Current price pin indicated by a vertical white or cyan micro-hairline with an anchored price flag.

### Target Asset Selector
- Interactive card item with selected border state (`#00E5FF`), subtle background wash, asset symbol in uppercase bold mono, paired with micro category badges (`stock`, `crypto`) tinted in categorical tones.