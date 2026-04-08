import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell,
} from "recharts";
import styled from "styled-components";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StatsSeminar {
  id: number;
  title: string;
  start_time: string | null;
  max_capacity: number | null;
  waitlist_enabled: boolean;
  host: string | null;
}

export interface StatsRsvp {
  seminar_id: number;
  user_id: number;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface StatsUser {
  created_at: string;
  is_temporary: boolean;
  role: string;
}

interface Props {
  seminars: StatsSeminar[];
  rsvps: StatsRsvp[];
  users: StatsUser[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pctChange(next: number, prev: number): number | null {
  if (prev === 0) return next > 0 ? 100 : null;
  return Math.round(((next - prev) / prev) * 100);
}

function truncLabel(s: string, n = 12): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function fmtRate(n: number): string {
  return `${Math.round(n)}%`;
}

// ── Trend badge ────────────────────────────────────────────────────────────────

interface TrendProps {
  value: number | null;
  lowerIsBetter?: boolean;
  suffix?: string;
}

function Trend({ value, lowerIsBetter = false, suffix = "%" }: TrendProps) {
  if (value === null) return <TrendNeutral>—</TrendNeutral>;
  const good = lowerIsBetter ? value < 0 : value > 0;
  const neutral = value === 0;
  const sign = value > 0 ? "+" : "";
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  if (neutral) return <TrendNeutral>{arrow} 0{suffix} vs prev</TrendNeutral>;
  if (good) return <TrendUp>{arrow} {sign}{value}{suffix} vs prev</TrendUp>;
  return <TrendDown>{arrow} {sign}{value}{suffix} vs prev</TrendDown>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminStats({ seminars, rsvps, users }: Props) {
  // Sort seminars chronologically by start_time
  const sorted = useMemo(() =>
    [...seminars]
      .filter(s => s.start_time)
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime()),
    [seminars]
  );

  // Per-seminar derived stats
  const stats = useMemo(() => sorted.map(s => {
    const semRsvps = rsvps.filter(r => r.seminar_id === s.id);
    const rsvpCount = semRsvps.length;
    const checkinCount = semRsvps.filter(r => r.checked_in).length;
    const noshowCount = rsvpCount - checkinCount;
    const checkinRate = rsvpCount > 0 ? Math.round((checkinCount / rsvpCount) * 100) : 0;
    const fillRate = s.max_capacity && s.max_capacity > 0
      ? Math.min(Math.round((rsvpCount / s.max_capacity) * 100), 150) // cap at 150% to show overflow
      : null;
    const d = new Date(s.start_time!);
    return {
      id: s.id,
      label: truncLabel(s.title),
      fullTitle: s.title,
      host: s.host ?? "—",
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dateYear: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
      rsvp: rsvpCount,
      checkin: checkinCount,
      noshow: noshowCount,
      checkinRate,
      fillRate,
      maxCapacity: s.max_capacity,
      waitlistEnabled: s.waitlist_enabled,
    };
  }), [sorted, rsvps]);

  // Trend comparison mode (must be before any conditional return)
  type ComparisonMode = "half" | "last";
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("half");

  type ChartTab = "attendance" | "rsvp" | "checkin" | "noshow" | "capacity";
  const [chartTab, setChartTab] = useState<ChartTab>("attendance");

  // Trend: compare last half vs previous half
  const half = Math.max(1, Math.floor(stats.length / 2));
  const prevSlice = stats.slice(0, half);
  const recentSlice = stats.slice(stats.length - half);

  const kpi = useMemo(() => {
    // User growth: always 30-day window regardless of mode
    const now = Date.now();
    const d30 = 30 * 86_400_000;
    const newUsersRecent = users.filter(u =>
      !u.is_temporary && now - new Date(u.created_at).getTime() < d30).length;
    const newUsersPrev   = users.filter(u =>
      !u.is_temporary
      && now - new Date(u.created_at).getTime() >= d30
      && now - new Date(u.created_at).getTime() < d30 * 2).length;

    if (comparisonMode === "last") {
      // Compare the single most recent seminar vs the one immediately before it
      const last = stats[stats.length - 1];
      const prev = stats.length >= 2 ? stats[stats.length - 2] : null;
      return {
        avgRsvp:        last.rsvp,
        avgRsvpTrend:   prev ? pctChange(last.rsvp, prev.rsvp) : null,
        avgCI:          last.checkinRate,
        avgCITrend:     prev ? pctChange(last.checkinRate, prev.checkinRate) : null,
        avgNoshow:      last.noshow,
        avgNoshowTrend: prev ? pctChange(last.noshow, prev.noshow) : null,
        avgFill:        last.fillRate ?? 0,
        avgFillTrend:   (prev && last.fillRate !== null && prev.fillRate !== null)
                          ? pctChange(last.fillRate, prev.fillRate) : null,
        newUsers:       newUsersRecent,
        newUsersTrend:  pctChange(newUsersRecent, newUsersPrev),
        latestDate:     last.dateYear,
        prevDate:       prev?.dateYear ?? null,
      };
    }

    // "half" mode: compare avg of recent half vs avg of earlier half
    const recentRsvp = avg(recentSlice.map(s => s.rsvp));
    const prevRsvp   = avg(prevSlice.map(s => s.rsvp));
    const recentCI   = avg(recentSlice.map(s => s.checkinRate));
    const prevCI     = avg(prevSlice.map(s => s.checkinRate));
    const recentNS   = avg(recentSlice.map(s => s.noshow));
    const prevNS     = avg(prevSlice.map(s => s.noshow));

    const withCap    = stats.filter(s => s.fillRate !== null);
    const prevFill   = avg(withCap.slice(0, half).map(s => s.fillRate!));
    const recentFill = avg(withCap.slice(-half).map(s => s.fillRate!));

    return {
      avgRsvp:        Math.round(recentRsvp),
      avgRsvpTrend:   pctChange(recentRsvp, prevRsvp),
      avgCI:          Math.round(recentCI),
      avgCITrend:     pctChange(recentCI, prevCI),
      avgNoshow:      Math.round(recentNS),
      avgNoshowTrend: pctChange(recentNS, prevNS),
      avgFill:        Math.round(recentFill),
      avgFillTrend:   pctChange(recentFill, prevFill),
      newUsers:       newUsersRecent,
      newUsersTrend:  pctChange(newUsersRecent, newUsersPrev),
      latestDate:     null as string | null,
      prevDate:       null as string | null,
    };
  }, [stats, recentSlice, prevSlice, half, rsvps, users, comparisonMode]);

  // Best / worst performers
  const byCI    = [...stats].sort((a, b) => b.checkinRate - a.checkinRate);
  const byRsvp  = [...stats].sort((a, b) => b.rsvp - a.rsvp);
  const byNoshow = [...stats].sort((a, b) => b.noshow - a.noshow);

  if (stats.length === 0) {
    return <EmptyMsg>No seminar data yet to display statistics.</EmptyMsg>;
  }

  // Rolling 3-seminar average for check-in rate (for line chart)
  const chartData = stats.map((s, i) => {
    const window = stats.slice(Math.max(0, i - 2), i + 1);
    const rollingCI = Math.round(avg(window.map(w => w.checkinRate)));
    return { ...s, rollingCI };
  });

  const PURPLE  = "#F97316";
  const GREEN   = "#059669";
  const RED     = "#ef4444";
  const ORANGE  = "#d97706";
  const BLUE    = "#0ea5e9";
  const GRID    = "#f0eeff";

  const hasCapacity = stats.some(s => s.fillRate !== null);

  return (
    <Wrap>

      {/* ── Section: Summary KPIs ── */}
      <OverviewHead>
        <div>
          <SectionHeadTitle>Overview</SectionHeadTitle>
          <SectionHeadDesc>
            {comparisonMode === "half"
              ? `Trend badges compare avg of the most recent ${half} seminar(s) vs the earlier ${half}.`
              : kpi.prevDate
                ? `Trend badges compare the latest seminar (${kpi.latestDate}) vs the previous one (${kpi.prevDate}).`
                : "Only one seminar recorded — trend comparison not available yet."}
          </SectionHeadDesc>
        </div>
        <ModeSelector>
          <ModeSelectorLabel>Compare by</ModeSelectorLabel>
          <ModeBtnGroup>
            <ModeBtn
              active={comparisonMode === "half"}
              onClick={() => setComparisonMode("half")}
              title="Average of most recent half vs earlier half"
            >
              Recent ½ vs Earlier ½
            </ModeBtn>
            <ModeBtn
              active={comparisonMode === "last"}
              onClick={() => setComparisonMode("last")}
              title="Latest seminar vs the one immediately before it"
            >
              Latest vs Previous
            </ModeBtn>
          </ModeBtnGroup>
        </ModeSelector>
      </OverviewHead>

      <KpiGrid>
        <KpiCard>
          <KpiValue>{kpi.avgRsvp}</KpiValue>
          <KpiLabel>
            {comparisonMode === "half" ? "Avg RSVPs / Seminar" : "RSVPs (latest)"}
          </KpiLabel>
          <Trend value={kpi.avgRsvpTrend} suffix="" />
          <KpiDesc>Higher = growing demand</KpiDesc>
        </KpiCard>
        <KpiCard>
          <KpiValue>{kpi.avgCI}%</KpiValue>
          <KpiLabel>
            {comparisonMode === "half" ? "Avg Check-in Rate" : "Check-in Rate (latest)"}
          </KpiLabel>
          <Trend value={kpi.avgCITrend} />
          <KpiDesc>Higher = better commitment</KpiDesc>
        </KpiCard>
        <KpiCard>
          <KpiValue>{kpi.avgNoshow}</KpiValue>
          <KpiLabel>
            {comparisonMode === "half" ? "Avg No-shows / Seminar" : "No-shows (latest)"}
          </KpiLabel>
          <Trend value={kpi.avgNoshowTrend} lowerIsBetter suffix="" />
          <KpiDesc>Lower = better show-up quality</KpiDesc>
        </KpiCard>
        <KpiCard>
          <KpiValue>{kpi.avgFill > 0 ? `${kpi.avgFill}%` : "—"}</KpiValue>
          <KpiLabel>
            {comparisonMode === "half" ? "Avg Capacity Fill" : "Capacity Fill (latest)"}
          </KpiLabel>
          <Trend value={kpi.avgFillTrend} />
          <KpiDesc>Demand vs available seats</KpiDesc>
        </KpiCard>
        <KpiCard>
          <KpiValue>{kpi.newUsers}</KpiValue>
          <KpiLabel>New Members (30d)</KpiLabel>
          <Trend value={kpi.newUsersTrend} suffix="" />
          <KpiDesc>Regular accounts created recently</KpiDesc>
        </KpiCard>
      </KpiGrid>

      {/* ── Section: Charts (tabbed) ── */}
      <SectionHead style={{ marginTop: 36 }}>
        <SectionHeadTitle>Charts</SectionHeadTitle>
      </SectionHead>

      <ChartTabBar>
        <ChartTabBtn active={chartTab === "attendance"} onClick={() => setChartTab("attendance")}>
          RSVPs vs Check-ins
        </ChartTabBtn>
        <ChartTabBtn active={chartTab === "rsvp"} onClick={() => setChartTab("rsvp")}>
          RSVP Trend
        </ChartTabBtn>
        <ChartTabBtn active={chartTab === "checkin"} onClick={() => setChartTab("checkin")}>
          Check-in Rate
        </ChartTabBtn>
        <ChartTabBtn active={chartTab === "noshow"} onClick={() => setChartTab("noshow")}>
          No-show Trend
        </ChartTabBtn>
        {hasCapacity && (
          <ChartTabBtn active={chartTab === "capacity"} onClick={() => setChartTab("capacity")}>
            Capacity Fill
          </ChartTabBtn>
        )}
      </ChartTabBar>

      <ChartCard>
        {/* RSVPs vs Check-ins */}
        {chartTab === "attendance" && (
          <>
            <ChartTabDesc>
              RSVPs (registrations) vs actual check-ins per event, in chronological order.
              A large gap between the two bars signals a high no-show rate for that seminar.
            </ChartTabDesc>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #ede9fe", fontSize: 13 }}
                  formatter={(val: number, name: string) => [val, name === "rsvp" ? "RSVPs" : "Check-ins"]}
                  labelFormatter={(l: string) => { const s = chartData.find(d => d.date === l); return s ? s.fullTitle : l; }}
                />
                <Legend formatter={(v: string) => v === "rsvp" ? "RSVPs" : "Check-ins"} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="rsvp"    fill={PURPLE} radius={[4,4,0,0]} name="rsvp" />
                <Bar dataKey="checkin" fill={GREEN}  radius={[4,4,0,0]} name="checkin" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {/* RSVP Trend */}
        {chartTab === "rsvp" && (
          <>
            <ChartTabDesc>
              Actual RSVP count per seminar over time, in chronological order.
              An upward trend indicates growing audience interest.
            </ChartTabDesc>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #ede9fe", fontSize: 13 }}
                  formatter={(val: number) => [val, "RSVPs"]}
                  labelFormatter={(l: string) => { const s = chartData.find(d => d.date === l); return s ? s.fullTitle : l; }}
                />
                <Line type="monotone" dataKey="rsvp" stroke={PURPLE} strokeWidth={2} dot={{ r: 4, fill: PURPLE }} name="rsvp" />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {/* Check-in Rate Trend */}
        {chartTab === "checkin" && (
          <>
            <ChartTabDesc>
              Attendance rate (check-ins ÷ RSVPs) per seminar. The dashed line shows a 3-seminar
              rolling average to smooth out one-off outliers. Aim to keep this above 60%.
            </ChartTabDesc>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #ede9fe", fontSize: 13 }}
                  formatter={(val: number, name: string) => [`${val}%`, name === "checkinRate" ? "Check-in rate" : "3-sem. rolling avg"]}
                  labelFormatter={(l: string) => { const s = chartData.find(d => d.date === l); return s ? s.fullTitle : l; }}
                />
                <ReferenceLine y={60} stroke={ORANGE} strokeDasharray="4 2"
                  label={{ value: "60% target", position: "right", fontSize: 11, fill: ORANGE }} />
                <Legend
                  formatter={(v: string) => v === "checkinRate" ? "Check-in Rate" : "3-Sem. Rolling Avg"}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Line type="monotone" dataKey="checkinRate" stroke={GREEN} strokeWidth={2} dot={{ r: 4, fill: GREEN }} name="checkinRate" />
                <Line type="monotone" dataKey="rollingCI" stroke={PURPLE} strokeWidth={2} strokeDasharray="5 3" dot={false} name="rollingCI" />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {/* No-show Trend */}
        {chartTab === "noshow" && (
          <>
            <ChartTabDesc>
              Number of no-shows (RSVPed but did not check in) per seminar.
              Spikes may indicate scheduling conflicts or low engagement for that event.
            </ChartTabDesc>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #ede9fe", fontSize: 13 }}
                  formatter={(val: number) => [val, "No-shows"]}
                  labelFormatter={(l: string) => { const s = chartData.find(d => d.date === l); return s ? s.fullTitle : l; }}
                />
                <Bar dataKey="noshow" radius={[4,4,0,0]} name="noshow">
                  {chartData.map((s, i) => (
                    <Cell key={i} fill={s.noshow === 0 ? GREEN : s.noshow <= 2 ? ORANGE : RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <CapacityLegend>
              <CapLegItem color={GREEN}>0 no-shows</CapLegItem>
              <CapLegItem color={ORANGE}>1–2 no-shows</CapLegItem>
              <CapLegItem color={RED}>3+ no-shows</CapLegItem>
            </CapacityLegend>
          </>
        )}

        {/* Capacity Fill */}
        {chartTab === "capacity" && hasCapacity && (
          <>
            <ChartTabDesc>
              Percentage of seats filled per seminar (RSVPs ÷ max capacity).
              Over 100% means registrations exceeded the cap — marked in red.
              100% = fully booked, which may indicate unmet demand.
            </ChartTabDesc>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData.filter(s => s.fillRate !== null)}
                margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #ede9fe", fontSize: 13 }}
                  formatter={(val: number) => [`${val}%`, "Capacity Fill"]}
                  labelFormatter={(l: string) => { const s = chartData.find(d => d.date === l); return s ? `${s.fullTitle} (cap: ${s.maxCapacity})` : l; }}
                />
                <ReferenceLine y={100} stroke={RED} strokeDasharray="4 2"
                  label={{ value: "100%", position: "right", fontSize: 11, fill: RED }} />
                <Bar dataKey="fillRate" radius={[4,4,0,0]} name="fillRate">
                  {chartData.filter(s => s.fillRate !== null).map((s, i) => (
                    <Cell key={i} fill={s.fillRate! >= 100 ? RED : s.fillRate! >= 80 ? ORANGE : BLUE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <CapacityLegend>
              <CapLegItem color={BLUE}>Under 80%</CapLegItem>
              <CapLegItem color={ORANGE}>80–99%</CapLegItem>
              <CapLegItem color={RED}>100%+ (over capacity)</CapLegItem>
            </CapacityLegend>
          </>
        )}
      </ChartCard>

      {/* ── Section: Performers ── */}
      <SectionHead style={{ marginTop: 36 }}>
        <SectionHeadTitle>Seminar Highlights</SectionHeadTitle>
        <SectionHeadDesc>
          Quick-glance rankings to identify what's working and what needs attention.
        </SectionHeadDesc>
      </SectionHead>
      <HighlightGrid>
        <HighlightCard accent={GREEN}>
          <HighlightBadge color={GREEN}>🏆 Best Attendance Rate</HighlightBadge>
          <HighlightTitle>{byCI[0]?.fullTitle ?? "—"}</HighlightTitle>
          <HighlightStat>{byCI[0] ? fmtRate(byCI[0].checkinRate) : "—"}</HighlightStat>
          <HighlightMeta>
            {byCI[0]?.checkin} checked in / {byCI[0]?.rsvp} RSVPs · {byCI[0]?.date}
          </HighlightMeta>
        </HighlightCard>

        <HighlightCard accent={PURPLE}>
          <HighlightBadge color={PURPLE}>📈 Highest RSVPs</HighlightBadge>
          <HighlightTitle>{byRsvp[0]?.fullTitle ?? "—"}</HighlightTitle>
          <HighlightStat>{byRsvp[0]?.rsvp ?? "—"} RSVPs</HighlightStat>
          <HighlightMeta>
            {byRsvp[0]?.checkin} attended · {byRsvp[0]?.date}
          </HighlightMeta>
        </HighlightCard>

        <HighlightCard accent={RED}>
          <HighlightBadge color={RED}>⚠ Highest No-shows</HighlightBadge>
          <HighlightTitle>{byNoshow[0]?.fullTitle ?? "—"}</HighlightTitle>
          <HighlightStat>{byNoshow[0]?.noshow ?? "—"} no-shows</HighlightStat>
          <HighlightMeta>
            {byNoshow[0] ? fmtRate(100 - byNoshow[0].checkinRate) : "—"} no-show rate · {byNoshow[0]?.date}
          </HighlightMeta>
        </HighlightCard>
      </HighlightGrid>

      {/* ── Section: All seminars ranked ── */}
      <SectionHead style={{ marginTop: 36 }}>
        <SectionHeadTitle>All Seminars Ranked by Attendance Rate</SectionHeadTitle>
        <SectionHeadDesc>
          Complete list sorted by check-in rate, highest first.
        </SectionHeadDesc>
      </SectionHead>
      <RankTable>
        <RankHeader>
          <span>#</span>
          <span>Title</span>
          <span>Date</span>
          <span>RSVPs</span>
          <span>Check-ins</span>
          <span>No-shows</span>
          <span>Rate</span>
        </RankHeader>
        {byCI.map((s, i) => (
          <RankRow key={s.id} highlight={i === 0}>
            <RankNum>{i + 1}</RankNum>
            <RankName title={s.fullTitle}>{s.fullTitle}</RankName>
            <RankCell>{s.dateYear}</RankCell>
            <RankCell>{s.rsvp}</RankCell>
            <RankCell style={{ color: GREEN, fontWeight: 600 }}>{s.checkin}</RankCell>
            <RankCell style={{ color: s.noshow > 0 ? RED : "#9ca3af" }}>{s.noshow}</RankCell>
            <RankCell>
              <RateBar>
                <RateBarFill
                  width={s.checkinRate}
                  color={s.checkinRate >= 70 ? GREEN : s.checkinRate >= 40 ? ORANGE : RED}
                />
                <RateLabel
                  color={s.checkinRate >= 70 ? GREEN : s.checkinRate >= 40 ? ORANGE : RED}
                >
                  {s.checkinRate}%
                </RateLabel>
              </RateBar>
            </RankCell>
          </RankRow>
        ))}
      </RankTable>

    </Wrap>
  );
}

// ── Styled components ──────────────────────────────────────────────────────────

const Wrap = styled.div`
  padding-bottom: 40px;
  overflow: hidden;
`;

const EmptyMsg = styled.div`
  padding: 48px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
`;

const OverviewHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
`;

const ModeSelector = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
`;

const ModeSelectorLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
`;

const ModeBtnGroup = styled.div`
  display: flex;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  overflow: hidden;
`;

const ModeBtn = styled.button<{ active: boolean }>`
  padding: 5px 12px;
  border: none;
  border-right: 1px solid rgba(255,255,255,0.08);
  background: ${({ active }) => active ? "#F97316" : "rgba(255,255,255,0.04)"};
  color: ${({ active }) => active ? "#fff" : "#71717A"};
  font-size: 12px;
  font-weight: ${({ active }) => active ? 600 : 400};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;

  &:last-child { border-right: none; }
  &:hover:not([disabled]) {
    background: ${({ active }) => active ? "#5b4bd6" : "#f5f3ff"};
    color: ${({ active }) => active ? "#fff" : "#F97316"};
  }
`;

const SectionHead = styled.div`
  margin-bottom: 14px;
`;

const SectionHeadTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #F4F4F5;
  margin-bottom: 4px;
`;

const SectionHeadDesc = styled.div`
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
  max-width: 680px;
`;

// KPI cards
const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;

  @media (min-width: 560px) { grid-template-columns: repeat(4, 1fr); }
  @media (min-width: 860px) { grid-template-columns: repeat(5, 1fr); }
`;

const KpiCard = styled.div<{ accent?: string }>`
  background: #111113;
  border: 1px solid rgba(255,255,255,0.08);
  border-top: 3px solid ${({ accent }) => accent ?? "#F97316"};
  border-radius: 10px;
  padding: 14px 16px;
`;

const KpiValue = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: #F4F4F5;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 4px;
`;

const KpiLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #71717A;
  margin-bottom: 4px;
`;

const KpiDesc = styled.div`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 6px;
`;

// Trend badges
const TrendBase = styled.span`
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  padding: 1px 5px;
  display: inline-block;
`;

const TrendUp = styled(TrendBase)`
  background: rgba(74,222,128,0.10);
  color: #059669;
`;

const TrendDown = styled(TrendBase)`
  background: rgba(248,113,113,0.10);
  color: #ef4444;
`;

const TrendNeutral = styled(TrendBase)`
  background: rgba(255,255,255,0.06);
  color: #9ca3af;
`;

// Chart tabs
const ChartTabBar = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const ChartTabBtn = styled.button<{ active: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid ${({ active }) => active ? "#F97316" : "#e5e7eb"};
  background: ${({ active }) => active ? "#F97316" : "rgba(255,255,255,0.04)"};
  color: ${({ active }) => active ? "#fff" : "#71717A"};
  font-size: 13px;
  font-weight: ${({ active }) => active ? 600 : 400};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #F97316;
    color: ${({ active }) => active ? "#fff" : "#F97316"};
  }
`;

const ChartTabDesc = styled.div`
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
  margin-bottom: 16px;
  max-width: 640px;
`;

// Chart card
const ChartCard = styled.div`
  background: #111113;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 20px 16px 8px;
`;

const CapacityLegend = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  padding: 10px 0 4px;
`;

const CapLegItem = styled.div<{ color: string }>`
  font-size: 11px;
  color: #71717A;
  display: flex;
  align-items: center;
  gap: 5px;

  &::before {
    content: "";
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: ${({ color }) => color};
  }
`;

// Highlight cards
const HighlightGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  min-width: 0;

  @media (min-width: 600px) { grid-template-columns: repeat(3, 1fr); }
`;

const HighlightCard = styled.div<{ accent: string }>`
  background: #111113;
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 4px solid ${({ accent }) => accent};
  border-radius: 10px;
  padding: 16px 18px;
  min-width: 0;
  overflow: hidden;
`;

const HighlightBadge = styled.div<{ color: string }>`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ color }) => color};
  margin-bottom: 6px;
`;

const HighlightTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #F4F4F5;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HighlightStat = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: #F4F4F5;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
`;

const HighlightMeta = styled.div`
  font-size: 11px;
  color: #9ca3af;
`;

// Rank table
const RankTable = styled.div`
  background: #111113;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
`;

const RankHeader = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr 90px 54px 80px 80px 120px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #52525B;
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: 28px 1fr 60px 60px;
    > span:nth-child(3), > span:nth-child(5), > span:nth-child(6) { display: none; }
  }
`;

const RankRow = styled.div<{ highlight?: boolean }>`
  display: grid;
  grid-template-columns: 32px 1fr 90px 54px 80px 80px 120px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  gap: 8px;
  background: ${({ highlight }) => highlight ? "rgba(249, 115, 22, 0.07)" : "transparent"};
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(249, 115, 22, 0.05); }

  @media (max-width: 640px) {
    grid-template-columns: 28px 1fr 60px 60px;
    > *:nth-child(3), > *:nth-child(5), > *:nth-child(6) { display: none; }
  }
`;

const RankNum = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #9ca3af;
  text-align: center;
`;

const RankName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #F4F4F5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RankCell = styled.div`
  font-size: 13px;
  color: #374151;
`;

const RateBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RateBarFill = styled.div<{ width: number; color: string }>`
  height: 6px;
  border-radius: 3px;
  width: ${({ width }) => Math.min(width, 100)}%;
  max-width: 60px;
  background: ${({ color }) => color};
  flex-shrink: 0;
`;

const RateLabel = styled.span<{ color: string }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ color }) => color};
`;
