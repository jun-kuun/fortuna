import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { assetsApi, priceApi, transactionsApi, type Asset, type PriceHistoryItem } from '@/lib/api';
import { calcReturn, formatCurrency, formatPercent, getReturnColor, getReturnBgColor, ASSET_TYPE_LABELS, ASSET_TYPE_BG_COLORS, ASSET_TYPE_FIELD_CONFIG, REAL_ESTATE_SUB_TYPES, REAL_ESTATE_SUB_TYPE_MAP, DEPOSIT_SUB_TYPES, DEPOSIT_SUB_TYPE_MAP, toCommaString, fromCommaString } from '@/lib/utils';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Pencil, Trash2, RefreshCw, Briefcase, Banknote, PiggyBank, TrendingUp, TrendingDown, FolderOpen, Download, BarChart3 } from 'lucide-react';

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

const ASSET_TYPES = ['KOREAN_STOCK', 'OVERSEAS_STOCK', 'REAL_ESTATE', 'DEPOSIT', 'GOLD', 'OTHER'];
const CURRENCIES = ['KRW', 'USD'];

type DialogMode = 'create' | 'edit' | 'updatePrice' | 'trade' | 'chart' | null;
type TabValue = 'stock' | 'gold' | 'deposit' | 'realestate';

const TAB_DEFAULT_TYPE: Record<TabValue, string> = {
  stock: 'KOREAN_STOCK',
  gold: 'GOLD',
  deposit: 'DEPOSIT',
  realestate: 'REAL_ESTATE',
};

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabValue>('stock');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [chartDays, setChartDays] = useState(30);
  const [chartData, setChartData] = useState<PriceHistoryItem[]>([]);

  const [form, setForm] = useState({ name: '', type: 'KOREAN_STOCK', currency: 'KRW', ticker: '', stockMarket: 'KOREAN_STOCK' as string, subType: 'JEONSE', interestRate: '', maturityDate: '' });
  const [holdingForm, setHoldingForm] = useState({
    quantity: '',
    avgCostPrice: '',
    currentPrice: '',
  });
  const [tradeForm, setTradeForm] = useState({
    type: 'BUY' as 'BUY' | 'SELL',
    quantity: '',
    price: '',
    fee: '',
    date: new Date().toISOString().slice(0, 10),
    memo: '',
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
      toast.success('자산이 추가되었습니다');
    },
    onError: () => toast.error('자산 추가에 실패했습니다'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setDialogMode(null);
      toast.success('자산이 수정되었습니다');
    },
    onError: () => toast.error('자산 수정에 실패했습니다'),
  });

  const updateHoldingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.updateHolding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setDialogMode(null);
      toast.success('보유 현황이 업데이트되었습니다');
    },
    onError: () => toast.error('보유 현황 업데이트에 실패했습니다'),
  });

  const deleteMutation = useMutation({
    mutationFn: assetsApi.delete,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>자산이 삭제되었습니다</span>
          <button
            className="text-blue-600 font-medium hover:underline text-sm whitespace-nowrap"
            onClick={() => {
              assetsApi.restore(deletedId).then(() => {
                queryClient.invalidateQueries({ queryKey: ['assets'] });
                queryClient.invalidateQueries({ queryKey: ['portfolio'] });
                toast.dismiss(t.id);
                toast.success('자산이 복원되었습니다');
              });
            }}
          >
            되돌리기
          </button>
        </div>
      ), { duration: 5000 });
    },
    onError: () => toast.error('자산 삭제에 실패했습니다'),
  });

  const createTransactionMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogMode(null);
      toast.success('거래가 등록되었습니다');
    },
    onError: () => toast.error('거래 등록에 실패했습니다'),
  });

  const [priceUpdateResult, setPriceUpdateResult] = useState<string | null>(null);

  const updateAllPricesMutation = useMutation({
    mutationFn: priceApi.updateAll,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setPriceUpdateResult(`${data.updatedCount}개 업데이트 완료${data.failedCount > 0 ? `, ${data.failedCount}개 실패` : ''}`);
      setTimeout(() => setPriceUpdateResult(null), 4000);
    },
    onError: () => toast.error('시세 업데이트에 실패했습니다'),
  });

  function openCreate() {
    const defaultType = TAB_DEFAULT_TYPE[activeTab];
    const defaultCurrency = defaultType === 'OVERSEAS_STOCK' ? 'USD' : 'KRW';
    const defaultSubType = activeTab === 'deposit' ? 'SAVINGS' : activeTab === 'realestate' ? 'JEONSE' : '';
    setForm({ name: '', type: defaultType, currency: defaultCurrency, ticker: '', stockMarket: 'KOREAN_STOCK', subType: defaultSubType, interestRate: '', maturityDate: '' });
    setDialogMode('create');
  }

  function openEdit(asset: Asset) {
    setSelectedAsset(asset);
    setForm({ name: asset.name, type: asset.type, currency: asset.currency, ticker: asset.ticker ?? '', stockMarket: asset.type === 'OVERSEAS_STOCK' ? 'OVERSEAS_STOCK' : 'KOREAN_STOCK', subType: asset.subType ?? 'JEONSE', interestRate: asset.interestRate != null ? String(asset.interestRate) : '', maturityDate: asset.maturityDate ? asset.maturityDate.slice(0, 10) : '' });
    setDialogMode('edit');
  }

  async function openChart(asset: Asset, days = 30) {
    setSelectedAsset(asset);
    setChartDays(days);
    setDialogMode('chart');
    try {
      const data = await priceApi.getHistory(asset.id, days);
      setChartData(data);
    } catch {
      setChartData([]);
    }
  }

  function openTrade(asset: Asset, type: 'BUY' | 'SELL') {
    setSelectedAsset(asset);
    const isHideQty = ASSET_TYPE_FIELD_CONFIG[asset.type]?.hideQuantity
      || (asset.type === 'REAL_ESTATE' && REAL_ESTATE_SUB_TYPE_MAP[asset.subType ?? '']?.hideQuantity);
    setTradeForm({
      type,
      quantity: '',
      price: isHideQty ? '' : toCommaString(String(asset.holding?.currentPrice ?? 0)),
      fee: '',
      date: new Date().toISOString().slice(0, 10),
      memo: '',
    });
    setDialogMode('trade');
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
      const type = activeTab === 'stock' ? form.stockMarket : form.type;
      const currency = type === 'OVERSEAS_STOCK' ? 'USD' : 'KRW';
      const ticker = type === 'GOLD' ? 'GC=F' : (form.ticker || undefined);
      const subType = (type === 'REAL_ESTATE' || type === 'DEPOSIT') ? form.subType : undefined;
      const interestRate = type === 'DEPOSIT' && form.interestRate ? Number(form.interestRate) : undefined;
      const maturityDate = type === 'DEPOSIT' && form.maturityDate ? form.maturityDate : undefined;
      createMutation.mutate({ name: form.name, type, currency, ticker, subType, interestRate, maturityDate });
    } else if (dialogMode === 'edit' && selectedAsset) {
      const type = (selectedAsset.type === 'KOREAN_STOCK' || selectedAsset.type === 'OVERSEAS_STOCK') ? form.stockMarket : form.type;
      const currency = type === 'OVERSEAS_STOCK' ? 'USD' : 'KRW';
      const ticker = type === 'GOLD' ? 'GC=F' : (form.ticker || undefined);
      const subType = (type === 'REAL_ESTATE' || type === 'DEPOSIT') ? form.subType : undefined;
      const interestRate = type === 'DEPOSIT' && form.interestRate ? Number(form.interestRate) : undefined;
      const maturityDate = type === 'DEPOSIT' && form.maturityDate ? form.maturityDate : undefined;
      updateMutation.mutate({ id: selectedAsset.id, data: { name: form.name, type, currency, ticker, subType, interestRate, maturityDate } });
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

  const stockAssets = assets.filter((a) => a.type === 'KOREAN_STOCK' || a.type === 'OVERSEAS_STOCK');
  const goldAssets = assets.filter((a) => a.type === 'GOLD');
  const depositAssets = assets.filter((a) => a.type === 'DEPOSIT');
  const realEstateAssets = assets.filter((a) => a.type === 'REAL_ESTATE');

  function calcGroupSummary(group: Asset[]) {
    let totalValue = 0, totalCost = 0;
    for (const a of group) {
      const qty = a.holding?.quantity ?? 0;
      totalValue += qty * (a.holding?.currentPrice ?? 0);
      totalCost += qty * (a.holding?.avgCostPrice ?? 0);
    }
    const { returnAmount: totalReturn, returnRate: totalReturnRate } = calcReturn(totalCost, totalValue);
    return { totalValue, totalCost, totalReturn, totalReturnRate };
  }

  const stockSummary = calcGroupSummary(stockAssets);
  const goldSummary = calcGroupSummary(goldAssets);
  const depositSummary = calcGroupSummary(depositAssets);
  const realEstateSummary = calcGroupSummary(realEstateAssets);

  const assetsSummary = {
    totalValue: stockSummary.totalValue + goldSummary.totalValue + depositSummary.totalValue + realEstateSummary.totalValue,
    totalCost: stockSummary.totalCost + goldSummary.totalCost + depositSummary.totalCost + realEstateSummary.totalCost,
  };
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
        <div className="flex items-center gap-2">
          {priceUpdateResult && (
            <span className="text-sm text-green-600 font-medium">{priceUpdateResult}</span>
          )}
          <Button
            variant="outline"
            onClick={() => updateAllPricesMutation.mutate()}
            disabled={updateAllPricesMutation.isPending}
          >
            <Download className={`h-4 w-4 mr-2 ${updateAllPricesMutation.isPending ? 'animate-pulse' : ''}`} />
            {updateAllPricesMutation.isPending ? '업데이트 중...' : '시세 업데이트'}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            자산 추가
          </Button>
        </div>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">주식 ({stockAssets.length})</TabsTrigger>
          <TabsTrigger value="gold">금 ({goldAssets.length})</TabsTrigger>
          <TabsTrigger value="deposit">예적금 ({depositAssets.length})</TabsTrigger>
          <TabsTrigger value="realestate">부동산 ({realEstateAssets.length})</TabsTrigger>
        </TabsList>

        {/* 주식 탭 */}
        <TabsContent value="stock">
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>종목명</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead className="text-right">보유 수량</TableHead>
                  <TableHead className="text-right">평균 매수가</TableHead>
                  <TableHead className="text-right">현재가</TableHead>
                  <TableHead className="text-right">평가액</TableHead>
                  <TableHead className="text-right">손익</TableHead>
                  <TableHead className="text-right">수익률</TableHead>
                  <TableHead className="text-right">비중</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <FolderOpen className="h-10 w-10 text-gray-300" />
                        <p className="text-gray-400">등록된 주식이 없습니다</p>
                        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />주식 추가</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {stockAssets.map((asset) => {
                      const holding = asset.holding;
                      const currentValue = (holding?.quantity ?? 0) * (holding?.currentPrice ?? 0);
                      const totalCost = (holding?.quantity ?? 0) * (holding?.avgCostPrice ?? 0);
                      const { returnAmount, returnRate } = calcReturn(totalCost, currentValue);
                      const weight = assetsSummary.totalValue > 0 ? (currentValue / assetsSummary.totalValue) * 100 : 0;

                      return (
                        <TableRow key={asset.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ASSET_TYPE_BG_COLORS[asset.type] ?? 'bg-gray-100 text-gray-700'}`}>
                              {asset.type === 'KOREAN_STOCK' ? '국내' : '해외'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{(holding?.quantity ?? 0).toLocaleString('ko-KR')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(holding?.avgCostPrice ?? 0, asset.currency)}</TableCell>
                          <TableCell className="text-right">
                            <div>{formatCurrency(holding?.currentPrice ?? 0, asset.currency)}</div>
                            {holding?.priceUpdatedAt && (
                              <div className="text-[10px] text-gray-400">{formatRelativeTime(holding.priceUpdatedAt)}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(currentValue, asset.currency)}</TableCell>
                          <TableCell className={`text-right font-medium ${getReturnColor(returnAmount)}`}>
                            {returnAmount >= 0 ? '+' : ''}{formatCurrency(returnAmount, asset.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getReturnBgColor(returnRate)}`}>
                              {formatPercent(returnRate)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-500">{weight.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openChart(asset)} title="시세 차트"><BarChart3 className="h-4 w-4 text-gray-500" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 h-8 text-xs font-medium" onClick={() => openTrade(asset, 'BUY')}>매수</Button>
                              <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 h-8 text-xs font-medium" onClick={() => openTrade(asset, 'SELL')}>매도</Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(asset)} title="편집"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`"${asset.name}" 자산을 삭제할까요?`)) deleteMutation.mutate(asset.id); }} title="삭제"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* 소계 */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={5} className="text-right">주식 소계</TableCell>
                      <TableCell className="text-right">{formatCurrency(stockSummary.totalValue)}</TableCell>
                      <TableCell className={`text-right ${getReturnColor(stockSummary.totalReturn)}`}>
                        {stockSummary.totalReturn >= 0 ? '+' : ''}{formatCurrency(stockSummary.totalReturn)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getReturnBgColor(stockSummary.totalReturnRate)}`}>
                          {formatPercent(stockSummary.totalReturnRate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {assetsSummary.totalValue > 0 ? ((stockSummary.totalValue / assetsSummary.totalValue) * 100).toFixed(1) : 0}%
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 금 탭 */}
        <TabsContent value="gold">
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>자산명</TableHead>
                  <TableHead className="text-right">보유량 (g)</TableHead>
                  <TableHead className="text-right">매입 단가 (g당)</TableHead>
                  <TableHead className="text-right">현재 시세 (g당)</TableHead>
                  <TableHead className="text-right">평가액</TableHead>
                  <TableHead className="text-right">손익</TableHead>
                  <TableHead className="text-right">수익률</TableHead>
                  <TableHead className="text-right">비중</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goldAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <FolderOpen className="h-10 w-10 text-gray-300" />
                        <p className="text-gray-400">등록된 금 자산이 없습니다</p>
                        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />금 추가</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {goldAssets.map((asset) => {
                      const holding = asset.holding;
                      const currentValue = (holding?.quantity ?? 0) * (holding?.currentPrice ?? 0);
                      const totalCost = (holding?.quantity ?? 0) * (holding?.avgCostPrice ?? 0);
                      const { returnAmount, returnRate } = calcReturn(totalCost, currentValue);
                      const weight = assetsSummary.totalValue > 0 ? (currentValue / assetsSummary.totalValue) * 100 : 0;

                      return (
                        <TableRow key={asset.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell className="text-right">{(holding?.quantity ?? 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}g</TableCell>
                          <TableCell className="text-right">{formatCurrency(holding?.avgCostPrice ?? 0, asset.currency)}</TableCell>
                          <TableCell className="text-right">
                            <div>{formatCurrency(holding?.currentPrice ?? 0, asset.currency)}</div>
                            {holding?.priceUpdatedAt && (
                              <div className="text-[10px] text-gray-400">{formatRelativeTime(holding.priceUpdatedAt)}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(currentValue, asset.currency)}</TableCell>
                          <TableCell className={`text-right font-medium ${getReturnColor(returnAmount)}`}>
                            {returnAmount >= 0 ? '+' : ''}{formatCurrency(returnAmount, asset.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getReturnBgColor(returnRate)}`}>
                              {formatPercent(returnRate)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-500">{weight.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openChart(asset)} title="시세 차트"><BarChart3 className="h-4 w-4 text-gray-500" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 h-8 text-xs font-medium" onClick={() => openTrade(asset, 'BUY')}>매수</Button>
                              <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 h-8 text-xs font-medium" onClick={() => openTrade(asset, 'SELL')}>매도</Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(asset)} title="편집"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`"${asset.name}" 자산을 삭제할까요?`)) deleteMutation.mutate(asset.id); }} title="삭제"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* 소계 */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={4} className="text-right">금 소계</TableCell>
                      <TableCell className="text-right">{formatCurrency(goldSummary.totalValue)}</TableCell>
                      <TableCell className={`text-right ${getReturnColor(goldSummary.totalReturn)}`}>
                        {goldSummary.totalReturn >= 0 ? '+' : ''}{formatCurrency(goldSummary.totalReturn)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getReturnBgColor(goldSummary.totalReturnRate)}`}>
                          {formatPercent(goldSummary.totalReturnRate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {assetsSummary.totalValue > 0 ? ((goldSummary.totalValue / assetsSummary.totalValue) * 100).toFixed(1) : 0}%
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 예적금 탭 */}
        <TabsContent value="deposit">
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">상품명</TableHead>
                  <TableHead className="w-[8%]">유형</TableHead>
                  <TableHead className="w-[18%] text-right">납입 원금</TableHead>
                  <TableHead className="w-[10%] text-right">연이율</TableHead>
                  <TableHead className="w-[15%] text-right">만기일</TableHead>
                  <TableHead className="w-[8%] text-right">비중</TableHead>
                  <TableHead className="w-[16%] text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <FolderOpen className="h-10 w-10 text-gray-300" />
                        <p className="text-gray-400">등록된 예적금이 없습니다</p>
                        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />예적금 추가</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {depositAssets.map((asset) => {
                      const holding = asset.holding;
                      const totalCost = (holding?.quantity ?? 0) * (holding?.avgCostPrice ?? 0);
                      const weight = assetsSummary.totalValue > 0 ? (totalCost / assetsSummary.totalValue) * 100 : 0;
                      const depSubConfig = DEPOSIT_SUB_TYPE_MAP[asset.subType ?? ''];
                      const txLabels = depSubConfig?.transactionLabels ?? { BUY: '납입', SELL: '해지' };

                      return (
                        <TableRow key={asset.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                              {depSubConfig?.label ?? '기타'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(totalCost, asset.currency)}</TableCell>
                          <TableCell className="text-right text-sm">{asset.interestRate != null ? `${asset.interestRate}%` : '-'}</TableCell>
                          <TableCell className="text-right text-sm">
                            {asset.maturityDate ? (() => {
                              const d = new Date(asset.maturityDate);
                              const dDay = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                              return (
                                <div>
                                  <div>{d.toLocaleDateString('ko-KR')}</div>
                                  <div className={`text-[10px] ${dDay > 0 ? 'text-gray-400' : 'text-red-500 font-medium'}`}>
                                    {dDay > 0 ? `D-${dDay}` : dDay === 0 ? 'D-Day' : `만기 ${Math.abs(dDay)}일 경과`}
                                  </div>
                                </div>
                              );
                            })() : '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-500">{weight.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 h-8 text-xs font-medium" onClick={() => openTrade(asset, 'BUY')}>{txLabels.BUY}</Button>
                              <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 h-8 text-xs font-medium" onClick={() => openTrade(asset, 'SELL')}>{txLabels.SELL}</Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(asset)} title="편집"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`"${asset.name}" 자산을 삭제할까요?`)) deleteMutation.mutate(asset.id); }} title="삭제"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* 소계 */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={2} className="text-right">예적금 소계</TableCell>
                      <TableCell className="text-right">{formatCurrency(depositSummary.totalCost)}</TableCell>
                      <TableCell colSpan={2} />
                      <TableCell className="text-right text-sm">
                        {assetsSummary.totalValue > 0 ? ((depositSummary.totalValue / assetsSummary.totalValue) * 100).toFixed(1) : 0}%
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 부동산 탭 */}
        <TabsContent value="realestate">
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>자산명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">매입가 / 보증금</TableHead>
                  <TableHead className="text-right">현재 시세</TableHead>
                  <TableHead className="text-right">손익</TableHead>
                  <TableHead className="text-right">수익률</TableHead>
                  <TableHead className="text-right">비중</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realEstateAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <FolderOpen className="h-10 w-10 text-gray-300" />
                        <p className="text-gray-400">등록된 부동산이 없습니다</p>
                        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />부동산 추가</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {realEstateAssets.map((asset) => {
                      const holding = asset.holding;
                      const totalCost = (holding?.quantity ?? 0) * (holding?.avgCostPrice ?? 0);
                      const currentValue = (holding?.quantity ?? 0) * (holding?.currentPrice ?? 0);
                      const { returnAmount, returnRate } = calcReturn(totalCost, currentValue);
                      const weight = assetsSummary.totalValue > 0 ? (currentValue / assetsSummary.totalValue) * 100 : 0;
                      const subConfig = REAL_ESTATE_SUB_TYPE_MAP[asset.subType ?? ''];
                      const txLabels = subConfig?.transactionLabels ?? { BUY: '매입', SELL: '매각' };

                      return (
                        <TableRow key={asset.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {subConfig?.label ?? '기타'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(totalCost, asset.currency)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(currentValue, asset.currency)}</TableCell>
                          <TableCell className={`text-right font-medium ${getReturnColor(returnAmount)}`}>
                            {returnAmount >= 0 ? '+' : ''}{formatCurrency(returnAmount, asset.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getReturnBgColor(returnRate)}`}>
                              {formatPercent(returnRate)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-500">{weight.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 h-8 text-xs font-medium" onClick={() => openTrade(asset, 'BUY')}>{txLabels.BUY}</Button>
                              <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 h-8 text-xs font-medium" onClick={() => openTrade(asset, 'SELL')}>{txLabels.SELL}</Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(asset)} title="편집"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`"${asset.name}" 자산을 삭제할까요?`)) deleteMutation.mutate(asset.id); }} title="삭제"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* 소계 */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={2} className="text-right">부동산 소계</TableCell>
                      <TableCell className="text-right">{formatCurrency(realEstateSummary.totalCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(realEstateSummary.totalValue)}</TableCell>
                      <TableCell className={`text-right ${getReturnColor(realEstateSummary.totalReturn)}`}>
                        {realEstateSummary.totalReturn >= 0 ? '+' : ''}{formatCurrency(realEstateSummary.totalReturn)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getReturnBgColor(realEstateSummary.totalReturnRate)}`}>
                          {formatPercent(realEstateSummary.totalReturnRate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {assetsSummary.totalValue > 0 ? ((realEstateSummary.totalValue / assetsSummary.totalValue) * 100).toFixed(1) : 0}%
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog — 탭별 전용 폼 */}
      <Dialog open={dialogMode === 'create' || dialogMode === 'edit'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create'
                ? activeTab === 'stock' ? '주식 추가'
                  : activeTab === 'gold' ? '금 추가'
                  : activeTab === 'deposit' ? '예적금 추가'
                  : '부동산 추가'
                : `${selectedAsset?.name} 편집`}
            </DialogTitle>
          </DialogHeader>

          {/* 주식 폼 */}
          {(activeTab === 'stock' || (dialogMode === 'edit' && (selectedAsset?.type === 'KOREAN_STOCK' || selectedAsset?.type === 'OVERSEAS_STOCK'))) && (
            <div className="space-y-4">
              <div>
                <Label>종목명</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예: 삼성전자, KODEX 나스닥100"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>시장 구분</Label>
                <Select
                  value={form.stockMarket}
                  onValueChange={(v) => setForm({ ...form, stockMarket: v, currency: v === 'OVERSEAS_STOCK' ? 'USD' : 'KRW' })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KOREAN_STOCK">국내 주식</SelectItem>
                    <SelectItem value="OVERSEAS_STOCK">해외 주식</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>종목 코드</Label>
                <Input
                  value={form.ticker}
                  onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                  placeholder={form.stockMarket === 'KOREAN_STOCK' ? '예: 005930 (삼성전자)' : '예: AAPL (Apple)'}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.stockMarket === 'KOREAN_STOCK' ? '네이버 금융 종목 코드 6자리' : 'Yahoo Finance 티커 심볼'}
                </p>
              </div>
            </div>
          )}

          {/* 금 폼 */}
          {(activeTab === 'gold' && dialogMode === 'create' || (dialogMode === 'edit' && selectedAsset?.type === 'GOLD')) && (
            <div className="space-y-4">
              <div>
                <Label>자산명</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예: 금현물, KRX 금"
                  className="mt-1"
                />
              </div>
              <p className="text-sm text-gray-500 bg-gray-50 rounded-md p-3">
                금 시세(GC=F)는 Yahoo Finance에서 자동으로 가져옵니다.
              </p>
            </div>
          )}

          {/* 예적금 폼 */}
          {(activeTab === 'deposit' && dialogMode === 'create' || (dialogMode === 'edit' && selectedAsset?.type === 'DEPOSIT')) && (
            <div className="space-y-4">
              <div>
                <Label>상품명</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예: 토스 자유적금, 청년도약계좌"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>예적금 유형</Label>
                <Select value={form.subType} onValueChange={(v) => setForm({ ...form, subType: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPOSIT_SUB_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>연이율 (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                    placeholder="예: 4.5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>만기일</Label>
                  <Input
                    type="date"
                    value={form.maturityDate}
                    onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 부동산 폼 */}
          {(activeTab === 'realestate' && dialogMode === 'create' || (dialogMode === 'edit' && selectedAsset?.type === 'REAL_ESTATE')) && (
            <div className="space-y-4">
              <div>
                <Label>자산명</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예: 전세 보증금, 강남 아파트"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>부동산 유형</Label>
                <Select value={form.subType} onValueChange={(v) => setForm({ ...form, subType: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REAL_ESTATE_SUB_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
            <Button
              onClick={handleSubmit}
              disabled={
                updateHoldingMutation.isPending ||
                Number(fromCommaString(holdingForm.currentPrice)) <= 0
              }
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade Dialog — 유형별 라벨 대응 */}
      <Dialog open={dialogMode === 'trade'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          {(() => {
            const fieldConfig = ASSET_TYPE_FIELD_CONFIG[selectedAsset?.type ?? ''];
            const reSubConfig = selectedAsset?.type === 'REAL_ESTATE' ? REAL_ESTATE_SUB_TYPE_MAP[selectedAsset?.subType ?? ''] : null;
            const depSubConfig = selectedAsset?.type === 'DEPOSIT' ? DEPOSIT_SUB_TYPE_MAP[selectedAsset?.subType ?? ''] : null;
            const txLabels = reSubConfig?.transactionLabels ?? depSubConfig?.transactionLabels ?? fieldConfig?.transactionLabels ?? { BUY: '매수', SELL: '매도' };
            const buyLabel = txLabels.BUY;
            const sellLabel = txLabels.SELL;
            const activeLabel = tradeForm.type === 'BUY' ? buyLabel : sellLabel;
            const isDeposit = reSubConfig?.hideQuantity ?? fieldConfig?.hideQuantity;
            const qtyNum = Number(fromCommaString(tradeForm.quantity));
            const priceNum = Number(fromCommaString(tradeForm.price));
            const feeNum = Number(fromCommaString(tradeForm.fee));
            const totalAmount = isDeposit ? priceNum : qtyNum * priceNum;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedAsset?.name} — {activeLabel}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={tradeForm.type === 'BUY' ? 'default' : 'outline'}
                      className={tradeForm.type === 'BUY' ? 'bg-red-500 hover:bg-red-600 flex-1' : 'flex-1'}
                      onClick={() => setTradeForm({ ...tradeForm, type: 'BUY' })}
                    >
                      {buyLabel}
                    </Button>
                    <Button
                      variant={tradeForm.type === 'SELL' ? 'default' : 'outline'}
                      className={tradeForm.type === 'SELL' ? 'bg-blue-500 hover:bg-blue-600 flex-1' : 'flex-1'}
                      onClick={() => setTradeForm({ ...tradeForm, type: 'SELL' })}
                    >
                      {sellLabel}
                    </Button>
                  </div>
                  {isDeposit ? (
                    <div>
                      <Label>
                        {selectedAsset?.type === 'DEPOSIT' && tradeForm.type === 'SELL'
                          ? '수령액 (원금+이자)'
                          : `${activeLabel} 금액`}
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({ ...tradeForm, price: toCommaString(e.target.value) })}
                        placeholder="0"
                        className={`mt-1 ${tradeForm.type === 'SELL' && selectedAsset?.type !== 'DEPOSIT' && Number(fromCommaString(tradeForm.price)) > (selectedAsset?.holding?.quantity ?? 0) * (selectedAsset?.holding?.avgCostPrice ?? 0) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {tradeForm.type === 'SELL' && (() => {
                        const principal = (selectedAsset?.holding?.quantity ?? 0) * (selectedAsset?.holding?.avgCostPrice ?? 0);
                        if (selectedAsset?.type === 'DEPOSIT') {
                          return (
                            <div className="text-xs mt-1 text-gray-400">
                              <span>납입 원금: {formatCurrency(principal, selectedAsset?.currency)}</span>
                            </div>
                          );
                        }
                        const current = Number(fromCommaString(tradeForm.price));
                        const isOver = current > principal;
                        return (
                          <div className={`text-xs mt-1 flex justify-between ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
                            <span>현재 금액: {formatCurrency(principal, selectedAsset?.currency)}</span>
                            {isOver && <span className="font-medium">보유 금액을 초과했습니다</span>}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label>{selectedAsset?.type === 'GOLD' ? '수량 (g)' : '수량'}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={tradeForm.quantity}
                          onChange={(e) => setTradeForm({ ...tradeForm, quantity: toCommaString(e.target.value) })}
                          placeholder="0"
                          className={`mt-1 ${tradeForm.type === 'SELL' && Number(fromCommaString(tradeForm.quantity)) > (selectedAsset?.holding?.quantity ?? 0) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        {tradeForm.type === 'SELL' && (() => {
                          const max = selectedAsset?.holding?.quantity ?? 0;
                          const current = Number(fromCommaString(tradeForm.quantity));
                          const isOver = current > max;
                          return (
                            <div className={`text-xs mt-1 flex justify-between ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
                              <span>보유: {max.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}{selectedAsset?.type === 'GOLD' ? 'g' : '주'}</span>
                              {isOver && <span className="font-medium">보유량을 초과했습니다</span>}
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <Label>단가 ({selectedAsset?.currency})</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={tradeForm.price}
                          onChange={(e) => setTradeForm({ ...tradeForm, price: toCommaString(e.target.value) })}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                  {!isDeposit && (
                    <div>
                      <Label>수수료</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={tradeForm.fee}
                        onChange={(e) => setTradeForm({ ...tradeForm, fee: toCommaString(e.target.value) })}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div>
                    <Label>거래일</Label>
                    <Input
                      type="date"
                      value={tradeForm.date}
                      onChange={(e) => setTradeForm({ ...tradeForm, date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>메모 (선택)</Label>
                    <Input
                      value={tradeForm.memo}
                      onChange={(e) => setTradeForm({ ...tradeForm, memo: e.target.value })}
                      placeholder={
                        isDeposit
                          ? selectedAsset?.type === 'REAL_ESTATE'
                            ? '예: 계약 갱신, 보증금 인상'
                            : '예: 만기 해지, 중도 해지'
                          : tradeForm.type === 'BUY'
                            ? '예: 분할 매수 2차'
                            : '예: 수익 실현, 비중 축소'
                      }
                      className="mt-1"
                    />
                  </div>
                  {/* 금액 미리보기 */}
                  {totalAmount > 0 && (
                    <div className="bg-gray-50 rounded-md p-3 text-sm space-y-1">
                      {isDeposit ? (() => {
                        const currentTotal = (selectedAsset?.holding?.quantity ?? 0) * (selectedAsset?.holding?.avgCostPrice ?? 0);
                        // 예적금 해지: 수령액 기반 이자 수익 표시
                        if (selectedAsset?.type === 'DEPOSIT' && tradeForm.type === 'SELL') {
                          const interest = priceNum - currentTotal;
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-500">납입 원금</span>
                                <span>{formatCurrency(currentTotal, selectedAsset?.currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">수령액</span>
                                <span className="font-semibold">{formatCurrency(priceNum, selectedAsset?.currency)}</span>
                              </div>
                              <div className="border-t pt-1 mt-1" />
                              <div className="flex justify-between">
                                <span className="text-gray-500">이자 수익</span>
                                <span className={`font-semibold ${interest >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                  {interest >= 0 ? '+' : ''}{formatCurrency(interest, selectedAsset?.currency)}
                                </span>
                              </div>
                            </>
                          );
                        }
                        const afterTotal = tradeForm.type === 'BUY' ? currentTotal + priceNum : currentTotal - priceNum;
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">{activeLabel} 금액</span>
                              <span className="font-semibold">{formatCurrency(priceNum, selectedAsset?.currency)}</span>
                            </div>
                            <div className="border-t pt-1 mt-1" />
                            <div className="flex justify-between">
                              <span className="text-gray-500">현재 금액</span>
                              <span>{formatCurrency(currentTotal, selectedAsset?.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">변경 후</span>
                              <span className="font-semibold text-base">{formatCurrency(afterTotal, selectedAsset?.currency)}</span>
                            </div>
                          </>
                        );
                      })() : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">거래 금액</span>
                            <span className="font-semibold">{formatCurrency(totalAmount, selectedAsset?.currency)}</span>
                          </div>
                          {feeNum > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">수수료 포함</span>
                              <span className="font-semibold">{formatCurrency(totalAmount + feeNum, selectedAsset?.currency)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogMode(null)}>취소</Button>
                  <Button
                    onClick={() => {
                      if (!selectedAsset) return;
                      createTransactionMutation.mutate({
                        assetId: selectedAsset.id,
                        type: tradeForm.type,
                        quantity: isDeposit ? 1 : Number(fromCommaString(tradeForm.quantity)),
                        price: Number(fromCommaString(tradeForm.price)),
                        fee: feeNum || 0,
                        date: tradeForm.date,
                        memo: tradeForm.memo || undefined,
                      });
                    }}
                    disabled={
                      (isDeposit ? !priceNum : (!qtyNum || !priceNum)) ||
                      (tradeForm.type === 'SELL' && !isDeposit && qtyNum > (selectedAsset?.holding?.quantity ?? 0)) ||
                      (tradeForm.type === 'SELL' && isDeposit && selectedAsset?.type !== 'DEPOSIT' && priceNum > (selectedAsset?.holding?.quantity ?? 0) * (selectedAsset?.holding?.avgCostPrice ?? 0)) ||
                      createTransactionMutation.isPending
                    }
                    className={tradeForm.type === 'BUY' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
                  >
                    {createTransactionMutation.isPending ? '처리 중...' : `${activeLabel} 확인`}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Price Chart Dialog */}
      <Dialog open={dialogMode === 'chart'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.name} — 시세 추이</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={chartDays === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => openChart(selectedAsset!, d)}
              >
                {d}일
              </Button>
            ))}
          </div>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              시세 이력이 없습니다. 시세 업데이트 후 기록이 쌓입니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.map((d) => ({ date: new Date(d.recordedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }), price: d.price }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, selectedAsset?.currency)} width={100} />
                <Tooltip formatter={(value: number) => [formatCurrency(value, selectedAsset?.currency), '시세']} />
                <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
