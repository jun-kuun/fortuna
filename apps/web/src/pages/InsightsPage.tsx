import { useQuery } from '@tanstack/react-query';
import { insightsApi, type HealthCheckResult } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { HeartPulse, FileBarChart, Clock, Activity } from 'lucide-react';
import { Shield, PieChart, RefreshCw, Banknote } from 'lucide-react';
import HealthScoreGauge from '@/components/insights/HealthScoreGauge';
import ScoreCard from '@/components/insights/ScoreCard';
import RecommendationList from '@/components/insights/RecommendationList';
import MonthlyReport from '@/components/insights/MonthlyReport';
import TimingInsights from '@/components/insights/TimingInsights';
import HabitsTracker from '@/components/insights/HabitsTracker';
import { formatCurrency } from '@/lib/utils';

const riskLevelLabels: Record<string, string> = {
  conservative: '보수적',
  balanced: '균형잡힌',
  aggressive: '공격적',
  unknown: '분석 불가',
};

const urgencyLabels: Record<string, { text: string; color: string }> = {
  LOW: { text: '양호', color: '#22c55e' },
  MEDIUM: { text: '보통', color: '#eab308' },
  HIGH: { text: '긴급', color: '#ef4444' },
  NONE: { text: '-', color: '#6b7280' },
};

const cashDragLabels: Record<string, { text: string; color: string }> = {
  healthy: { text: '적정', color: '#22c55e' },
  moderate: { text: '다소 높음', color: '#eab308' },
  severe: { text: '과다', color: '#ef4444' },
  low_liquidity: { text: '부족', color: '#f97316' },
  unknown: { text: '-', color: '#6b7280' },
};

export default function InsightsPage() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['insights', 'health-check'],
    queryFn: insightsApi.getHealthCheck,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">자산 진단</h1>
        <p className="text-gray-500 mt-1">포트폴리오를 분석하고 자산을 불리기 위한 인사이트를 제공합니다</p>
      </div>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="health" className="flex items-center gap-1.5">
            <HeartPulse className="h-4 w-4" />
            건강 진단
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-1.5">
            <FileBarChart className="h-4 w-4" />
            월별 리포트
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            타이밍 분석
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            재무 습관
          </TabsTrigger>
        </TabsList>

        {/* Health Check Tab */}
        <TabsContent value="health" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">분석 중...</div>
          ) : health ? (
            <>
              {/* Overall Score */}
              <Card>
                <CardContent className="p-8 flex flex-col items-center">
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">포트폴리오 종합 점수</h2>
                  <div className="relative">
                    <HealthScoreGauge score={health.overallScore} grade={health.overallGrade} />
                  </div>
                  {health.dataQuality === 'insufficient' && (
                    <p className="text-sm text-gray-400 mt-4">자산을 등록하면 정확한 진단이 가능합니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* Sub-scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ScoreCard
                  title="분산투자"
                  icon={PieChart}
                  score={`${health.diversification.score}점`}
                  subtitle={`${health.diversification.assetTypeCount}개 유형, ${health.diversification.assetCount}개 자산`}
                  color="#3b82f6"
                  detail={`HHI ${health.diversification.hhi.toLocaleString()} (낮을수록 좋음)`}
                />
                <ScoreCard
                  title="리스크 수준"
                  icon={Shield}
                  score={`${health.riskAssessment.score}/7`}
                  subtitle={riskLevelLabels[health.riskAssessment.level] ?? health.riskAssessment.level}
                  color={health.riskAssessment.level === 'aggressive' ? '#ef4444' : health.riskAssessment.level === 'balanced' ? '#eab308' : '#22c55e'}
                />
                <ScoreCard
                  title="리밸런싱 긴급도"
                  icon={RefreshCw}
                  score={urgencyLabels[health.rebalancingUrgency.level]?.text ?? '-'}
                  subtitle={`편차 ${health.rebalancingUrgency.totalDeviation}%`}
                  color={urgencyLabels[health.rebalancingUrgency.level]?.color ?? '#6b7280'}
                  detail={health.rebalancingUrgency.hasProfile ? `기준: ${health.rebalancingUrgency.profileName}` : '저장된 전략 프로필 없음 (60/40 기준)'}
                />
                <ScoreCard
                  title="현금 비중"
                  icon={Banknote}
                  score={`${health.cashDrag.depositPercent}%`}
                  subtitle={cashDragLabels[health.cashDrag.level]?.text ?? '-'}
                  color={cashDragLabels[health.cashDrag.level]?.color ?? '#6b7280'}
                  detail={health.cashDrag.opportunityCost > 0 ? `기회비용: 연 ${formatCurrency(health.cashDrag.opportunityCost)}` : undefined}
                />
              </div>

              {/* Opportunity cost detail */}
              {health.cashDrag.opportunityCost > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-medium text-gray-700 mb-3">예적금 초과 보유 기회비용</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-500">1년</p>
                        <p className="text-lg font-bold text-red-500">{formatCurrency(health.cashDrag.opportunityCost)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">5년</p>
                        <p className="text-lg font-bold text-red-500">{formatCurrency(health.cashDrag.opportunityCost5yr)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">10년</p>
                        <p className="text-lg font-bold text-red-500">{formatCurrency(health.cashDrag.opportunityCost10yr)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      * 예적금 적정 비중 15% 초과분이 연 8% 수익률(주식 평균) 대신 3.5%(예적금)로 운용되는 경우의 차이
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              <RecommendationList recommendations={health.recommendations} />
            </>
          ) : null}
        </TabsContent>

        {/* Monthly Report Tab */}
        <TabsContent value="monthly">
          <MonthlyReport />
        </TabsContent>

        {/* Timing Insights Tab */}
        <TabsContent value="timing">
          <TimingInsights />
        </TabsContent>

        {/* Habits Tracker Tab */}
        <TabsContent value="habits">
          <HabitsTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}
