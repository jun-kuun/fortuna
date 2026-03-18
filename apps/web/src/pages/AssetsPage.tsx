import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, type Asset } from '@/lib/api';
import { formatCurrency, formatPercent, getReturnColor, getReturnBgColor, ASSET_TYPE_LABELS, ASSET_TYPE_BG_COLORS, ASSET_TYPE_FIELD_CONFIG, toCommaString, fromCommaString } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, RefreshCw, Briefcase, Banknote, PiggyBank, TrendingUp, TrendingDown, FolderOpen } from 'lucide-react';

const ASSET_TYPES = ['KOREAN_STOCK', 'OVERSEAS_STOCK', 'REAL_ESTATE', 'DEPOSIT', 'GOLD', 'OTHER'];
const CURRENCIES = ['KRW', 'USD'];

type DialogMode = 'create' | 'edit' | 'updatePrice' | null;

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [form, setForm] = useState({ name: '', type: 'KOREAN_STOCK', currency: 'KRW' });
  const [holdingForm, setHoldingForm] = useState({
    quantity: '',
    avgCostPrice: '',
    currentPrice: '',
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: assetsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: assetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setDialogMode(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setDialogMode(null);
    },
  });

  const updateHoldingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.updateHolding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setDialogMode(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: assetsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  function openCreate() {
    setForm({ name: '', type: 'KOREAN_STOCK', currency: 'KRW' });
    setDialogMode('create');
  }

  function openEdit(asset: Asset) {
    setSelectedAsset(asset);
    setForm({ name: asset.name, type: asset.type, currency: asset.currency });
    setDialogMode('edit');
  }

  function openUpdatePrice(asset: Asset) {
    setSelectedAsset(asset);
    setHoldingForm({
      quantity: toCommaString(String(asset.holding?.quantity ?? 0)),
      avgCostPrice: toCommaString(String(asset.holding?.avgCostPrice ?? 0)),
      currentPrice: toCommaString(String(asset.holding?.currentPrice ?? 0)),
    });
    setDialogMode('updatePrice');
  }

  function handleSubmit() {
    if (dialogMode === 'create') {
      createMutation.mutate(form);
    } else if (dialogMode === 'edit' && selectedAsset) {
      updateMutation.mutate({ id: selectedAsset.id, data: form });
    } else if (dialogMode === 'updatePrice' && selectedAsset) {
      const fieldConfig = ASSET_TYPE_FIELD_CONFIG[selectedAsset.type];
      updateHoldingMutation.mutate({
        id: selectedAsset.id,
        data: {
          quantity: fieldConfig?.hideQuantity ? 1 : Number(fromCommaString(holdingForm.quantity)),
          avgCostPrice: Number(fromCommaString(holdingForm.avgCostPrice)),
          currentPrice: Number(fromCommaString(holdingForm.currentPrice)),
        },
      });
    }
  }

  const assetsSummary = assets.reduce(
    (acc, a) => {
      const qty = a.holding?.quantity ?? 0;
      const cv = qty * (a.holding?.currentPrice ?? 0);
      const tc = qty * (a.holding?.avgCostPrice ?? 0);
      return { totalValue: acc.totalValue + cv, totalCost: acc.totalCost + tc };
    },
    { totalValue: 0, totalCost: 0 },
  );
  const totalPnl = assetsSummary.totalValue - assetsSummary.totalCost;

  if (isLoading) {
    return <div className="text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">자산 관리</h2>
          <p className="text-gray-500 mt-1">보유 자산을 관리하세요</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          자산 추가
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">총 자산 수</p>
                <p className="text-xl font-bold">{assets.length}개</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Banknote className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">총 평가액</p>
                <p className="text-xl font-bold truncate">{formatCurrency(assetsSummary.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <PiggyBank className="h-4 w-4 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">총 투자 원금</p>
                <p className="text-xl font-bold truncate">{formatCurrency(assetsSummary.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${totalPnl >= 0 ? 'bg-red-100' : 'bg-blue-100'}`}>
                {totalPnl >= 0
                  ? <TrendingUp className="h-4 w-4 text-red-600" />
                  : <TrendingDown className="h-4 w-4 text-blue-600" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">총 손익</p>
                <p className={`text-xl font-bold truncate ${getReturnColor(totalPnl)}`}>{formatCurrency(totalPnl)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>자산명</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>통화</TableHead>
              <TableHead className="text-right">보유 수량</TableHead>
              <TableHead className="text-right">평균 단가</TableHead>
              <TableHead className="text-right">현재가</TableHead>
              <TableHead className="text-right">평가액</TableHead>
              <TableHead className="text-right">손익</TableHead>
              <TableHead className="text-right">수익률</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <FolderOpen className="h-10 w-10 text-gray-300" />
                    <p className="text-gray-400">아직 등록된 자산이 없습니다</p>
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="h-4 w-4 mr-1" />
                      자산 추가
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => {
                const holding = asset.holding;
                const config = ASSET_TYPE_FIELD_CONFIG[asset.type];
                const currentValue = (holding?.quantity ?? 0) * (holding?.currentPrice ?? 0);
                const totalCost = (holding?.quantity ?? 0) * (holding?.avgCostPrice ?? 0);
                const returnAmount = currentValue - totalCost;
                const returnRate = totalCost > 0 ? (returnAmount / totalCost) * 100 : 0;

                return (
                  <TableRow key={asset.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ASSET_TYPE_BG_COLORS[asset.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ASSET_TYPE_LABELS[asset.type] ?? asset.type}
                      </span>
                    </TableCell>
                    <TableCell>{asset.currency}</TableCell>
                    <TableCell className="text-right">
                      {config?.hideQuantity ? '-' : (holding?.quantity?.toLocaleString('ko-KR') ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding?.avgCostPrice ?? 0, asset.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding?.currentPrice ?? 0, asset.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(currentValue, asset.currency)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getReturnColor(returnAmount)}`}>
                      {returnAmount >= 0 ? '+' : ''}{formatCurrency(returnAmount, asset.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getReturnBgColor(returnRate)}`}>
                        {formatPercent(returnRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openUpdatePrice(asset)}
                          title="현재가 업데이트"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(asset)}
                          title="편집"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`"${asset.name}" 자산을 삭제할까요?`)) {
                              deleteMutation.mutate(asset.id);
                            }
                          }}
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode === 'create' || dialogMode === 'edit'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? '자산 추가' : '자산 편집'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>자산명</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 삼성전자"
                className="mt-1"
              />
            </div>
            <div>
              <Label>자산 유형</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ASSET_TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>통화</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>취소</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
            >
              {dialogMode === 'create' ? '추가' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Price/Holding Dialog */}
      <Dialog open={dialogMode === 'updatePrice'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>보유 현황 업데이트 - {selectedAsset?.name}</DialogTitle>
          </DialogHeader>
          {(() => {
            const fieldConfig = ASSET_TYPE_FIELD_CONFIG[selectedAsset?.type ?? ''];
            return (
              <div className="space-y-4">
                {!fieldConfig?.hideQuantity && (
                  <div>
                    <Label>{fieldConfig?.quantityLabel ?? '보유 수량'}</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={holdingForm.quantity}
                      onChange={(e) => setHoldingForm({ ...holdingForm, quantity: toCommaString(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label>{fieldConfig?.avgCostPriceLabel ?? '평균 매수 단가'}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={holdingForm.avgCostPrice}
                    onChange={(e) => setHoldingForm({ ...holdingForm, avgCostPrice: toCommaString(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{fieldConfig?.currentPriceLabel ?? '현재가'}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={holdingForm.currentPrice}
                    onChange={(e) => setHoldingForm({ ...holdingForm, currentPrice: toCommaString(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>취소</Button>
            <Button onClick={handleSubmit} disabled={updateHoldingMutation.isPending}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
