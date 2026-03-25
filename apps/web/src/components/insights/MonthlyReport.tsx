import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getReturnColor, formatPercent, ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Flame, Trophy } from 'lucide-react';

export default function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const { data: report, isLoading } = useQuery({
    queryKey: ['insights', 'monthly-report', monthStr],
    queryFn: () => insightsApi.getMonthlyReport(monthStr),
  });

  const goPrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>;
  }

  if (!report || report.dataQuality === 'insufficient') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>거래 데이터가 부족합니다.</p>
        <p className="text-sm">자산과 거래를 등록하면 월별 리포트를 확인할 수 있습니다.</p>
      </div>
    );
  }

  const isPositive = report.change >= 0;

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="sm" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-lg font-semibold text-gray-900">{year}년 {month}월</span>
        <Button variant="ghost" size="sm" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Milestones */}
      {report.milestones.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500" />
          <div>
            {report.milestones.map((m, i) => (
              <span key={i} className="text-amber-800 font-semibold">{m} </span>
            ))}
          </div>
        </div>
      )}

      {/* Net worth hero card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">이달의 순자산</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(report.netWorth)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">전월 대비 변화</p>
              <div className="flex items-center justify-center gap-2">
                {isPositive ? <TrendingUp className="h-5 w-5 text-red-500" /> : <TrendingDown className="h-5 w-5 text-blue-500" />}
                <span className={`text-2xl font-bold ${getReturnColor(report.change)}`}>
                  {report.change >= 0 ? '+' : ''}{formatCurrency(report.change)}
                </span>
              </div>
              <p className={`text-sm ${getReturnColor(report.changePercent)}`}>
                {formatPercent(report.changePercent)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">연속 성장</p>
              <div className="flex items-center justify-center gap-2">
                {report.growthStreak > 0 && <Flame className="h-5 w-5 text-orange-500" />}
                <span className="text-2xl font-bold text-gray-900">
                  {report.growthStreak > 0 ? `${report.growthStreak}개월` : '-'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net inflow */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-gray-500 mb-1">이달 순유입액</p>
          <p className={`text-xl font-bold ${getReturnColor(report.netInflow)}`}>
            {report.netInflow >= 0 ? '+' : ''}{formatCurrency(report.netInflow)}
          </p>
          <p className="text-xs text-gray-400 mt-1">매수 총액 - 매도 총액</p>
        </CardContent>
      </Card>

      {/* Best & Worst */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              최고 수익 자산
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.bestPerformers.length === 0 ? (
              <p className="text-sm text-gray-400">수익 자산 없음</p>
            ) : (
              report.bestPerformers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_TYPE_COLORS[p.type] }} />
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                    {formatPercent(p.returnRate)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-blue-500" />
              최저 수익 자산
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.worstPerformers.length === 0 ? (
              <p className="text-sm text-gray-400">손실 자산 없음</p>
            ) : (
              report.worstPerformers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_TYPE_COLORS[p.type] }} />
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                    {formatPercent(p.returnRate)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 12-month sparkline */}
      {report.monthlyHistory.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">자산 추이 (최근 12개월)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={report.monthlyHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  name="순자산"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
