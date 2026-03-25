import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CalendarCheck, PieChart, RotateCcw, Rocket, TrendingUp, TrendingDown } from 'lucide-react';
import ScoreCard from './ScoreCard';

const turnoverLabels = {
  patient: { label: '장기 투자자', color: '#22c55e' },
  moderate: { label: '보통', color: '#eab308' },
  active: { label: '활발한 매매', color: '#ef4444' },
  unknown: { label: '데이터 부족', color: '#6b7280' },
};

export default function HabitsTracker() {
  const { data, isLoading } = useQuery({
    queryKey: ['insights', 'habits'],
    queryFn: insightsApi.getHabits,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">분석 중...</div>;
  }

  if (!data || data.dataQuality === 'insufficient') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>거래 데이터가 부족합니다.</p>
        <p className="text-sm">최소 1건의 거래 내역이 필요합니다.</p>
      </div>
    );
  }

  const turnover = turnoverLabels[data.turnoverRate.level];

  return (
    <div className="space-y-6">
      {/* Score cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          title="투자 일관성"
          icon={CalendarCheck}
          score={`${data.consistencyScore}점`}
          subtitle={`최근 12개월 중 ${data.monthsInvested}개월 투자`}
          color="#3b82f6"
          detail={data.consistencyScore >= 80 ? '꾸준한 투자를 하고 계십니다!' : '매달 정기적으로 투자하면 수익률이 안정됩니다.'}
        />
        <ScoreCard
          title="분산투자 추세"
          icon={PieChart}
          score={data.diversificationTrend.improving ? '개선 중' : '정체'}
          subtitle={`HHI ${data.diversificationTrend.current.toLocaleString()}`}
          color={data.diversificationTrend.improving ? '#22c55e' : '#eab308'}
          detail={`6개월 전 HHI ${data.diversificationTrend.sixMonthsAgo.toLocaleString()} → 현재 ${data.diversificationTrend.current.toLocaleString()}`}
        />
        <ScoreCard
          title="포트폴리오 회전율"
          icon={RotateCcw}
          score={`${data.turnoverRate.rate}%`}
          subtitle={turnover.label}
          color={turnover.color}
          detail={data.turnoverRate.rate > 50 ? '잦은 매매는 수수료와 세금으로 수익을 깎을 수 있습니다.' : '장기 보유는 복리 효과를 극대화합니다.'}
        />
        <ScoreCard
          title="자산 성장 속도"
          icon={Rocket}
          score={formatPercent(data.wealthVelocity.annualRate)}
          subtitle={`연간 ${formatCurrency(data.wealthVelocity.absoluteGrowth)} 증가`}
          color={data.wealthVelocity.annualRate > 0 ? '#ef4444' : '#3b82f6'}
        />
      </div>

      {/* Monthly activity heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 투자 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {data.monthlyActivity.map((m) => {
              const total = m.buyCount + m.sellCount;
              let intensity = 'bg-gray-100';
              if (total >= 5) intensity = 'bg-blue-500';
              else if (total >= 3) intensity = 'bg-blue-400';
              else if (total >= 1) intensity = 'bg-blue-200';

              return (
                <div
                  key={m.month}
                  className={`${intensity} rounded-md p-2 text-center cursor-default`}
                  title={`${m.month}: 매수 ${m.buyCount}건, 매도 ${m.sellCount}건, 순유입 ${formatCurrency(m.netInflow)}`}
                >
                  <p className="text-[10px] text-gray-500">{m.month.slice(5)}</p>
                  <p className="text-xs font-medium">{total}건</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 rounded" /> 0건</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 rounded" /> 1~2건</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded" /> 3~4건</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> 5건+</span>
          </div>
        </CardContent>
      </Card>

      {/* Net inflow trend */}
      {data.monthlyActivity.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">월별 순유입 추세</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="netInflow"
                  name="순유입액"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
