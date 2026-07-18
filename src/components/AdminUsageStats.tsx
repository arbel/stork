import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Users, Heart, X, Sparkles, TrendingUp, Search, Activity } from "lucide-react";
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
}

interface DailyActivity {
  date: string;
  likes: number;
  passes: number;
  total: number;
}

interface DailyActiveUsers {
  date: string;
  activeUsers: number;
}

export const AdminUsageStats = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [dailyActiveUsers, setDailyActiveUsers] = useState<DailyActiveUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadUsageStats();
  }, []);

  const loadUsageStats = async () => {
    setLoading(true);
    try {
      // Get total users count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;
      setTotalUsers(usersCount || 0);

      // Get all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, preferences, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all swipes
      const { data: swipes, error: swipesError } = await supabase
        .from('user_swipes')
        .select('user_id, action, created_at');

      if (swipesError) throw swipesError;

      // Get all partnerships to calculate matches
      const { data: partnerships, error: partnershipsError } = await supabase
        .from('partnerships')
        .select('id, user1_id, user2_id, status')
        .eq('status', 'active');

      if (partnershipsError) throw partnershipsError;

      // Calculate per-user stats
      const userStatsMap = new Map<string, UserStats>();

      profiles?.forEach(profile => {
        const prefs = profile.preferences as { country?: string; language?: string } | null;
        userStatsMap.set(profile.user_id, {
          user_id: profile.user_id,
          email: profile.email,
          first_name: profile.first_name,
          region: prefs?.country || 'N/A',
          language: prefs?.language || 'N/A',
          liked_count: 0,
          passed_count: 0,
          matched_count: 0,
          total_reviewed: 0,
          created_at: profile.created_at
        });
      });

      // Count likes and passes per user
      swipes?.forEach(swipe => {
        const userStat = userStatsMap.get(swipe.user_id);
        if (userStat) {
          if (swipe.action === 'like') {
            userStat.liked_count++;
          } else if (swipe.action === 'pass') {
            userStat.passed_count++;
          }
          userStat.total_reviewed++;
        }
      });

      // Calculate matches per user (names liked by both partners)
      partnerships?.forEach(partnership => {
        if (!partnership.user1_id || !partnership.user2_id) return;
        
        const user1Likes = new Set(
          swipes?.filter(s => s.user_id === partnership.user1_id && s.action === 'like')
            .map(s => (s as any).name) || []
        );
        
        const user2Likes = new Set(
          swipes?.filter(s => s.user_id === partnership.user2_id && s.action === 'like')
            .map(s => (s as any).name) || []
        );

        // This is a simplified approach - we'd need actual name data for accurate counts
        // For now, we'll estimate based on swipe data
      });

      // Load swipes with names for match calculation
      const { data: swipesWithNames, error: swipesNamesError } = await supabase
        .from('user_swipes')
        .select('user_id, name, action, partnership_id');

      if (!swipesNamesError && swipesWithNames) {
        // Group swipes by partnership
        const partnershipSwipes = new Map<string, { user1Likes: Set<string>; user2Likes: Set<string>; user1Id: string; user2Id: string }>();
        
        partnerships?.forEach(p => {
          if (p.user1_id && p.user2_id) {
            partnershipSwipes.set(p.id, {
              user1Likes: new Set(),
              user2Likes: new Set(),
              user1Id: p.user1_id,
              user2Id: p.user2_id
            });
          }
        });

        swipesWithNames.forEach(swipe => {
          if (!swipe.partnership_id || swipe.action !== 'like') return;
          const pData = partnershipSwipes.get(swipe.partnership_id);
          if (pData) {
            if (swipe.user_id === pData.user1Id) {
              pData.user1Likes.add(swipe.name);
            } else if (swipe.user_id === pData.user2Id) {
              pData.user2Likes.add(swipe.name);
            }
          }
        });

        // Count matches per user
        partnershipSwipes.forEach(pData => {
          const matchCount = [...pData.user1Likes].filter(n => pData.user2Likes.has(n)).length;
          
          const user1Stat = userStatsMap.get(pData.user1Id);
          const user2Stat = userStatsMap.get(pData.user2Id);
          
          if (user1Stat) user1Stat.matched_count = matchCount;
          if (user2Stat) user2Stat.matched_count = matchCount;
        });
      }

      setUserStats(Array.from(userStatsMap.values()));

      // Calculate daily activity for the last 30 days
      const dailyMap = new Map<string, { likes: number; passes: number }>();
      const today = new Date();
      
      // Initialize last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, { likes: 0, passes: 0 });
      }

      // Count swipes per day
      swipes?.forEach(swipe => {
        const dateStr = new Date(swipe.created_at).toISOString().split('T')[0];
        const dayData = dailyMap.get(dateStr);
        if (dayData) {
          if (swipe.action === 'like') {
            dayData.likes++;
          } else if (swipe.action === 'pass') {
            dayData.passes++;
          }
        }
      });

      const dailyData: DailyActivity[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        likes: data.likes,
        passes: data.passes,
        total: data.likes + data.passes
      }));

      setDailyActivity(dailyData);

      // Calculate daily active users
      const dailyUsersMap = new Map<string, Set<string>>();
      
      // Initialize last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyUsersMap.set(dateStr, new Set());
      }

      // Track unique users per day
      swipes?.forEach(swipe => {
        const dateStr = new Date(swipe.created_at).toISOString().split('T')[0];
        const dayUsers = dailyUsersMap.get(dateStr);
        if (dayUsers) {
          dayUsers.add(swipe.user_id);
        }
      });

      const dailyActiveData: DailyActiveUsers[] = Array.from(dailyUsersMap.entries()).map(([date, users]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        activeUsers: users.size
      }));

      setDailyActiveUsers(dailyActiveData);

    } catch (error) {
      console.error('Error loading usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = userStats.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.first_name && user.first_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalLikes = userStats.reduce((sum, u) => sum + u.liked_count, 0);
  const totalPasses = userStats.reduce((sum, u) => sum + u.passed_count, 0);
  const totalMatches = userStats.reduce((sum, u) => sum + u.matched_count, 0) / 2; // Divide by 2 since matches are counted for both partners

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
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <Heart className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalLikes.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Likes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <X className="w-8 h-8 text-pink-500" />
            <div>
              <p className="text-2xl font-bold">{totalPasses.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Passes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-8 h-8 text-teal-500" />
            <div>
              <p className="text-2xl font-bold">{Math.round(totalMatches).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Matches</p>
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
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyActiveUsers}>
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


      {/* User Stats Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">User Breakdown</h3>
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
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Region</th>
                <th className="text-left p-3 font-medium">Language</th>
                <th className="text-center p-3 font-medium">Liked</th>
                <th className="text-center p-3 font-medium">Passed</th>
                <th className="text-center p-3 font-medium">Matches</th>
                <th className="text-center p-3 font-medium">Total</th>
                <th className="text-left p-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="border-t hover:bg-muted/25">
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{user.first_name || 'No name'}</div>
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
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};