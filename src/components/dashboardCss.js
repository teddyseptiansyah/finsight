export const css = `

/* ════════════════════════════════
   SECTION ACCORDION
════════════════════════════════ */
.section {
  background: var(--surface, #0e1012);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px;
  overflow: hidden;
}

.section-hdr {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  cursor: pointer;
  user-select: none;
  transition: background .14s;
}
.section-hdr:hover { background: rgba(255,255,255,.025); }

.section-hdr__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.section-hdr__title {
  flex: 1;
  font-size: 10px;
  font-family: 'DM Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--t3, #6b737c);
  font-weight: 500;
}

.section-hdr__chevron {
  width: 14px; height: 14px;
  color: var(--t4, #3f454c);
  flex-shrink: 0;
  transition: transform .22s cubic-bezier(.4,0,.2,1);
}
.section-hdr__chevron--open { transform: rotate(180deg); }

.section-body {
  border-top: 1px solid rgba(255,255,255,.04);
  overflow: hidden;
}

/* ════════════════════════════════
   RATIO PANEL
════════════════════════════════ */
.ratio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 1px;
  background: rgba(255,255,255,.04);
  border-bottom: 1px solid rgba(255,255,255,.04);
}

.ratio-cell {
  background: var(--surface, #0e1012);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ratio-cell__label {
  font-size: 9px;
  font-family: 'DM Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .11em;
  color: var(--t4, #3f454c);
}

.ratio-cell__value {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.7px;
  line-height: 1;
  color: var(--t1, #eef0f2);
}

.ratio-cell__sub {
  font-size: 10px;
  font-family: 'DM Mono', monospace;
  color: var(--t4, #3f454c);
}

.ratio-cell--pos .ratio-cell__value { color: var(--pos, #34d399); }
.ratio-cell--neg .ratio-cell__value { color: var(--neg, #f87171); }
.ratio-cell--warn .ratio-cell__value { color: var(--warn, #fbbf24); }
.ratio-cell--blue .ratio-cell__value { color: var(--blue, #60a5fa); }

/* ════════════════════════════════
   FINANCIAL TABLES
════════════════════════════════ */
.fin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.fin-table thead tr {
  border-bottom: 1px solid rgba(255,255,255,.07);
}

.fin-table thead th {
  padding: 8px 16px;
  text-align: right;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--t4, #3f454c);
  font-weight: 500;
  white-space: nowrap;
}
.fin-table thead th:first-child { text-align: left; }

.fin-table tbody tr {
  border-bottom: 1px solid rgba(255,255,255,.04);
  transition: background .1s;
}
.fin-table tbody tr:hover { background: rgba(255,255,255,.03); }

.fin-table tbody td {
  padding: 6px 16px;
  color: var(--t2, #b8bec4);
  text-align: right;
}
.fin-table tbody td:first-child { text-align: left; }

.fin-table .row-section td {
  padding: 12px 16px 3px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--t4, #3f454c);
  border-bottom: none;
  font-weight: 500;
}

.fin-table .row-group td {
  font-weight: 600;
  color: var(--t1, #eef0f2);
  background: rgba(255,255,255,.025);
  border-bottom: 1px solid rgba(255,255,255,.06);
}

.fin-table .row-total td {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--t1, #eef0f2);
  border-top: 1px solid rgba(255,255,255,.07);
  padding-top: 10px;
  padding-bottom: 10px;
}

.fin-table .row-indent  td:first-child { padding-left: 32px; }
.fin-table .row-indent2 td:first-child { padding-left: 48px; }
.fin-table .row-pos td:last-child { color: var(--pos, #34d399); }
.fin-table .row-neg td:last-child { color: var(--neg, #f87171); }

/* ════════════════════════════════
   SHARED BUTTONS & CONTROLS
════════════════════════════════ */
.top-btn {
  height: 30px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 7px;
  color: var(--t3, #6b737c);
  font-size: 11px;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  transition: all .14s;
  white-space: nowrap;
  display: inline-flex; align-items: center; gap: 5px;
}
.top-btn:hover {
  color: var(--t1, #eef0f2);
  border-color: var(--t4, #3f454c);
  background: rgba(255,255,255,.04);
}
.top-btn:active { transform: scale(.97); }

/* period dot (used outside module) */
.period-dot {
  display: inline-block;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--pos, #34d399);
  box-shadow: 0 0 6px rgba(52,211,153,.55);
  animation: pdot 2.4s ease-in-out infinite;
}
@keyframes pdot {
  0%,100% { opacity: 1; }
  50%      { opacity: .35; }
}

/* ════════════════════════════════
   BADGES & CHIPS
════════════════════════════════ */
.badge {
  display: inline-flex; align-items: center;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 9px;
  font-family: 'DM Mono', monospace;
  font-weight: 600;
  white-space: nowrap;
}
.badge--pos  { background: rgba(52,211,153,.1);  color: #34d399; }
.badge--neg  { background: rgba(248,113,113,.1); color: #f87171; }
.badge--neu  { background: rgba(251,191,36,.1);  color: #fbbf24; }
.badge--blue { background: rgba(96,165,250,.1);  color: #60a5fa; }

.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 100px;
  font-size: 10px; font-family: 'DM Mono', monospace;
  border: 1px solid rgba(255,255,255,.07);
  color: var(--t3, #6b737c);
  background: var(--surface2, #141618);
  cursor: pointer;
  transition: border-color .12s, color .12s;
  white-space: nowrap; user-select: none;
}
.chip:hover { border-color: var(--t3, #6b737c); color: var(--t2, #b8bec4); }
.chip--active {
  border-color: var(--accent, #ff5733);
  color: var(--accent, #ff5733);
  background: rgba(255,87,51,.08);
}

/* ════════════════════════════════
   INPUTS & SELECTS
════════════════════════════════ */
.fin-input {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 7px;
  padding: 6px 10px;
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  color: var(--t1, #eef0f2);
  width: 100%;
  outline: none;
  transition: border-color .15s, background .15s;
}
.fin-input:focus {
  border-color: var(--accent, #ff5733);
  background: rgba(255,87,51,.05);
}
.fin-input::placeholder { color: var(--t4, #3f454c); }

.fin-select {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 7px;
  padding: 6px 28px 6px 10px;
  font-size: 11px;
  font-family: 'DM Sans', sans-serif;
  color: var(--t2, #b8bec4);
  appearance: none;
  cursor: pointer;
  outline: none;
  transition: border-color .15s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233f454c' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.fin-select:focus { border-color: var(--accent, #ff5733); }

/* ════════════════════════════════
   DRILLDOWN
════════════════════════════════ */
.drilldown-overlay {
  position: absolute;
  left: 0; right: 0;
  background: var(--card, #181b1e);
  border-bottom: 1px solid rgba(255,255,255,.07);
  box-shadow: 0 8px 32px rgba(0,0,0,.6);
  z-index: 38;
  animation: slideDown .18s cubic-bezier(.4,0,.2,1);
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ════════════════════════════════
   VARIANCE TABLE
════════════════════════════════ */
.var-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'DM Mono', monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}
.var-table th {
  padding: 8px 16px;
  text-align: right;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--t4, #3f454c);
  border-bottom: 1px solid rgba(255,255,255,.07);
  font-weight: 500;
}
.var-table th:first-child { text-align: left; }
.var-table td {
  padding: 6px 16px;
  text-align: right;
  color: var(--t2, #b8bec4);
  border-bottom: 1px solid rgba(255,255,255,.04);
}
.var-table td:first-child { text-align: left; }
.var-table tr:hover td { background: rgba(255,255,255,.03); }
.var-pos  { color: #34d399 !important; }
.var-neg  { color: #f87171 !important; }
.var-warn { color: #fbbf24 !important; }

.input-card {
  background: var(--surface2, #141618);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 9px;
  padding: 14px 16px;
}
.input-card__label {
  font-size: 9px;
  font-family: 'DM Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--t4, #3f454c);
  margin-bottom: 8px;
}

/* ════════════════════════════════
   EMPTY STATE
════════════════════════════════ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 52px 24px;
  color: var(--t4, #3f454c);
  text-align: center;
}
.empty-state__icon  { font-size: 28px; opacity: .3; margin-bottom: 4px; }
.empty-state__title { font-size: 12px; color: var(--t3, #6b737c); font-weight: 500; }
.empty-state__sub   { font-size: 11px; font-family: 'DM Mono', monospace; color: var(--t4, #3f454c); }

/* ════════════════════════════════
   SCROLLBAR
════════════════════════════════ */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,.07); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--t4, #3f454c); }
* { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.07) transparent; }

/* ════════════════════════════════
   PERIOD PICKER DROPDOWN
════════════════════════════════ */
.pp-dropdown {
  position: absolute;
  top: calc(100% + 7px);
  right: 0;
  background: var(--card, #181b1e);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 11px;
  box-shadow: 0 16px 48px rgba(0,0,0,.7);
  padding: 12px;
  z-index: 100;
  min-width: 230px;
  animation: fadeUp .16s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pp-month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 8px;
}
.pp-month-btn {
  padding: 5px 4px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 10px;
  font-family: 'DM Mono', monospace;
  color: var(--t3, #6b737c);
  cursor: pointer;
  text-align: center;
  transition: background .1s, color .1s, border-color .1s;
}
.pp-month-btn:hover { background: rgba(255,255,255,.05); color: var(--t2, #b8bec4); }
.pp-month-btn--active {
  background: rgba(255,87,51,.1);
  border-color: rgba(255,87,51,.4);
  color: var(--accent, #ff5733);
}
`
