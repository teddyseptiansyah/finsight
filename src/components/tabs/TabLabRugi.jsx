import React, { useState, useMemo, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CoaContext } from '../../lib/CoaContext';
import { ACCT, totalOf } from '../../lib/parser';
import { fmtFull } from '../../lib/format';

// ============================================
// Tema (bisa dipisah ke file sendiri)
// ============================================
const theme = {
  colors: {
    ink: '#1A1916',
    ink2: '#36332D',
    ink3: '#6B6760',
    ink4: '#A09C94',
    bg: '#F0EDE8',
    surface: '#F7F5F1',
    panel: '#FDFCFA',
    raised: '#F0EDE8',
    rule: '#E0DDD7',
    rule2: '#EAE8E3',
    primary: '#6B3FBF',
    success: '#1A7A40',
    danger: '#CC2200',
    warning: '#A05C00',
    info: '#1B5FCC',
    purple: '#6B3FBF',
    lime: '#5C8C00',
    profit: '#1A7A40',
    loss: '#CC2200',
  },
  font: {
    mono: "Arial, sans-serif",
  },
  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
  },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,.07)',
    md: '0 4px 12px rgba(0,0,0,.10)',
    lg: '0 10px 28px rgba(0,0,0,.14)',
  },
};

// ============================================
// Helper functions
// ============================================
const formatValue = (v) => (v === 0 ? '—' : fmtFull(v));
const getProfitColor = (v) => (v === 0 ? theme.colors.ink4 : v > 0 ? theme.colors.profit : theme.colors.loss);
const getExpenseColor = (v) => (v === 0 ? theme.colors.ink4 : v > 0 ? theme.colors.loss : theme.colors.profit);

const isTotalRow = (no, name = '') =>
  no.endsWith('999999') ||
  no.endsWith('000000') ||
  no.slice(-2) === '99' ||
  no.slice(-2) === '00' ||
  (name && name.toUpperCase().includes('TOTAL'));

const getSubRows = (rows, prefix) =>
  Object.entries(rows)
    .filter(([k]) => k.startsWith(prefix) && !k.endsWith('999999') && !k.endsWith('000000') && k.slice(-2) === '99')
    .map(([no, arr]) => ({ no, val: Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0 }))
    .filter((r) => r.val !== 0)
    .sort((a, b) => a.no.localeCompare(b.no));

const getDetailRows = (rows, nameMap, prefix) =>
  Object.entries(rows)
    .filter(([no]) => no.startsWith(prefix) && !isTotalRow(no, nameMap[no] || ''))
    .map(([no, arr]) => ({
      no,
      name: nameMap[no] || no,
      val: Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0,
    }))
    .filter((r) => r.val !== 0)
    .sort((a, b) => a.no.localeCompare(b.no));

// ============================================
// Komponen UI kecil (bisa dipisah ke file sendiri)
// ============================================
const Operator = React.memo(({ symbol }) => (
  <div className="operator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 36, alignSelf: 'flex-start', paddingTop: 20 }}>
    <div style={{ width: 32, height: 32, borderRadius: theme.radius.lg, background: theme.colors.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: theme.shadow.md }}>
      <span style={{ fontFamily: theme.font.mono, fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1, userSelect: 'none' }}>{symbol}</span>
    </div>
  </div>
));
Operator.displayName = 'Operator';
Operator.propTypes = { symbol: PropTypes.string.isRequired };

const DetailLine = React.memo(({ no, name, value, colorMode, onDrill }) => {
  const color = colorMode === 'profit' ? getProfitColor(value) : getExpenseColor(value);
  const handleClick = useCallback(() => onDrill?.({ acctNo: no, prefix: no, color, label: name }), [no, name, color, onDrill]);

  return (
    <div onClick={handleClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px 5px 20px', borderBottom: `1px solid ${theme.colors.rule2}55`, cursor: onDrill ? 'pointer' : 'default', transition: 'background 0.08s' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.raised)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <div style={{ width: 3, height: 3, borderRadius: '50%', background: theme.colors.rule2, flexShrink: 0 }} />
        <span style={{ fontFamily: theme.font.mono, fontSize: 11, color: theme.colors.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || no}</span>
      </div>
      <span style={{ fontFamily: theme.font.mono, fontSize: 11, fontWeight: 600, color, flexShrink: 0, marginLeft: 8 }}>{formatValue(value)}</span>
    </div>
  );
});
DetailLine.displayName = 'DetailLine';
DetailLine.propTypes = {
  no: PropTypes.string.isRequired,
  name: PropTypes.string,
  value: PropTypes.number.isRequired,
  colorMode: PropTypes.oneOf(['profit', 'expense']).isRequired,
  onDrill: PropTypes.func,
};

const GroupRow = React.memo(({ label, no, value, pct, accent, colorMode, open, onToggle, onDrill, barPct, children }) => {
  const valueColor = colorMode === 'profit' ? getProfitColor(value) : getExpenseColor(value);
  const handleDrill = useCallback((e) => { e.stopPropagation(); onDrill?.({ acctNo: no, prefix: no.slice(0, 6), color: accent, label }); }, [no, accent, label, onDrill]);

  return (
    <div>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderBottom: `1px solid ${theme.colors.rule2}`, background: open ? `${accent}08` : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = `${accent}05`; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: open ? accent : theme.colors.rule2, boxShadow: open ? `0 0 0 3px ${accent}22` : 'none', transition: 'background 0.15s, box-shadow 0.15s' }} />
        <span style={{ fontFamily: theme.font.mono, fontSize: 13, color: open ? theme.colors.ink : theme.colors.ink2, flex: 1, fontWeight: open ? 600 : 400 }}>{label}</span>
        {barPct != null && (
          <div style={{ width: 40, height: 2, background: theme.colors.rule2, borderRadius: theme.radius.sm, flexShrink: 0 }}>
            <div style={{ height: '100%', borderRadius: theme.radius.sm, width: `${barPct}%`, background: `linear-gradient(90deg,${accent},${accent}66)` }} />
          </div>
        )}
        <span onClick={handleDrill} style={{ fontFamily: theme.font.mono, fontSize: 10, color: theme.colors.info, padding: '2px 5px', borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.info}33`, cursor: 'pointer', flexShrink: 0, background: `${theme.colors.info}06`, letterSpacing: '0.04em' }}>{no.slice(-6)}</span>
        <span style={{ fontFamily: theme.font.mono, fontSize: 13, fontWeight: 700, color: valueColor, minWidth: 80, textAlign: 'right' }}>{formatValue(value)}</span>
      </div>
      {open && children && <div style={{ background: theme.colors.surface, borderBottom: `1px solid ${theme.colors.rule2}` }}>{children}</div>}
    </div>
  );
});
GroupRow.displayName = 'GroupRow';
GroupRow.propTypes = {
  label: PropTypes.string.isRequired,
  no: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  pct: PropTypes.string,
  accent: PropTypes.string.isRequired,
  colorMode: PropTypes.oneOf(['profit', 'expense']).isRequired,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onDrill: PropTypes.func,
  barPct: PropTypes.number,
  children: PropTypes.node,
};

const FlowNode = React.memo(({ label, value, pct, accent, colorMode = 'profit', open, onToggle, isResult = false, isFinal = false, children }) => {
  const valueColor = isFinal
    ? value < 0 ? theme.colors.lime : theme.colors.loss
    : colorMode === 'profit' ? getProfitColor(value) : getExpenseColor(value);
  const cardBg = isFinal
    ? 'linear-gradient(135deg, #1a1a17 0%, #0a0a09 100%)'
    : isResult
      ? `linear-gradient(135deg, ${theme.colors.raised} 0%, ${theme.colors.panel} 100%)`
      : `linear-gradient(135deg, ${theme.colors.panel} 0%, ${theme.colors.surface} 100%)`;
  const borderLeft = isFinal ? 'none' : `3px solid ${open ? accent : accent + '55'}`;

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ background: cardBg, borderRadius: theme.radius.xl, borderLeft, border: isFinal ? `1px solid ${theme.colors.lime}30` : `1px solid ${open ? accent + '88' : theme.colors.rule2}`, borderLeftWidth: isFinal ? undefined : 3, boxShadow: isFinal ? `0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)` : open ? `0 6px 20px ${accent}28, 0 2px 6px rgba(0,0,0,0.07)` : theme.shadow.md, overflow: 'hidden', transition: 'box-shadow 0.2s, border-color 0.2s', position: 'relative' }}>
        <div style={{ height: 2, background: isFinal ? `linear-gradient(90deg, ${theme.colors.lime}cc, ${theme.colors.lime}00)` : `linear-gradient(90deg, ${accent}cc, ${accent}00)`, opacity: open || isFinal ? 1 : 0.4, transition: 'opacity 0.2s' }} />
        <div onClick={children ? onToggle : undefined} style={{ padding: isFinal ? '14px 14px 15px' : '12px 13px 13px', cursor: children ? 'pointer' : 'default' }}
          onMouseEnter={(e) => { if (children) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={(e) => { if (children) e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 10 }}>
            <span style={{ fontFamily: theme.font.mono, fontSize: 11, fontWeight: 700, lineHeight: 1.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: isFinal ? `${theme.colors.lime}cc` : theme.colors.ink4 }}>{label}</span>
            {children && (
              <div style={{ width: 18, height: 18, borderRadius: theme.radius.sm, flexShrink: 0, marginTop: 1, background: open ? accent : theme.colors.rule2, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s, background 0.18s' }}>
                <span style={{ fontSize: 7, color: open ? '#000' : theme.colors.ink3, lineHeight: 1 }}>▼</span>
              </div>
            )}
          </div>
          <div style={{ fontFamily: theme.font.mono, fontWeight: 700, lineHeight: 1, fontSize: isFinal ? 20 : 18, letterSpacing: '-0.03em', color: valueColor }}>{formatValue(value)}</div>
          {pct && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: theme.font.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: isFinal ? `${theme.colors.lime}99` : `${accent}cc` }}>{pct}</span>
              <div style={{ flex: 1, height: 2, borderRadius: theme.radius.sm, background: isFinal ? 'rgba(255,255,255,0.08)' : theme.colors.rule2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: theme.radius.sm, width: `${Math.min(Math.abs(parseFloat(pct)), 100)}%`, background: isFinal ? `linear-gradient(90deg, ${theme.colors.lime}, ${theme.colors.lime}44)` : `linear-gradient(90deg, ${accent}, ${accent}44)`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}
        </div>
      </div>
      {open && children && (
        <div style={{ marginTop: 3, borderRadius: `0 0 ${theme.radius.lg} ${theme.radius.lg}`, border: `1px solid ${accent}55`, borderTop: 'none', background: theme.colors.surface, maxHeight: 280, overflowY: 'auto', boxShadow: `0 6px 16px ${accent}18` }}>
          {children}
        </div>
      )}
    </div>
  );
});
FlowNode.displayName = 'FlowNode';
FlowNode.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  pct: PropTypes.string,
  accent: PropTypes.string.isRequired,
  colorMode: PropTypes.oneOf(['profit', 'expense']),
  open: PropTypes.bool,
  onToggle: PropTypes.func,
  isResult: PropTypes.bool,
  isFinal: PropTypes.bool,
  children: PropTypes.node,
};

const ConnectorLine = React.memo(({ fromPct, toPct, op, label }) => {
  const lc = theme.colors.rule2;
  const lw = 2;
  const minPct = Math.min(fromPct, toPct);
  const maxPct = Math.max(fromPct, toPct);
  const opLeft = (fromPct + toPct) / 2;

  return (
    <div style={{ position: 'relative', height: 60, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: `${fromPct}%`, width: lw, height: '50%', background: lc, transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: `${minPct}%`, width: `${maxPct - minPct}%`, height: lw, background: lc, transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: `${toPct}%`, width: lw, height: '50%', background: lc, transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', bottom: -1, left: `${toPct}%`, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${lc}` }} />
      {op && (
        <div style={{ position: 'absolute', top: '50%', left: `${opLeft}%`, transform: 'translate(-50%, -50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 32, height: 32, borderRadius: theme.radius.lg, background: theme.colors.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: theme.shadow.md }}>
            <span style={{ fontFamily: theme.font.mono, fontSize: 15, fontWeight: 700, color: '#fff' }}>{op}</span>
          </div>
          {label && (
            <span style={{ fontFamily: theme.font.mono, fontSize: 10, color: theme.colors.ink4, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: theme.colors.panel, padding: '0 4px', borderRadius: theme.radius.sm }}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
ConnectorLine.displayName = 'ConnectorLine';
ConnectorLine.propTypes = {
  fromPct: PropTypes.number.isRequired,
  toPct: PropTypes.number.isRequired,
  op: PropTypes.string,
  label: PropTypes.string,
};

// ============================================
// Custom hook untuk data laba rugi
// ============================================
function useLabarugiData(rows, rawRows) {
  const nameMap = useMemo(() => {
    const map = {};
    rawRows.forEach((r) => { map[r.no] = r.name; });
    return map;
  }, [rawRows]);

  const totalRev = totalOf(rows, ACCT.PENDAPATAN);
  const totalHPP = totalOf(rows, ACCT.HPP);
  const labaKotor = totalRev + totalHPP;
  const biaya51 = totalOf(rows, ACCT.BIAYA_MKT);
  const biaya52 = totalOf(rows, ACCT.BIAYA_KARY);
  const biaya53 = totalOf(rows, ACCT.BIAYA_GEDUNG);
  const biaya54 = totalOf(rows, ACCT.BIAYA_UMUM);
  const biaya55 = totalOf(rows, ACCT.BIAYA_OPS_LN);
  const totalBiayaOps = biaya51 + biaya52 + biaya53 + biaya54 + biaya55;
  const labaOps = labaKotor + totalBiayaOps;
  const nonOps61 = totalOf(rows, '61999999');
  const nonOps63 = totalOf(rows, '63999999');
  const nonOps64 = totalOf(rows, '64999999');
  const nonOps65i = totalOf(rows, '65199999');
  const nonOps65b = totalOf(rows, '65299999');
  const netNonOps = nonOps61 + nonOps63 + nonOps64 + nonOps65i + nonOps65b;
  const vPajak = totalOf(rows, '80999999');
  const vLabaBersih = totalOf(rows, ACCT.LABA_BERSIH);
  const labaSblmPajak = vLabaBersih + vPajak;

  const revAbs = Math.abs(totalRev) || 1;
  const pct = useCallback((v) => `${((v / revAbs) * 100).toFixed(1)}%`, [revAbs]);

  const revSubs = useMemo(
    () => getSubRows(rows, '41').map((r) => ({ ...r, name: nameMap[r.no] || r.no, subs: getDetailRows(rows, nameMap, r.no.slice(0, 6)) })),
    [rows, nameMap]
  );
  const hppSubs = useMemo(
    () => getSubRows(rows, '42').map((r) => ({ ...r, name: nameMap[r.no] || r.no, subs: getDetailRows(rows, nameMap, r.no.slice(0, 6)) })),
    [rows, nameMap]
  );
  const grps = useMemo(
    () =>
      [
        { key: '51', label: 'Biaya Marketing', no: ACCT.BIAYA_MKT, total: biaya51 },
        { key: '52', label: 'Biaya Karyawan', no: ACCT.BIAYA_KARY, total: biaya52 },
        { key: '53', label: 'Biaya Gedung & Operasional', no: ACCT.BIAYA_GEDUNG, total: biaya53 },
        { key: '54', label: 'Biaya Umum', no: ACCT.BIAYA_UMUM, total: biaya54 },
        { key: '55', label: 'Biaya Operasional Lainnya', no: ACCT.BIAYA_OPS_LN, total: biaya55 },
      ]
        .filter((g) => g.total !== 0)
        .map((g) => ({ ...g, subs: getDetailRows(rows, nameMap, g.key) })),
    [rows, nameMap, biaya51, biaya52, biaya53, biaya54, biaya55]
  );
  const nonOpsGrps = useMemo(
    () =>
      [
        { key: '61', label: 'Selisih Kurs', no: '61999999', raw: nonOps61, prefix: '61' },
        { key: '63', label: 'Selisih Penjualan AT', no: '63999999', raw: nonOps63, prefix: '63' },
        { key: '64', label: 'Administrasi Bank', no: '64999999', raw: nonOps64, prefix: '64' },
        { key: '65i', label: 'Pendapatan Lain-lain', no: '65199999', raw: nonOps65i, prefix: '651' },
        { key: '65b', label: 'Biaya Lain-lain', no: '65299999', raw: nonOps65b, prefix: '652' },
      ]
        .filter((g) => g.raw !== 0)
        .map((g) => ({ ...g, subs: getDetailRows(rows, nameMap, g.prefix) })),
    [rows, nameMap, nonOps61, nonOps63, nonOps64, nonOps65i, nonOps65b]
  );
  const pajakSubs = useMemo(() => getDetailRows(rows, nameMap, '80'), [rows, nameMap]);

  return {
    nameMap,
    totals: { totalRev, totalHPP, labaKotor, biaya51, biaya52, biaya53, biaya54, biaya55, totalBiayaOps, labaOps, nonOps61, nonOps63, nonOps64, nonOps65i, nonOps65b, netNonOps, vPajak, vLabaBersih, labaSblmPajak },
    pct,
    revSubs,
    hppSubs,
    grps,
    nonOpsGrps,
    pajakSubs,
    maxOpex: Math.max(...grps.map((g) => Math.abs(g.total)), 1),
    hasNonOps: nonOpsGrps.length > 0,
    hasPajak: vPajak !== 0,
  };
}

// ============================================
// Komponen Utama
// ============================================
export default function TabLabRugi({ data, months }) {
  const { openCoa } = useContext(CoaContext) || {};
  const rows = data?.rows || {};
  const rawRows = data?.rawRows || [];

  const {
    totals: { totalRev, totalHPP, labaKotor, totalBiayaOps, labaOps, netNonOps, vPajak, vLabaBersih, labaSblmPajak },
    pct,
    revSubs,
    hppSubs,
    grps,
    nonOpsGrps,
    pajakSubs,
    maxOpex,
    hasNonOps,
    hasPajak,
  } = useLabarugiData(rows, rawRows);

  // State ekspansi terpusat
  const [expanded, setExpanded] = useState({
    rev: false,
    hpp: false,
    biaya: false,
    nonOps: false,
    pajak: false,
    groups: {},
  });

  const toggleExpanded = useCallback((key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleGroup = useCallback((groupKey) => {
    setExpanded((prev) => ({
      ...prev,
      groups: { ...prev.groups, [groupKey]: !prev.groups[groupKey] },
    }));
  }, []);

  const handleDrill = useCallback((params) => {
    openCoa?.(params);
  }, [openCoa]);

  if (!months?.length) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: theme.font.mono, fontSize: 13, color: theme.colors.ink4 }}>
        Data Laba Rugi tidak tersedia
      </div>
    );
  }

  const GRID = 'minmax(180px,1fr) 36px minmax(180px,1fr) 36px minmax(180px,1fr)';

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Baris 1: Pendapatan − HPP = Laba Kotor */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'flex-start' }}>
        <FlowNode
          label="Pendapatan Bersih"
          value={totalRev}
          pct={pct(totalRev)}
          accent={theme.colors.lime}
          colorMode="profit"
          open={expanded.rev}
          onToggle={() => toggleExpanded('rev')}
        >
          {revSubs.map((g) => (
            <GroupRow
              key={g.no}
              label={g.name}
              no={g.no}
              value={g.val}
              pct={pct(g.val)}
              accent={theme.colors.lime}
              colorMode="profit"
              open={!!expanded.groups[g.no]}
              onToggle={() => toggleGroup(g.no)}
              onDrill={handleDrill}
            >
              {g.subs.map((s) => (
                <DetailLine
                  key={s.no}
                  no={s.no}
                  name={s.name}
                  value={s.val}
                  colorMode="profit"
                  onDrill={handleDrill}
                />
              ))}
            </GroupRow>
          ))}
        </FlowNode>
        <Operator symbol="−" />
        <FlowNode
          label="Harga Pokok Penjualan"
          value={totalHPP}
          pct={pct(totalHPP)}
          accent={theme.colors.danger}
          colorMode="expense"
          open={expanded.hpp}
          onToggle={() => toggleExpanded('hpp')}
        >
          {hppSubs.map((g) => (
            <GroupRow
              key={g.no}
              label={g.name}
              no={g.no}
              value={g.val}
              pct={pct(g.val)}
              accent={theme.colors.danger}
              colorMode="expense"
              open={!!expanded.groups[g.no]}
              onToggle={() => toggleGroup(g.no)}
              onDrill={handleDrill}
            >
              {g.subs.map((s) => (
                <DetailLine
                  key={s.no}
                  no={s.no}
                  name={s.name}
                  value={s.val}
                  colorMode="expense"
                  onDrill={handleDrill}
                />
              ))}
            </GroupRow>
          ))}
        </FlowNode>
        <Operator symbol="=" />
        <FlowNode label="Laba Kotor" value={labaKotor} pct={pct(labaKotor)} accent={theme.colors.lime} colorMode="profit" isResult />
      </div>

      <ConnectorLine fromPct={90} toPct={50} op="−" label="Biaya Operasional" />

      {/* Baris 2: Laba Operasional = Biaya Operasional */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'flex-start' }}>
        <FlowNode label="Laba Operasional" value={labaOps} pct={pct(labaOps)} accent={theme.colors.success} colorMode="profit" isResult />
        <Operator symbol="=" />
        <FlowNode
          label="Biaya Operasional"
          value={totalBiayaOps}
          pct={pct(totalBiayaOps)}
          accent={theme.colors.warning}
          colorMode="expense"
          open={expanded.biaya}
          onToggle={() => toggleExpanded('biaya')}
        >
          {grps.map((g) => (
            <GroupRow
              key={g.key}
              label={g.label}
              no={g.no}
              value={g.total}
              pct={pct(g.total)}
              accent={theme.colors.warning}
              colorMode="expense"
              barPct={Math.min((Math.abs(g.total) / maxOpex) * 100, 100)}
              open={!!expanded.groups[g.key]}
              onToggle={() => toggleGroup(g.key)}
              onDrill={handleDrill}
            >
              {g.subs.map((s) => (
                <DetailLine
                  key={s.no}
                  no={s.no}
                  name={s.name}
                  value={s.val}
                  colorMode="expense"
                  onDrill={handleDrill}
                />
              ))}
            </GroupRow>
          ))}
        </FlowNode>
        <div /><div />
      </div>

      {hasNonOps && (
        <>
          <ConnectorLine fromPct={10} toPct={50} op="±" label="Pos Luar Usaha" />
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'flex-start' }}>
            <div /><div />
            <FlowNode
              label="Pos Luar Usaha (Non-Ops)"
              value={netNonOps}
              pct={pct(netNonOps)}
              accent={theme.colors.purple}
              colorMode="profit"
              open={expanded.nonOps}
              onToggle={() => toggleExpanded('nonOps')}
            >
              {nonOpsGrps.map((g) => (
                <GroupRow
                  key={g.key}
                  label={g.label}
                  no={g.no}
                  value={g.raw}
                  pct={pct(g.raw)}
                  accent={theme.colors.purple}
                  colorMode="profit"
                  open={!!expanded.groups[g.key]}
                  onToggle={() => toggleGroup(g.key)}
                  onDrill={handleDrill}
                >
                  {g.subs.map((s) => (
                    <DetailLine
                      key={s.no}
                      no={s.no}
                      name={s.name}
                      value={s.val}
                      colorMode="profit"
                      onDrill={handleDrill}
                    />
                  ))}
                </GroupRow>
              ))}
            </FlowNode>
            <Operator symbol="=" />
            <FlowNode label="Laba Sebelum Pajak" value={labaSblmPajak} pct={pct(labaSblmPajak)} accent={theme.colors.success} colorMode="profit" isResult />
          </div>
          <ConnectorLine fromPct={90} toPct={50} op={hasPajak ? '−' : '='} label={hasPajak ? 'Pajak' : ''} />
        </>
      )}

      {!hasNonOps && <ConnectorLine fromPct={10} toPct={50} op={hasPajak ? '−' : '='} label={hasPajak ? 'Pajak' : ''} />}

      {/* Baris Pajak & Laba Bersih */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'flex-start' }}>
        <div /><div />
        {hasPajak ? (
          <>
            <FlowNode
              label="Pajak Penghasilan"
              value={vPajak}
              pct={pct(vPajak)}
              accent={theme.colors.ink3}
              colorMode="expense"
              open={expanded.pajak}
              onToggle={() => toggleExpanded('pajak')}
            >
              {pajakSubs.map((s) => (
                <DetailLine key={s.no} no={s.no} name={s.name} value={s.val} colorMode="expense" onDrill={handleDrill} />
              ))}
            </FlowNode>
            <Operator symbol="=" />
            <FlowNode label="Laba Bersih Setelah Pajak" value={vLabaBersih} pct={pct(vLabaBersih)} accent={theme.colors.lime} isFinal />
          </>
        ) : (
          <FlowNode label="Laba Bersih Setelah Pajak" value={vLabaBersih} pct={pct(vLabaBersih)} accent={theme.colors.lime} isFinal />
        )}
      </div>
    </div>
  );
}

TabLabRugi.propTypes = {
  data: PropTypes.shape({
    rows: PropTypes.object,
    rawRows: PropTypes.array,
  }),
  months: PropTypes.array,
};