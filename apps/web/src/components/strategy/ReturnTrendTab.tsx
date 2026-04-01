import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { strategyApi, type ReturnHistoryPoint } from '@/lib/api';
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { Info } from 'lucide-react';

export default function ReturnTrendTab() {
  const [period, setPeriod] = useState<'monthly' | 'quarterly'>('monthly');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['strategy', 'return-history', period],
    queryFn: () => strategyApi.getReturnHistory(period),
  });

  const chartData = useMemo(() => {
    return history.map((p: ReturnHistoryPoint) => ({
      date: p.date,
      평가액: Math.round(p.totalValue),
      투자원금: Math.round(p.totalCost),
      수익률: Number(p.returnRate.toFixed(2)),
    }));
  }, [history]);

  const typePerformance = useMemo(() => {
    if (history.length < 2) return [];
    const latest = history[history.length - 1];
    if (!latest.byType) return [];

    return Object.entries(latest.byType).map(([type, data]) => {
      const returnRate = data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0;
      return {
        name: ASSET_TYPE_LABELS[type] ?? type,
        type,
        수익률: Number(returnRate.toFixed(2)),
        평가액: Math.round(data.value),
        투자원금: Math.round(data.cost),
      };
    }).sort((a, b) => b.수익률 - a.수익률);
  }, [history]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        로딩 중...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Info className="h-8 w-8 mb-2" />
          <p>아직 거래 내역이 없어요</p>
          <p className="text-sm mt-1">거래가 쌓이면 투자 성과를 확인할 수 있습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">기간:</span>
        <div className="flex bg-gray-100 rounded-md p-0.5">
          <Button
            variant={period === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('monthly')}
            className="h-7 text-xs"
          >
            월별
          </Button>
          <Button
            variant={period === 'quarterly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('quarterly')}
            className="h-7 text-xs"
          >
            분기별
          </Button>
        </div>
        <div className="flex items-center gap-1 ml-auto text-xs text-gray-400">
          <Info className="h-3.5 w-3.5" />
          실제 거래 기준 추정치예요
        </div>
      </div>

      {/* Portfolio Value Chart */}
      <Card>
        <CardHeader>
          <CardTitle>내 자산 변화</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const [y, m] = v.split('-');
                  return `${y.slice(2)}.${m}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
                  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
                  return v.toLocaleString();
                }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => {
                  const [y, m] = label.split('-');
                  return `${y}년 ${m}월`;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="평가액" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="투자원금" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Return Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>수익률 변화</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const [y, m] = v.split('-');
                  return `${y.slice(2)}.${m}`;
                }}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, '수익률']}
                labelFormatter={(label) => {
                  const [y, m] = label.split('-');
                  return `${y}년 ${m}월`;
                }}
              />
              <Bar dataKey="수익률" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.수익률 >= 0 ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Type Performance */}
      {typePerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>유형별 수익률 비교</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typePerformance} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === '수익률') return [`${value.toFixed(2)}%`, name];
                    return [formatCurrency(value), name];
                  }}
                />
                <Bar dataKey="수익률" radius={[4, 4, 0, 0]}>
                  {typePerformance.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={ASSET_TYPE_COLORS[entry.type] ?? '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
