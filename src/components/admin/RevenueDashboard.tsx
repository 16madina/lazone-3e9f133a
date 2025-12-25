import { useState, useEffect } from 'react';
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, Calendar, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  created_at: string;
  user_id: string;
}

interface ChartData {
  date: string;
  label: string;
  amount: number;
  count: number;
}

interface Stats {
  totalRevenue: number;
  totalPayments: number;
  avgPayment: number;
  trend: number; // percentage change
}

const RevenueDashboard = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalPayments: 0,
    avgPayment: 0,
    trend: 0,
  });

  // Fetch all payments
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('listing_payments')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setPayments(data || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Process data based on selected period
  useEffect(() => {
    if (payments.length === 0) {
      setChartData([]);
      setStats({ totalRevenue: 0, totalPayments: 0, avgPayment: 0, trend: 0 });
      return;
    }

    const now = new Date();
    let intervals: Date[] = [];
    let dateFormat = 'dd MMM';
    let previousPeriodStart: Date;
    let currentPeriodStart: Date;

    switch (period) {
      case 'day':
        // Last 30 days
        currentPeriodStart = subDays(now, 30);
        previousPeriodStart = subDays(now, 60);
        intervals = eachDayOfInterval({ start: currentPeriodStart, end: now });
        dateFormat = 'dd MMM';
        break;
      case 'week':
        // Last 12 weeks
        currentPeriodStart = subWeeks(now, 12);
        previousPeriodStart = subWeeks(now, 24);
        intervals = eachWeekOfInterval({ start: currentPeriodStart, end: now }, { locale: fr });
        dateFormat = "'S'w";
        break;
      case 'month':
        // Last 12 months
        currentPeriodStart = subMonths(now, 12);
        previousPeriodStart = subMonths(now, 24);
        intervals = eachMonthOfInterval({ start: currentPeriodStart, end: now });
        dateFormat = 'MMM yyyy';
        break;
    }

    // Group payments by interval
    const groupedData: ChartData[] = intervals.map((intervalStart) => {
      let intervalEnd: Date;
      let label: string;

      switch (period) {
        case 'day':
          intervalEnd = new Date(intervalStart);
          intervalEnd.setHours(23, 59, 59, 999);
          label = format(intervalStart, 'dd MMM', { locale: fr });
          break;
        case 'week':
          intervalEnd = new Date(intervalStart);
          intervalEnd.setDate(intervalEnd.getDate() + 6);
          intervalEnd.setHours(23, 59, 59, 999);
          label = `S${format(intervalStart, 'w', { locale: fr })}`;
          break;
        case 'month':
          intervalEnd = new Date(intervalStart.getFullYear(), intervalStart.getMonth() + 1, 0, 23, 59, 59, 999);
          label = format(intervalStart, 'MMM', { locale: fr });
          break;
        default:
          intervalEnd = intervalStart;
          label = format(intervalStart, 'dd MMM', { locale: fr });
      }

      const intervalPayments = payments.filter((p) => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= intervalStart && paymentDate <= intervalEnd;
      });

      return {
        date: intervalStart.toISOString(),
        label,
        amount: intervalPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        count: intervalPayments.length,
      };
    });

    setChartData(groupedData);

    // Calculate stats
    const currentPeriodPayments = payments.filter(
      (p) => new Date(p.created_at) >= currentPeriodStart
    );
    const previousPeriodPayments = payments.filter(
      (p) => new Date(p.created_at) >= previousPeriodStart && new Date(p.created_at) < currentPeriodStart
    );

    const currentRevenue = currentPeriodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const previousRevenue = previousPeriodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const trend = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : currentRevenue > 0 ? 100 : 0;

    setStats({
      totalRevenue: currentRevenue,
      totalPayments: currentPeriodPayments.length,
      avgPayment: currentPeriodPayments.length > 0 
        ? Math.round(currentRevenue / currentPeriodPayments.length) 
        : 0,
      trend: Math.round(trend),
    });
  }, [payments, period]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-primary font-bold">{formatPrice(payload[0].value)}</p>
          <p className="text-xs text-muted-foreground">
            {payload[0].payload.count} paiement{payload[0].payload.count > 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-4 rounded-xl border border-primary/20">
          <div className="flex items-center gap-2 text-primary/80 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Revenus</span>
          </div>
          <p className="text-xl font-bold text-primary">{formatPrice(stats.totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-1">
            {stats.trend >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs ${stats.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.trend >= 0 ? '+' : ''}{stats.trend}%
            </span>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Paiements</span>
          </div>
          <p className="text-xl font-bold">{stats.totalPayments}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Moy: {formatPrice(stats.avgPayment)}
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="day" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            Jours
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            Semaines
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            Mois
          </TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-4">
          {/* Chart */}
          <div className="bg-card p-4 rounded-xl border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Évolution des revenus
              </h3>
              <Badge variant="outline" className="text-xs">
                {period === 'day' && '30 derniers jours'}
                {period === 'week' && '12 dernières semaines'}
                {period === 'month' && '12 derniers mois'}
              </Badge>
            </div>

            {chartData.length === 0 || chartData.every(d => d.amount === 0) ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune donnée pour cette période</p>
                </div>
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                      interval={period === 'day' ? 4 : 0}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar Chart for payment count */}
          {chartData.length > 0 && !chartData.every(d => d.count === 0) && (
            <div className="bg-card p-4 rounded-xl border mt-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Nombre de paiements
              </h3>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                      interval={period === 'day' ? 4 : 0}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-lg p-3 shadow-lg">
                              <p className="font-medium text-sm">{label}</p>
                              <p className="text-primary font-bold">
                                {payload[0].value} paiement{Number(payload[0].value) > 1 ? 's' : ''}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent transactions summary */}
      <div className="bg-card p-4 rounded-xl border">
        <h3 className="font-semibold text-sm mb-3">Résumé global</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total historique</p>
            <p className="font-bold">{formatPrice(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tous les paiements</p>
            <p className="font-bold">{payments.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;
