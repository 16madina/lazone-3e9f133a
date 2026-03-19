import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, parseISO, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Users, TrendingUp, Calendar, Loader2, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface NewUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  user_type: string | null;
  created_at: string;
}

interface DayData {
  date: string;
  label: string;
  count: number;
  users: NewUser[];
}

const NewUsersTab = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [totalNewUsers, setTotalNewUsers] = useState(0);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const fetchNewUsers = async () => {
    setLoading(true);
    try {
      const days = parseInt(period);
      const since = subDays(new Date(), days).toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, country, user_type, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const users: NewUser[] = data || [];
      setTotalNewUsers(users.length);

      // Group by day
      const dayMap = new Map<string, NewUser[]>();

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const d = subDays(new Date(), i);
        const key = format(d, 'yyyy-MM-dd');
        dayMap.set(key, []);
      }

      users.forEach(u => {
        const key = format(parseISO(u.created_at), 'yyyy-MM-dd');
        if (dayMap.has(key)) {
          dayMap.get(key)!.push(u);
        }
      });

      const result: DayData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const key = format(d, 'yyyy-MM-dd');
        result.push({
          date: key,
          label: format(d, 'dd MMM', { locale: fr }),
          count: dayMap.get(key)?.length || 0,
          users: dayMap.get(key) || [],
        });
      }

      setDayData(result);
    } catch (error) {
      console.error('Error fetching new users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewUsers();
  }, [period]);

  const todayCount = dayData.length > 0 ? dayData[dayData.length - 1].count : 0;
  const avgPerDay = dayData.length > 0 ? Math.round(totalNewUsers / dayData.length * 10) / 10 : 0;

  const getUserTypeLabel = (type: string | null) => {
    switch (type) {
      case 'particulier': return 'Particulier';
      case 'proprietaire': return 'Propriétaire';
      case 'demarcheur': return 'Démarcheur';
      case 'agence': return 'Agence';
      default: return 'Particulier';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Nouveaux utilisateurs
        </h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="14">14 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
            <SelectItem value="60">60 jours</SelectItem>
            <SelectItem value="90">90 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mx-auto mb-2">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="font-display font-bold text-xl">{totalNewUsers}</p>
          <p className="text-xs text-muted-foreground">Total période</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mx-auto mb-2">
            <UserPlus className="w-5 h-5 text-green-600" />
          </div>
          <p className="font-display font-bold text-xl">{todayCount}</p>
          <p className="text-xs text-muted-foreground">Aujourd'hui</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="font-display font-bold text-xl">{avgPerDay}</p>
          <p className="text-xs text-muted-foreground">Moy/jour</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h4 className="font-medium text-sm mb-3 text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Inscriptions par jour
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval={parseInt(period) > 14 ? Math.floor(parseInt(period) / 7) : 0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} inscription${value > 1 ? 's' : ''}`, '']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day-by-day list (most recent first) */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">Détail par jour</h4>
        {[...dayData].reverse().map((day) => (
          <div key={day.date} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="font-medium text-sm">
                    {format(parseISO(day.date), 'EEEE dd MMMM', { locale: fr })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={day.count > 0 ? 'default' : 'secondary'} className="min-w-[28px] justify-center">
                  {day.count}
                </Badge>
                {day.count > 0 && (
                  expandedDay === day.date ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {expandedDay === day.date && day.users.length > 0 && (
              <div className="border-t border-border divide-y divide-border">
                {day.users.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.full_name || 'Sans nom'}</p>
                      <p className="text-xs text-muted-foreground">
                        {getUserTypeLabel(u.user_type)}
                        {u.country && ` · ${u.country}`}
                        {' · '}
                        {format(parseISO(u.created_at), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewUsersTab;
