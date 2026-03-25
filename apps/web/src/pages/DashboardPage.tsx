import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { portfolioApi, transactionsApi, priceApi, newsApi } from '@/lib/api';
import {
  formatCurrency, formatPercent, getReturnColor, getReturnBgColor, formatDate,
  ASSET_TYPE_LABELS, ASSET_TYPE_COLORS, ASSET_TYPE_BG_COLORS, ASSET_TYPE_FIELD_CONFIG,
  DEPOSIT_SUB_TYPE_MAP, REAL_ESTATE_SUB_TYPE_MAP,
} from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, ArrowRight, Download, Newspaper, ArrowUpDown } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [priceMsg, setPriceMsg] = useState<string | null>(null);

  const updatePricesMutation = useMutation({
    mutationFn: priceApi.updateAll,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setPriceMsg(`${data.updatedCount}개 시세 업데이트 완료`);
      setTimeout(() => setPriceMsg(null), 4000);
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['portfolio', 'summary'],
    queryFn: portfolioApi.getSummary,
  });

  const { data: allocation } = useQuery({
    queryKey: ['portfolio', 'allocation'],
    queryFn: portfolioApi.getAllocation,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.getAll(),
  });

  const { data: newsData } = useQuery({
    queryKey: ['news', 'all'],
    queryFn: newsApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const { data: exchangeRate } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: priceApi.getExchangeRate,
    staleTime: 30 * 60 * 1000,
  });

  const pieData = (allocation ?? []).map((a) => ({
    name: ASSET_TYPE_LABELS[a.type] ?? a.type,
    value: a.value,
    percentage: a.percentage,
    color: ASSET_TYPE_COLORS[a.type] ?? '#6b7280',
  }));

  const returnByType = useMemo(() => {
    if (!summary?.holdings?.length) return [];
    const grouped: Record<string, { totalCost: number; currentValue: number }> = {};
    for (const h of summary.holdings) {
      const type = h.asset.type;
      if (!grouped[type]) grouped[type] = { totalCost: 0, currentValue: 0 };
      grouped[type].totalCost += h.totalCost;
      grouped[type].currentValue += h.currentValue;
    }
    return Object.entries(grouped).map(([type, { totalCost, currentValue }]) => ({
      name: ASSET_TYPE_LABELS[type] ?? type,
      returnRate: totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0,
    }));
  }, [summary]);

  const sortedHoldings = useMemo(() => {
    if (!summary?.holdings) return [];
    return [...summary.holdings].sort((a, b) => b.currentValue - a.currentValue);
  }, [summary]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const totalReturn = summary?.totalReturn ?? 0;
  const totalReturnRate = summary?.totalReturnRate ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">포트폴리오 대시보드</h2>
          <p className="text-gray-500 mt-1">전체 자산 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex items-center gap-2">
          {priceMsg && <span className="text-sm text-green-600 font-medium">{priceMsg}</span>}
          <Button
            variant="outline"
            onClick={() => updatePricesMutation.mutate()}
            disabled={updatePricesMutation.isPending}
          >
            <Download className={`h-4 w-4 mr-2 ${updatePricesMutation.isPending ? 'animate-pulse' : ''}`} />
            {updatePricesMutation.isPending ? '업데이트 중...' : '시세 업데이트'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">총 평가액</p>
                <p className="text-2xl font-bold truncate">{formatCurrency(summary?.totalValue ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <PiggyBank className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">총 투자 원금</p>
                <p className="text-2xl font-bold truncate">{formatCurrency(summary?.totalCost ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalReturn > 0 ? 'bg-red-50/50' : totalReturn < 0 ? 'bg-blue-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${totalReturn >= 0 ? 'bg-red-100' : 'bg-blue-100'}`}>
                {totalReturn >= 0
                  ? <TrendingUp className="h-5 w-5 text-red-600" />
                  : <TrendingDown className="h-5 w-5 text-blue-600" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">총 손익</p>
                <p className={`text-2xl font-bold truncate ${getReturnColor(totalReturn)}`}>
                  {formatCurrency(totalReturn)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalReturnRate > 0 ? 'bg-red-50/50' : totalReturnRate < 0 ? 'bg-blue-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${totalReturnRate >= 0 ? 'bg-red-100' : 'bg-blue-100'}`}>
                {totalReturnRate >= 0
                  ? <TrendingUp className="h-5 w-5 text-red-600" />
                  : <TrendingDown className="h-5 w-5 text-blue-600" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">총 수익률</p>
                <p className={`text-2xl font-bold ${getReturnColor(totalReturnRate)}`}>
                  {formatPercent(totalReturnRate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <ArrowUpDown className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">원/달러 환율</p>
                <p className="text-2xl font-bold truncate">
                  {exchangeRate?.USDKRW
                    ? `₩${exchangeRate.USDKRW.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}`
                    : '-'}
                </p>
                {exchangeRate?.fetchedAt && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {(() => {
                      const diffMs = Date.now() - new Date(exchangeRate.fetchedAt).getTime();
                      const diffMin = Math.floor(diffMs / 60000);
                      if (diffMin < 1) return '방금 전';
                      if (diffMin < 60) return `${diffMin}분 전`;
                      return `${Math.floor(diffMin / 60)}시간 전`;
                    })()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Pie + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>자산 유형별 비중</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                자산을 추가하면 차트가 표시됩니다
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="40%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), '평가액']} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value, entry: any) =>
                      `${value} (${entry.payload.percentage.toFixed(1)}%)`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>자산 유형별 수익률</CardTitle>
          </CardHeader>
          <CardContent>
            {returnByType.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                자산을 추가하면 차트가 표시됩니다
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={returnByType} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, '수익률']} />
                  <Bar dataKey="returnRate" radius={[4, 4, 0, 0]}>
                    {returnByType.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.returnRate >= 0 ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>보유 종목 현황</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedHoldings.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              보유 중인 자산이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>종목</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">보유 수량</TableHead>
                  <TableHead className="text-right">평균 단가</TableHead>
                  <TableHead className="text-right">현재가</TableHead>
                  <TableHead className="text-right">평가액</TableHead>
                  <TableHead className="text-right">손익</TableHead>
                  <TableHead className="text-right">수익률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((h) => {
                  const fieldConfig = ASSET_TYPE_FIELD_CONFIG[h.asset.type];
                  const isDeposit = h.asset.type === 'DEPOSIT';
                  const isRealEstate = h.asset.type === 'REAL_ESTATE';
                  const depSub = isDeposit ? DEPOSIT_SUB_TYPE_MAP[h.asset.subType ?? ''] : null;
                  const reSub = isRealEstate ? REAL_ESTATE_SUB_TYPE_MAP[h.asset.subType ?? ''] : null;
                  const subLabel = depSub?.label ?? reSub?.label ?? null;
                  const isAmountBased = isDeposit || isRealEstate;
                  return (
                    <TableRow key={h.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{h.asset.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ASSET_TYPE_BG_COLORS[h.asset.type] ?? 'bg-gray-100 text-gray-700'}`}>
                          {subLabel ?? ASSET_TYPE_LABELS[h.asset.type] ?? h.asset.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAmountBased ? '-' : h.quantity.toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAmountBased ? formatCurrency(h.totalCost, h.asset.currency) : formatCurrency(h.avgCostPrice, h.asset.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isDeposit ? '-' : isRealEstate ? formatCurrency(h.currentValue, h.asset.currency) : formatCurrency(h.currentPrice, h.asset.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {isAmountBased ? '-' : formatCurrency(h.currentValue, h.asset.currency)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${isDeposit ? 'text-gray-400' : getReturnColor(h.returnAmount)}`}>
                        {isDeposit ? '-' : <>{h.returnAmount >= 0 ? '+' : ''}{formatCurrency(h.returnAmount, h.asset.currency)}</>}
                      </TableCell>
                      <TableCell className="text-right">
                        {isDeposit ? <span className="text-gray-400">-</span> : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getReturnBgColor(h.returnRate)}`}>
                            {formatPercent(h.returnRate)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>최근 거래 내역</CardTitle>
          <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
            전체보기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              거래 내역이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>자산</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">거래금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => {
                  const txConfig = ASSET_TYPE_FIELD_CONFIG[tx.asset?.type ?? ''];
                  const txDepSub = tx.asset?.type === 'DEPOSIT' ? DEPOSIT_SUB_TYPE_MAP[tx.asset?.subType ?? ''] : null;
                  const txReSub = tx.asset?.type === 'REAL_ESTATE' ? REAL_ESTATE_SUB_TYPE_MAP[tx.asset?.subType ?? ''] : null;
                  const txLabel = txDepSub?.transactionLabels?.[tx.type] ?? txReSub?.transactionLabels?.[tx.type] ?? txConfig?.transactionLabels[tx.type] ?? (tx.type === 'BUY' ? '매수' : '매도');
                  return (
                    <TableRow key={tx.id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-600">{formatDate(tx.date)}</TableCell>
                      <TableCell className="font-medium">{tx.asset?.name ?? '-'}</TableCell>
                      <TableCell>
                        <Badge className={tx.type === 'BUY' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}>
                          {txLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'BUY' ? 'text-red-500' : 'text-blue-500'}`}>
                        {tx.type === 'SELL' ? '+' : '-'}{formatCurrency(tx.quantity * tx.price, tx.asset?.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Latest News */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>최신 뉴스</CardTitle>
          <Link to="/news" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
            전체보기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {(!newsData?.market || newsData.market.length === 0) ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              뉴스를 불러오는 중...
            </div>
          ) : (
            <div className="divide-y">
              {newsData.market.slice(0, 5).map((item, index) => (
                <a
                  key={`news-${index}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <Newspaper className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.source && <span className="text-xs text-gray-400">{item.source}</span>}
                      <span className="text-xs text-gray-300">
                        {(() => {
                          const diffMs = Date.now() - new Date(item.pubDate).getTime();
                          const diffMin = Math.floor(diffMs / 60000);
                          const diffHour = Math.floor(diffMin / 60);
                          if (diffMin < 60) return `${diffMin}분 전`;
                          if (diffHour < 24) return `${diffHour}시간 전`;
                          return `${Math.floor(diffHour / 24)}일 전`;
                        })()}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
