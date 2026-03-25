import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/lib/utils';
import { Clock, TrendingDown, Repeat, AlertTriangle } from 'lucide-react';

const verdictConfig = {
  good: { label: '양호', className: 'bg-emerald-100 text-emerald-700' },
  caution: { label: '주의', className: 'bg-amber-100 text-amber-700' },
  bad: { label: '위험', className: 'bg-red-100 text-red-700' },
};

const statusLabels = { short: '단기 (<3개월)', medium: '중기 (3~12개월)', long: '장기 (1년+)' };

export default function TimingInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ['insights', 'timing-analysis'],
    queryFn: insightsApi.getTimingAnalysis,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">분석 중...</div>;
  }

  if (!data || data.dataQuality === 'insufficient') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>거래 데이터가 부족합니다.</p>
        <p className="text-sm">거래 내역을 등록하면 타이밍 분석을 확인할 수 있습니다.</p>
      </div>
    );
  }

  const holdingChartData = data.holdingPeriods.map((h) => ({
    name: h.name,
    days: h.avgDays,
    fill: ASSET_TYPE_COLORS[h.type] ?? '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* Holding periods */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            자산별 평균 보유 기간
          </CardTitle>
        </CardHeader>
        <CardContent>
          {holdingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, holdingChartData.length * 40)}>
              <BarChart data={holdingChartData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: '일', position: 'insideBottomRight', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
                <Tooltip formatter={(value: number) => `${value}일`} />
                <Bar dataKey="days" name="보유 기간">
                  {holdingChartData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          )}
          {data.holdingPeriods.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {data.holdingPeriods.map((h) => (
                <Badge key={h.assetId} variant="outline" className="text-xs">
                  {h.name}: {statusLabels[h.status]}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Buy high / sell low */}
      {data.buyHighSellLow.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              매수/매도 습관 분석
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              매수 점수가 높을수록 비싸게 매수, 매도 점수가 낮을수록 싸게 매도하는 경향입니다.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>자산</TableHead>
                  <TableHead className="text-center">매수 점수</TableHead>
                  <TableHead className="text-center">매도 점수</TableHead>
                  <TableHead className="text-center">판정</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.buyHighSellLow.map((item) => {
                  const config = verdictConfig[item.verdict];
                  return (
                    <TableRow key={item.assetId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">
                        <span className={item.buyScore > 0.6 ? 'text-red-500 font-semibold' : ''}>
                          {(item.buyScore * 100).toFixed(0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={item.sellScore < 0.4 ? 'text-blue-500 font-semibold' : ''}>
                          {(item.sellScore * 100).toFixed(0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={config.className}>{config.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DCA Analysis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4 text-emerald-500" />
            적립식 투자(DCA) 규칙성
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{data.dcaAnalysis.overallScore}</p>
              <p className="text-xs text-gray-500">종합 점수</p>
            </div>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${data.dcaAnalysis.overallScore}%`,
                  backgroundColor: data.dcaAnalysis.overallScore >= 70 ? '#22c55e' : data.dcaAnalysis.overallScore >= 40 ? '#eab308' : '#ef4444',
                }}
              />
            </div>
          </div>
          {data.dcaAnalysis.perAsset.length > 0 && (
            <div className="space-y-2">
              {data.dcaAnalysis.perAsset.map((a) => (
                <div key={a.assetId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{a.name}</span>
                  <div className="flex items-center gap-3 text-gray-500">
                    <span>규칙성 {a.regularity}점</span>
                    <span>평균 {a.avgIntervalDays}일 간격</span>
                    <span>{a.buyCount}회 매수</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emotional Trading */}
      {data.emotionalTrading.flags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              감정적 매매 감지
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.emotionalTrading.flags.map((flag, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                <Badge className={flag.type === 'panic_sell' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                  {flag.type === 'panic_sell' ? '패닉셀' : 'FOMO 매수'}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{flag.description}</p>
                  <p className="text-xs text-gray-400">{flag.period}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
