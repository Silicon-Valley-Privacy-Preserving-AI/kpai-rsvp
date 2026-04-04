import { useMemo } from "react";
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

  // Trend: compare last half vs previous half
  const half = Math.max(1, Math.floor(stats.length / 2));
  const prevSlice = stats.slice(0, half);
  const recentSlice = stats.slice(stats.length - half);

  const kpi = useMemo(() => {
    const recentRsvp    = avg(recentSlice.map(s => s.rsvp));
    const prevRsvp      = avg(prevSlice.map(s => s.rsvp));
    const recentCI      = avg(recentSlice.map(s => s.checkinRate));
    const prevCI        = avg(prevSlice.map(s => s.checkinRate));
    const recentNS      = avg(recentSlice.map(s => s.noshow));
    const prevNS        = avg(prevSlice.map(s => s.noshow));

    const withCap       = stats.filter(s => s.fillRate !== null);
    const prevFill      = avg(withCap.slice(0, half).map(s => s.fillRate!));
    const recentFill    = avg(withCap.slice(-half).map(s => s.fillRate!));

    // User growth: last 30d vs prev 30d
    const now = Date.now();
    const d30 = 30 * 86_400_000;
    const newUsersRecent = users.filter(u =>
      !u.is_temporary && now - new Date(u.created_at).getTime() < d30).length;
    const newUsersPrev   = users.filter(u =>
      !u.is_temporary
      && now - new Date(u.created_at).getTime() >= d30
      && now - new Date(u.created_at).getTime() < d30 * 2).length;

    return {
      totalSeminars:   stats.length,
      totalRsvps:      rsvps.length,
      totalCheckins:   rsvps.filter(r => r.checked_in).length,
      overallRate:     rsvps.length > 0
        ? Math.round((rsvps.filter(r => r.checked_in).length / rsvps.length) * 100) : 0,

      avgRsvp:         Math.round(recentRsvp),
      avgRsvpTrend:    pctChange(recentRsvp, prevRsvp),

      avgCI:           Math.round(recentCI),
      avgCITrend:      pctChange(recentCI, prevCI),

      avgNoshow:       Math.round(recentNS),
      avgNoshowTrend:  pctChange(recentNS, prevNS),

      avgFill:         Math.round(recentFill),
      avgFillTrend:    pctChange(recentFill, prevFill),

      newUsers:        newUsersRecent,
      newUsersTrend:   pctChange(newUsersRecent, newUsersPrev),
    };
  }, [stats, recentSlice, prevSlice, half, rsvps, users]);

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

  const PURPLE  = "#6c5ce7";
  const GREEN   = "#059669";
  const RED     = "#ef4444";
  const ORANGE  = "#d97706";
  const BLUE    = "#0ea5e9";
  const GRID    = "#f0eeff";

  return (
    <Wrap>

      {/* ── Section: Summary KPIs ── */}
      <SectionHead>
        <SectionHeadTitle>Overview</SectionHeadTitle>
        <SectionHeadDesc>
          Trend indicators compare the most recent half of seminars to the earlier half.
        </SectionHeadDesc>
      </SectionHead>

      <KpiGrid>
        <KpiCard>
          <KpiValue>{kpi.avgRsvp}</KpiValue>
          <KpiLabel>Avg RSVPs / Seminar</KpiLabel>
          <Trend value={kpi.avgRsvpTrend} />
          <KpiDesc>Higher = growing demand</KpiDesc>
        </KpiCard>
        <KpiCard>
          <KpiValue>{kpi.avgCI}%</KpiValue>
          <KpiLabel>Avg Check-in Rate</KpiLabel>
          <Trend value={kpi.avgCITrend} />
          <KpiDesc>Higher = better commitment</KpiDesc>
        </KpiCard>
        <KpiCard>
          <KpiValue>{kpi.avgNoshow}</KpiValue>
          <KpiLabel>Avg No-shows / Seminar</KpiLabel>
          <Trend value={kpi.avgNoshowTrend} lowerIsBetter />
          <KpiDesc>Lower = better show-up quality</KpiDesc>
        </KpiCard>
        <KpiCard>
          <KpiValue>{kpi.avgFill > 0 ? `${kpi.avgFill}%` : "—"}</KpiValue>
          <KpiLabel>Avg Capacity Fill</KpiLabel>
          <Trend value={kpi.avgFillTrend} />
          <KpiDesc>Demand vs available seats</KpiDesc>
        </KpiCard>
        <KpiCard>
          <KpiValue>{kpi.newUsers}</KpiValue>
          <KpiLabel>New Members (30d)</KpiLabel>
          <Trend value={kpi.newUsersTrend} />
          <KpiDesc>Regular accounts created recently</KpiDesc>
        </KpiCard>
      </KpiGrid>

      {/* ── Section: Attendance Chart ── */}
      <SectionHead style={{ marginTop: 36 }}>
        <SectionHeadTitle>Attendance by Seminar</SectionHeadTitle>
        <SectionHeadDesc>
          RSVPs (registrations) vs actual check-ins per event, in chronological order.
          A large gap between the two bars signals a high no-show rate for that seminar.
        </SectionHeadDesc>
      </SectionHead>
      <ChartCard>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
            barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #ede9fe", fontSize: 13 }}
              formatter={(val: number, name: string) => [val, name === "rsvp" ? "RSVPs" : "Check-ins"]}
              labelFormatter={(l: string) => {
                const s = chartData.find(d => d.date === l);
                return s ? s.fullTitle : l;
              }}
            />
            <Legend
              formatter={(v: string) => v === "rsvp" ? "RSVPs" : "Check-ins"}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="rsvp"    fill={PURPLE} radius={[4,4,0,0]} name="rsvp" />
            <Bar dataKey="checkin" fill={GREEN}  radius={[4,4,0,0]} name="checkin" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Section: Check-in Rate Trend ── */}
      <SectionHead style={{ marginTop: 36 }}>
        <SectionHeadTitle>Check-in Rate Trend</SectionHeadTitle>
        <SectionHeadDesc>
          Attendance rate (check-ins ÷ RSVPs) per seminar. The dashed line shows a 3-seminar
          rolling average to smooth out one-off outliers. Aim to keep this above 60%.
        </SectionHeadDesc>
      </SectionHead>
      <ChartCard>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #ede9fe", fontSize: 13 }}
              formatter={(val: number, name: string) => [
                `${val}%`,
                name === "checkinRate" ? "Check-in rate" : "3-sem. rolling avg",
              ]}
              labelFormatter={(l: string) => {
                const s = chartData.find(d => d.date === l);
                return s ? s.fullTitle : l;
              }}
            />
            <ReferenceLine y={60} stroke={ORANGE} strokeDasharray="4 2"
              label={{ value: "60% target", position: "right", fontSize: 11, fill: ORANGE }} />
            <Legend
              formatter={(v: string) => v === "checkinRate" ? "Check-in Rate" : "3-Sem. Rolling Avg"}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="checkinRate"
              stroke={GREEN}
              strokeWidth={2}
              dot={{ r: 4, fill: GREEN }}
              name="checkinRate"
            />
            <Line
              type="monotone"
              dataKey="rollingCI"
              stroke={PURPLE}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              name="rollingCI"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Section: Capacity Fill ── */}
      {stats.some(s => s.fillRate !== null) && (
        <>
          <SectionHead style={{ marginTop: 36 }}>
            <SectionHeadTitle>Capacity Utilization</SectionHeadTitle>
            <SectionHeadDesc>
              Percentage of seats filled per seminar (RSVPs ÷ max capacity).
              Over 100% means the CSV import bypassed the cap — marked in red.
              100% = fully booked, which may indicate unmet demand.
            </SectionHeadDesc>
          </SectionHead>
          <ChartCard>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData.filter(s => s.fillRate !== null)}
                margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #ede9fe", fontSize: 13 }}
                  formatter={(val: number) => [`${val}%`, "Capacity Fill"]}
                  labelFormatter={(l: string) => {
                    const s = chartData.find(d => d.date === l);
                    return s ? `${s.fullTitle} (cap: ${s.maxCapacity})` : l;
                  }}
                />
                <ReferenceLine y={100} stroke={RED} strokeDasharray="4 2"
                  label={{ value: "100%", position: "right", fontSize: 11, fill: RED }} />
                <Bar dataKey="fillRate" radius={[4,4,0,0]} name="fillRate">
                  {chartData
                    .filter(s => s.fillRate !== null)
                    .map((s, i) => (
                      <Cell
                        key={i}
                        fill={s.fillRate! >= 100 ? RED : s.fillRate! >= 80 ? ORANGE : BLUE}
                      />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <CapacityLegend>
              <CapLegItem color={BLUE}>Under 80%</CapLegItem>
              <CapLegItem color={ORANGE}>80–99%</CapLegItem>
              <CapLegItem color={RED}>100%+ (over capacity)</CapLegItem>
            </CapacityLegend>
          </ChartCard>
        </>
      )}

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

const SectionHead = styled.div`
  margin-bottom: 14px;
`;

const SectionHeadTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #111827;
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
  background: #fff;
  border: 1px solid #e5e7eb;
  border-top: 3px solid ${({ accent }) => accent ?? "#6c5ce7"};
  border-radius: 10px;
  padding: 14px 16px;
`;

const KpiValue = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 4px;
`;

const KpiLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
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
  background: #d1fae5;
  color: #059669;
`;

const TrendDown = styled(TrendBase)`
  background: #fee2e2;
  color: #ef4444;
`;

const TrendNeutral = styled(TrendBase)`
  background: #f3f4f6;
  color: #9ca3af;
`;

// Chart card
const ChartCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
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
  color: #6b7280;
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
  background: #fff;
  border: 1px solid #e5e7eb;
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
  color: #111827;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HighlightStat = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
`;

const HighlightMeta = styled.div`
  font-size: 11px;
  color: #9ca3af;
`;

// Rank table
const RankTable = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`;

const RankHeader = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr 90px 54px 80px 80px 120px;
  padding: 10px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
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
  border-bottom: 1px solid #f3f4f6;
  gap: 8px;
  background: ${({ highlight }) => highlight ? "#f8f7ff" : "transparent"};
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #faf9ff; }

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
  color: #111827;
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
