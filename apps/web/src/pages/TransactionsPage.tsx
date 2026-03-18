import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, assetsApi, type Transaction } from '@/lib/api';
import { formatCurrency, formatDate, ASSET_TYPE_LABELS, ASSET_TYPE_FIELD_CONFIG, toCommaString, fromCommaString } from '@/lib/utils';
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
import { Plus, Trash2, Hash, ArrowDownCircle, ArrowUpCircle, Receipt } from 'lucide-react';

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterAssetId, setFilterAssetId] = useState<string>('all');

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    assetId: '',
    type: 'BUY' as 'BUY' | 'SELL',
    quantity: '',
    price: '',
    fee: '0',
    date: today,
    memo: '',
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', filterAssetId],
    queryFn: () =>
      transactionsApi.getAll(filterAssetId !== 'all' ? filterAssetId : undefined),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: assetsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setDialogOpen(false);
      setForm({
        assetId: '',
        type: 'BUY',
        quantity: '',
        price: '',
        fee: '0',
        date: today,
        memo: '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  const selectedAsset = assets.find((a) => a.id === form.assetId);
  const formConfig = ASSET_TYPE_FIELD_CONFIG[selectedAsset?.type ?? ''];

  function handleSubmit() {
    if (!form.assetId || !form.price) return;
    if (!formConfig?.hideQuantity && !form.quantity) return;
    createMutation.mutate({
      assetId: form.assetId,
      type: form.type,
      quantity: formConfig?.hideQuantity ? 1 : Number(fromCommaString(form.quantity)),
      price: Number(fromCommaString(form.price)),
      fee: Number(fromCommaString(form.fee)),
      date: form.date,
      memo: form.memo || undefined,
    });
  }

  const stats = useMemo(() => {
    let buyTotal = 0, sellTotal = 0, feeTotal = 0;
    for (const tx of transactions) {
      const amount = tx.quantity * tx.price;
      if (tx.type === 'BUY') buyTotal += amount;
      else sellTotal += amount;
      feeTotal += tx.fee;
    }
    return { count: transactions.length, buyTotal, sellTotal, feeTotal };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">거래 내역</h2>
          <p className="text-gray-500 mt-1">매수/매도 기록을 관리하세요</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          거래 추가
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Hash className="h-4 w-4 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">총 거래 건수</p>
                <p className="text-xl font-bold">{stats.count}건</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">총 매수액</p>
                <p className="text-xl font-bold text-red-500 truncate">{formatCurrency(stats.buyTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <ArrowUpCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">총 매도액</p>
                <p className="text-xl font-bold text-blue-500 truncate">{formatCurrency(stats.sellTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">총 수수료</p>
                <p className="text-xl font-bold truncate">{formatCurrency(stats.feeTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="whitespace-nowrap">자산 필터:</Label>
        <Select value={filterAssetId} onValueChange={setFilterAssetId}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {assets.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>자산</TableHead>
              <TableHead>유형</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">단가</TableHead>
              <TableHead className="text-right">수수료</TableHead>
              <TableHead className="text-right">거래금액</TableHead>
              <TableHead>메모</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-400 py-12">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-400 py-12">
                  거래 내역이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const txConfig = ASSET_TYPE_FIELD_CONFIG[tx.asset?.type ?? ''];
                return (
                <TableRow key={tx.id} className="hover:bg-gray-50">
                  <TableCell className="whitespace-nowrap text-gray-600">
                    {formatDate(tx.date)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tx.asset?.name ?? '-'}</div>
                      <div className="text-xs text-gray-400">
                        {tx.asset ? (ASSET_TYPE_LABELS[tx.asset.type] ?? tx.asset.type) : ''}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={tx.type === 'BUY' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}
                    >
                      {txConfig?.transactionLabels[tx.type] ?? (tx.type === 'BUY' ? '매수' : '매도')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {txConfig?.hideQuantity ? '-' : tx.quantity.toLocaleString('ko-KR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tx.price, tx.asset?.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tx.fee, tx.asset?.currency)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === 'BUY' ? 'text-red-500' : 'text-blue-500'}`}>
                    {tx.type === 'SELL' ? '+' : '-'}{formatCurrency(tx.quantity * tx.price, tx.asset?.currency)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{tx.memo ?? '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('이 거래 내역을 삭제할까요?')) {
                          deleteMutation.mutate(tx.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>거래 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>자산</Label>
              <Select value={form.assetId} onValueChange={(v) => setForm({ ...form, assetId: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="자산 선택" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({ASSET_TYPE_LABELS[a.type] ?? a.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>거래 유형</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: 'BUY' | 'SELL') => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">{formConfig?.transactionLabels.BUY ?? '매수'}</SelectItem>
                    <SelectItem value="SELL">{formConfig?.transactionLabels.SELL ?? '매도'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>거래일</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            {formConfig?.hideQuantity ? (
              <div>
                <Label>{formConfig?.avgCostPriceLabel ?? '금액'}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: toCommaString(e.target.value) })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{formConfig?.quantityLabel ?? '수량'}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: toCommaString(e.target.value) })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{formConfig?.avgCostPriceLabel ?? '단가'}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: toCommaString(e.target.value) })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <div>
              <Label>수수료</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: toCommaString(e.target.value) })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>메모 (선택)</Label>
              <Input
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                placeholder="메모를 입력하세요"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.assetId || (!formConfig?.hideQuantity && !form.quantity) || !form.price || createMutation.isPending}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
