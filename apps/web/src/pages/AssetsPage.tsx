import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, type Asset } from '@/lib/api';
import { formatCurrency, formatPercent, getReturnColor, ASSET_TYPE_LABELS, toCommaString, fromCommaString } from '@/lib/utils';
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
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';

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
      updateHoldingMutation.mutate({
        id: selectedAsset.id,
        data: {
          quantity: Number(fromCommaString(holdingForm.quantity)),
          avgCostPrice: Number(fromCommaString(holdingForm.avgCostPrice)),
          currentPrice: Number(fromCommaString(holdingForm.currentPrice)),
        },
      });
    }
  }

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
              <TableHead className="text-right">수익률</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-400 py-12">
                  자산을 추가해 보세요
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => {
                const holding = asset.holding;
                const currentValue = (holding?.quantity ?? 0) * (holding?.currentPrice ?? 0);
                const totalCost = (holding?.quantity ?? 0) * (holding?.avgCostPrice ?? 0);
                const returnAmount = currentValue - totalCost;
                const returnRate = totalCost > 0 ? (returnAmount / totalCost) * 100 : 0;

                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ASSET_TYPE_LABELS[asset.type] ?? asset.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{asset.currency}</TableCell>
                    <TableCell className="text-right">
                      {holding?.quantity?.toLocaleString('ko-KR') ?? 0}
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
                    <TableCell className={`text-right font-medium ${getReturnColor(returnRate)}`}>
                      {formatPercent(returnRate)}
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
          <div className="space-y-4">
            <div>
              <Label>보유 수량</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={holdingForm.quantity}
                onChange={(e) => setHoldingForm({ ...holdingForm, quantity: toCommaString(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>평균 매수 단가</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={holdingForm.avgCostPrice}
                onChange={(e) => setHoldingForm({ ...holdingForm, avgCostPrice: toCommaString(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>현재가</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={holdingForm.currentPrice}
                onChange={(e) => setHoldingForm({ ...holdingForm, currentPrice: toCommaString(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
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
