import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { strategyApi, type RebalanceResult, type StrategyTemplate, type StrategyProfile } from '@/lib/api';
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { Save, Trash2, ArrowDownCircle, ArrowUpCircle, Minus, Info } from 'lucide-react';

const ASSET_TYPES = [
  'KOREAN_STOCK', 'OVERSEAS_STOCK', 'REAL_ESTATE', 'DEPOSIT', 'GOLD', 'OTHER',
] as const;

const DEFAULT_ALLOCATIONS: Record<string, number> = {
  KOREAN_STOCK: 0, OVERSEAS_STOCK: 0, REAL_ESTATE: 0, DEPOSIT: 0, GOLD: 0, OTHER: 0,
};

export default function RebalancingTab() {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<Record<string, number>>({ ...DEFAULT_ALLOCATIONS });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [results, setResults] = useState<RebalanceResult[] | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['strategy', 'templates'],
    queryFn: strategyApi.getTemplates,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['strategy', 'profiles'],
    queryFn: strategyApi.getProfiles,
  });

  const rebalanceMutation = useMutation({
    mutationFn: strategyApi.rebalance,
    onSuccess: (data) => setResults(data),
    onError: () => toast.error('리밸런싱 분석에 실패했습니다'),
  });

  const saveProfileMutation = useMutation({
    mutationFn: strategyApi.createProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy', 'profiles'] });
      setSaveDialogOpen(false);
      setProfileName('');
      toast.success('전략이 저장되었습니다');
    },
    onError: () => toast.error('전략 저장에 실패했습니다'),
  });

  const deleteProfileMutation = useMutation({
    mutationFn: strategyApi.deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy', 'profiles'] });
      toast.success('전략이 삭제되었습니다');
    },
    onError: () => toast.error('전략 삭제에 실패했습니다'),
  });

  const total = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0),
    [allocations],
  );

  const isValid = Math.abs(total - 100) < 0.1;

  function applyTemplate(alloc: Record<string, number>) {
    setAllocations({ ...DEFAULT_ALLOCATIONS, ...alloc });
    setResults(null);
  }

  function handleCalculate() {
    if (!isValid) return;
    rebalanceMutation.mutate(allocations);
  }

  const chartData = results?.map((r) => ({
    name: ASSET_TYPE_LABELS[r.assetType] ?? r.assetType,
    현재: Number(r.currentPercent.toFixed(1)),
    목표: Number(r.targetPercent.toFixed(1)),
    color: ASSET_TYPE_COLORS[r.assetType] ?? '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-3">전략 템플릿</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {templates.map((t: StrategyTemplate) => (
            <Card
              key={t.id}
              className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
              onClick={() => applyTemplate(t.allocations)}
            >
              <CardContent className="pt-4 pb-3">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Saved Profiles */}
      {profiles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">저장된 프로필</h3>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p: StrategyProfile) => (
              <div key={p.id} className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(p.allocations as Record<string, number>)}
                >
                  {p.name}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (confirm('이 프로필을 삭제할까요?')) {
                      deleteProfileMutation.mutate(p.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocation Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>목표 배분 설정</CardTitle>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-500'}`}>
                합계: {total.toFixed(1)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                disabled={!isValid}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                저장
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ASSET_TYPES.map((type) => (
              <div key={type}>
                <Label className="text-xs text-gray-600">{ASSET_TYPE_LABELS[type]}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={allocations[type] || ''}
                    onChange={(e) => {
                      setAllocations({ ...allocations, [type]: Number(e.target.value) || 0 });
                      setResults(null);
                    }}
                    className="w-full"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-500 shrink-0">%</span>
                </div>
                <div
                  className="h-1.5 rounded-full mt-1.5 bg-gray-100"
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(allocations[type] || 0, 100)}%`,
                      backgroundColor: ASSET_TYPE_COLORS[type] ?? '#6b7280',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleCalculate}
              disabled={!isValid || rebalanceMutation.isPending}
              className="px-8"
            >
              {rebalanceMutation.isPending ? '계산 중...' : '리밸런싱 계산'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <>
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>현재 vs 목표 배분</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: number) => [`${value}%`]} />
                  <Legend />
                  <Bar dataKey="현재" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="목표" radius={[4, 4, 0, 0]}>
                    {chartData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Action Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>리밸런싱 추천</CardTitle>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Info className="h-3.5 w-3.5" />
                  현재 포트폴리오 총액 기준
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>자산 유형</TableHead>
                    <TableHead className="text-right">현재 금액</TableHead>
                    <TableHead className="text-right">현재 비중</TableHead>
                    <TableHead className="text-right">목표 금액</TableHead>
                    <TableHead className="text-right">목표 비중</TableHead>
                    <TableHead className="text-right">조정 금액</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.assetType} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {ASSET_TYPE_LABELS[r.assetType] ?? r.assetType}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(r.currentValue)}</TableCell>
                      <TableCell className="text-right">{r.currentPercent.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.targetValue)}</TableCell>
                      <TableCell className="text-right">{r.targetPercent.toFixed(1)}%</TableCell>
                      <TableCell className={`text-right font-medium ${
                        r.action === 'BUY' ? 'text-red-500' : r.action === 'SELL' ? 'text-blue-500' : 'text-gray-400'
                      }`}>
                        {r.action !== 'HOLD' && (r.diff > 0 ? '+' : '')}{formatCurrency(Math.abs(r.diff))}
                      </TableCell>
                      <TableCell>
                        {r.action === 'BUY' && (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            <ArrowDownCircle className="h-3 w-3 mr-1" />매수
                          </Badge>
                        )}
                        {r.action === 'SELL' && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            <ArrowUpCircle className="h-3 w-3 mr-1" />매도
                          </Badge>
                        )}
                        {r.action === 'HOLD' && (
                          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">
                            <Minus className="h-3 w-3 mr-1" />유지
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>배분 프로필 저장</DialogTitle>
          </DialogHeader>
          <div>
            <Label>프로필 이름</Label>
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="예: 나의 안정형 전략"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>취소</Button>
            <Button
              onClick={() => saveProfileMutation.mutate({ name: profileName, allocations })}
              disabled={!profileName.trim() || saveProfileMutation.isPending}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
