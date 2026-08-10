import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Heart, X, Sparkles, TrendingUp, Search, Activity, ArrowUp, ArrowDown, ArrowUpDown, Link2, UserCheck, UserX, Repeat } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface UserStats {
  user_id: string;
  email: string;
  first_name: string | null;
  region: string;
  language: string;
  liked_count: number;
  passed_count: number;
  matched_count: number;
  total_reviewed: number;
  created_at: string;
  last_activity: string | null;
  last_sign_in: string | null;
}

interface DailyActivity {
  date: string;
  likes: number;
  passes: number;
  total: number;
}

interface DailyActiveUsers {
  date: string;      // dd/mm label used on the axis + as the filter key
  fullDate: string;  // dd/mm/yyyy for display
  activeUsers: number;
  userIds: string[];
}

interface RetentionPoint {
  day: string;      // "Day 0 (signup)" … "Day 7"
  pct: number;      // % of eligible users active on that day
  retained: number;
  eligible: number;
}

// Shape returned by the get_admin_usage_stats() RPC (all aggregation done in Postgres).
interface UsageStatsPayload {
  total_users: number;
  users: UserStats[];
  partners: [string, string][];
  daily: { d: string; likes: number; passes: number }[];
  dau: { d: string; user_ids: string[] }[];
  retention: { day_offset: number; eligible: number; retained: number }[];
  totals: { likes: number; passes: number; matches: number };
}

type SortKey = 'user' | 'region' | 'language' | 'liked_count' | 'passed_count' | 'matched_count' | 'total_reviewed' | 'created_at' | 'last_activity';

// Text columns read best A→Z on first click; counts and dates read best biggest/newest first.
const TEXT_COLUMNS: SortKey[] = ['user', 'region', 'language'];

const USERS_PER_PAGE = 25;

// dd/mm/yyyy and dd/mm/yyyy HH:mm — the formats the admin panel standardizes on.
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (s?: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const fmtDateTime = (s?: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const AdminUsageStats = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [totals, setTotals] = useState({ likes: 0, passes: 0, matches: 0 });
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [dailyActiveUsers, setDailyActiveUsers] = useState<DailyActiveUsers[]>([]);
  const [retention, setRetention] = useState<RetentionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [partnerMap, setPartnerMap] = useState<Record<string, string>>({});
  const [groupByPartner, setGroupByPartner] = useState(false);
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsageStats();
  }, []);

  const loadUsageStats = async () => {
    setLoading(true);
    try {
      // All aggregation happens server-side — one RPC returns ~one row per user plus the
      // chart series, instead of shipping every user_swipes row (tens of thousands) to the
      // browser to be counted in JS.
      const { data, error } = await supabase.rpc('get_admin_usage_stats');
      if (error) throw error;
      const payload = data as unknown as UsageStatsPayload;

      setTotalUsers(payload.total_users ?? 0);
      setUserStats(payload.users ?? []);
      setTotals(payload.totals ?? { likes: 0, passes: 0, matches: 0 });

      // Map each user to their partner for grouping and hover-highlighting
      const pMap: Record<string, string> = {};
      (payload.partners ?? []).forEach(([a, b]) => {
        if (a && b) { pMap[a] = b; pMap[b] = a; }
      });
      setPartnerMap(pMap);

      // Build the last-30-days scaffold and fill it from the RPC's per-day aggregates.
      const dailyByDate = new Map((payload.daily ?? []).map(x => [x.d, x]));
      const dauByDate = new Map((payload.dau ?? []).map(x => [x.d, x.user_ids]));
      const today = new Date();
      const dailyData: DailyActivity[] = [];
      const dauData: DailyActiveUsers[] = [];
      for (let i = 29; i >= 0; i--) {
        const dt = new Date(today);
        dt.setDate(dt.getDate() - i);
        const iso = dt.toISOString().slice(0, 10);
        const label = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`;
        const full = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
        const dd = dailyByDate.get(iso);
        const likes = dd?.likes ?? 0;
        const passes = dd?.passes ?? 0;
        dailyData.push({ date: label, likes, passes, total: likes + passes });
        const ids = dauByDate.get(iso) ?? [];
        dauData.push({ date: label, fullDate: full, activeUsers: ids.length, userIds: ids });
      }
      setDailyActivity(dailyData);
      setDailyActiveUsers(dauData);

      setRetention((payload.retention ?? []).map(r => ({
        day: r.day_offset === 0 ? 'Day 0 (signup)' : `Day ${r.day_offset}`,
        pct: r.eligible > 0 ? Math.round((r.retained / r.eligible) * 100) : 0,
        retained: r.retained,
        eligible: r.eligible,
      })));
    } catch (error) {
      console.error('Error loading usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(TEXT_COLUMNS.includes(key) ? 'asc' : 'desc');
    }
  };

  // Back to page 1 whenever the visible set changes shape
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortKey, sortDir, selectedDay, groupByPartner]);

  const dayFilter = selectedDay ? dailyActiveUsers.find(d => d.date === selectedDay) : undefined;

  const filteredUsers = userStats.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDay = !dayFilter || dayFilter.userIds.includes(user.user_id);
    return matchesSearch && matchesDay;
  });

  const sortValue = (user: UserStats): string | number => {
    switch (sortKey) {
      case 'user': return (user.first_name || user.email).toLowerCase();
      case 'region': return user.region.toLowerCase();
      case 'language': return user.language.toLowerCase();
      case 'created_at': return new Date(user.created_at).getTime();
      case 'last_activity': return user.last_activity ? new Date(user.last_activity).getTime() : 0;
      default: return user[sortKey];
    }
  };

  // Sorts the full in-memory set before pagination, so the order is global across all pages.
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const va = sortValue(a);
    const vb = sortValue(b);
    const cmp = typeof va === 'string' && typeof vb === 'string'
      ? va.localeCompare(vb)
      : (va as number) - (vb as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Group partners into pairs so they render as adjacent rows. A partner is pulled into the
  // group even when they don't match the current search/day filter — finding one half of a
  // couple should still show the couple. Pagination works on groups so pairs never split
  // across pages.
  const userGroups: UserStats[][] = (() => {
    if (!groupByPartner) return sortedUsers.map(u => [u]);
    const byId = new Map(userStats.map(u => [u.user_id, u]));
    const emitted = new Set<string>();
    const groups: UserStats[][] = [];
    sortedUsers.forEach(user => {
      if (emitted.has(user.user_id)) return;
      emitted.add(user.user_id);
      const partner = partnerMap[user.user_id] ? byId.get(partnerMap[user.user_id]) : undefined;
      if (partner && !emitted.has(partner.user_id)) {
        emitted.add(partner.user_id);
        groups.push([user, partner]);
      } else {
        groups.push([user]);
      }
    });
    return groups;
  })();

  const totalPages = Math.max(1, Math.ceil(userGroups.length / USERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedGroups = userGroups.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  const SortableHeader = ({ column, label, align = 'left' }: { column: SortKey; label: string; align?: 'left' | 'center' }) => (
    <th className={`${align === 'center' ? 'text-center' : 'text-left'} p-3 font-medium`}>
      <button
        onClick={() => handleSort(column)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey === column ? 'text-foreground' : ''}`}
      >
        {label}
        {sortKey === column
          ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />)
          : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
      </button>
    </th>
  );

  const totalLikes = totals.likes;
  const totalPasses = totals.passes;
  const totalMatches = totals.matches;
  const totalSwipes = totalLikes + totalPasses;
  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);
  const likePct = pct(totalLikes, totalSwipes);
  const passPct = pct(totalPasses, totalSwipes);

  // A user is "paired" if they're in an active partnership (i.e. appears in the partner map).
  const pairedUsers = userStats.filter(u => partnerMap[u.user_id]);
  const pairedCount = pairedUsers.length;
  const soloCount = userStats.length - pairedCount;
  const pairedPct = pct(pairedCount, userStats.length);
  const soloPct = pct(soloCount, userStats.length);
  // Match rate is only meaningful against likes that *could* match — i.e. likes from users
  // who have a partner. Solo users' likes have no partner to match against, so excluding them.
  const pairedLikes = pairedUsers.reduce((sum, u) => sum + u.liked_count, 0);
  const matchPctOfLikes = pct(totalMatches, pairedLikes);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats — all key numbers in one row, partner breakdown right after users */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <UserCheck className="w-8 h-8 text-teal-500" />
            <div>
              <p className="text-2xl font-bold">{pairedCount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">With Partner</p>
              <p className="text-xs text-teal-600 font-medium">{pairedPct}% · {(pairedCount / 2).toLocaleString()} couples</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <UserX className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{soloCount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Without Partner</p>
              <p className="text-xs text-amber-600 font-medium">{soloPct}% of accounts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Heart className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalLikes.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Likes</p>
              <p className="text-xs text-green-600 font-medium">{likePct}% of swipes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <X className="w-8 h-8 text-pink-500" />
            <div>
              <p className="text-2xl font-bold">{totalPasses.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Passes</p>
              <p className="text-xs text-pink-600 font-medium">{passPct}% of swipes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-8 h-8 text-teal-500" />
            <div>
              <p className="text-2xl font-bold">{Math.round(totalMatches).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Matches</p>
              <p className="text-xs text-teal-600 font-medium">{matchPctOfLikes}% of paired likes</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users Chart */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Daily Active Users (Last 30 Days)</h3>
            <span className="text-sm text-muted-foreground">· click a day to filter the user table</span>
          </div>
          <div className="h-[250px] cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyActiveUsers}
                onClick={(e) => {
                  const day = e?.activeLabel ? String(e.activeLabel) : null;
                  if (day) setSelectedDay(prev => (prev === day ? null : day));
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Active Users"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </Card>

        {/* Daily Activity Chart */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Daily Activity (Last 30 Days)</h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="likes"
                  stroke="#22C55E"
                  strokeWidth={2}
                  name="Likes"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="passes"
                  stroke="#EF5185"
                  strokeWidth={2}
                  name="Passes"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Retention Curve */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Repeat className="w-5 h-5 text-violet-500" />
          <h3 className="text-lg font-semibold">Retention — Days Since Signup</h3>
          <span className="text-sm text-muted-foreground">· % of users active each day after joining</span>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={retention} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, _name, props: { payload?: RetentionPoint }) => [
                  `${value}% · ${props.payload?.retained ?? 0} of ${props.payload?.eligible ?? 0} users`,
                  'Retained'
                ]}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Retention"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Each point counts only users whose account is old enough to have reached that day. Day 0 is the signup day.
        </p>
      </Card>


      {/* User Stats Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">User Breakdown</h3>
            {dayFilter && (
              <Badge variant="secondary" className="flex items-center gap-1.5">
                Active on {dayFilter.fullDate}
                <button
                  onClick={() => setSelectedDay(null)}
                  className="hover:text-foreground"
                  aria-label="Clear day filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={groupByPartner ? "default" : "outline"}
              size="sm"
              onClick={() => setGroupByPartner(prev => !prev)}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Group partners
            </Button>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <SortableHeader column="user" label="User" />
                <SortableHeader column="region" label="Region" />
                <SortableHeader column="language" label="Language" />
                <SortableHeader column="liked_count" label="Liked" align="center" />
                <SortableHeader column="passed_count" label="Passed" align="center" />
                <SortableHeader column="matched_count" label="Matches" align="center" />
                <SortableHeader column="total_reviewed" label="Total" align="center" />
                <SortableHeader column="created_at" label="Joined" />
                <SortableHeader column="last_activity" label="Last activity" />
              </tr>
            </thead>
            <tbody>
              {pagedGroups.map(group => group.map((user) => {
                const partnerId = partnerMap[user.user_id];
                // Light up both halves of a couple when either row is hovered
                const coupleHovered = hoveredUserId !== null && partnerId !== undefined &&
                  (hoveredUserId === user.user_id || hoveredUserId === partnerId);
                return (
                <tr
                  key={user.user_id}
                  onMouseEnter={() => setHoveredUserId(user.user_id)}
                  onMouseLeave={() => setHoveredUserId(null)}
                  className={`border-t transition-colors ${
                    coupleHovered ? 'bg-teal-500/15' : 'hover:bg-muted/25'
                  } ${groupByPartner && group.length === 2 ? 'border-l-2 border-l-teal-400/70' : ''}`}
                >
                  <td className="p-3">
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        {user.first_name || 'No name'}
                        {partnerId && (
                          <Link2 className="w-3.5 h-3.5 text-teal-500" aria-label="Has partner" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{user.region}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{user.language}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-green-600 font-medium">{user.liked_count}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-pink-600 font-medium">{user.passed_count}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-teal-600 font-medium">{user.matched_count}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-bold">{user.total_reviewed}</span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(user.created_at)}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(user.last_activity)}
                  </td>
                </tr>
                );
              }))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {userGroups.length > USERS_PER_PAGE && (
          <div className="border-t mt-4 pt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * USERS_PER_PAGE + 1}–{Math.min(currentPage * USERS_PER_PAGE, userGroups.length)} of {userGroups.length} {groupByPartner ? 'entries (partners grouped)' : 'users'}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
