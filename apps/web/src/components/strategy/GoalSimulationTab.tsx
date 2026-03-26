import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { strategyApi, type InvestmentGoal, type GoalProjection } from '@/lib/api';
import { formatCurrency, toCommaString, fromCommaString } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Plus, Trash2, Target, TrendingUp, TrendingDown, Info, CheckCircle, AlertTriangle } from 'lucide-react';

export default function GoalSimulationTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['strategy', 'goals'],
    queryFn: strategyApi.getGoals,
  });

  const { data: projection, isLoading: projectionLoading } = useQuery({
    queryKey: ['strategy', 'goals', selectedGoalId, 'projection'],
    queryFn: () => strategyApi.getGoalProjection(selectedGoalId!),
    enabled: !!selectedGoalId,
  });

  const createGoalMutation = useMutation({
    mutationFn: strategyApi.createGoal,
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: ['strategy', 'goals'] });
      setDialogOpen(false);
      setSelectedGoalId(newGoal.id);
      setForm({ name: '', targetAmount: '', targetDate: '' });
      toast.success('목표가 생성되었습니다');
    },
    onError: () => toast.error('목표 생성에 실패했습니다'),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: strategyApi.deleteGoal,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['strategy', 'goals'] });
      if (selectedGoalId === deletedId) setSelectedGoalId(null);
      toast.success('목표가 삭제되었습니다');
    },
    onError: () => toast.error('목표 삭제에 실패했습니다'),
  });

  function handleSubmit() {
    const amount = Number(fromCommaString(form.targetAmount));
    if (!form.name || !amount || !form.targetDate) return;
    createGoalMutation.mutate({
      name: form.name,
      targetAmount: amount,
      targetDate: form.targetDate,
    });
  }

  const chartData = projection?.monthlyProjections.map((p) => ({
    date: p.date,
    예상자산: Math.round(p.value),
  }));

  return (
    <div className="space-y-6">
      {/* Goal List */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">투자 목표</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          목표 추가
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Target className="h-8 w-8 mb-2" />
            <p>설정된 투자 목표가 없습니다.</p>
            <p className="text-sm mt-1">목표를 추가하면 달성 가능성을 시뮬레이션합니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g: InvestmentGoal) => {
            const targetDate = new Date(g.targetDate);
            const daysLeft = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <Card
                key={g.id}
                className={`cursor-pointer transition-all ${selectedGoalId === g.id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}
                onClick={() => setSelectedGoalId(g.id)}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-lg font-bold text-blue-600 mt-1">
                        {formatCurrency(g.targetAmount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {targetDate.toLocaleDateString('ko-KR')} 까지
                        {daysLeft > 0 && <span className="ml-1 text-gray-400">({daysLeft}일 남음)</span>}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('이 목표를 삭제할까요?')) {
                          deleteGoalMutation.mutate(g.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Projection */}
      {selectedGoalId && (
        projectionLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            시뮬레이션 계산 중...
          </div>
        ) : projection ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">현재 자산</p>
                  <p className="text-lg font-bold">{formatCurrency(projection.currentValue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">목표 금액</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(projection.targetAmount)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">예상 도달 금액</p>
                  <p className={`text-lg font-bold ${projection.onTrack ? 'text-red-500' : 'text-blue-500'}`}>
                    {formatCurrency(projection.projectedFinalValue)}
                  </p>
                </CardContent>
              </Card>
              <Card className={projection.onTrack ? 'bg-green-50/50' : 'bg-amber-50/50'}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">달성 전망</p>
                  <div className="flex items-center gap-2 mt-1">
                    {projection.onTrack ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-bold text-green-700">달성 가능</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <span className="font-bold text-amber-700">
                          {formatCurrency(projection.shortfall)} 부족
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Info className="h-3.5 w-3.5" />
              과거 수익률(CAGR {projection.cagr.toFixed(1)}%) 기반 복리 추정치이며, 미래 수익을 보장하지 않습니다.
            </div>

            {/* Projection Chart */}
            <Card>
              <CardHeader>
                <CardTitle>자산 성장 예측</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
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
                      formatter={(value: number) => [formatCurrency(value), '예상 자산']}
                      labelFormatter={(label) => {
                        const [y, m] = label.split('-');
                        return `${y}년 ${m}월`;
                      }}
                    />
                    <ReferenceLine
                      y={projection.targetAmount}
                      stroke="#3b82f6"
                      strokeDasharray="8 4"
                      strokeWidth={2}
                      label={{
                        value: `목표: ${formatCurrency(projection.targetAmount)}`,
                        position: 'right',
                        fill: '#3b82f6',
                        fontSize: 11,
                      }}
                    />
                    <defs>
                      <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={projection.onTrack ? '#22c55e' : '#f59e0b'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={projection.onTrack ? '#22c55e' : '#f59e0b'} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="예상자산"
                      stroke={projection.onTrack ? '#22c55e' : '#f59e0b'}
                      strokeWidth={2}
                      fill="url(#projGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : null
      )}

      {/* Create Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>투자 목표 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>목표 이름</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 1억 모으기"
                className="mt-1"
              />
            </div>
            <div>
              <Label>목표 금액</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: toCommaString(e.target.value) })}
                placeholder="100,000,000"
                className="mt-1"
              />
            </div>
            <div>
              <Label>목표 날짜</Label>
              <Input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.targetAmount || !form.targetDate || createGoalMutation.isPending}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
