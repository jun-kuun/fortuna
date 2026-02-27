import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '@/lib/api';
import { formatCurrency, formatPercent, getReturnColor, ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['portfolio', 'summary'],
    queryFn: portfolioApi.getSummary,
  });

  const { data: allocation } = useQuery({
    queryKey: ['portfolio', 'allocation'],
    queryFn: portfolioApi.getAllocation,
  });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const pieData = (allocation ?? []).map((a) => ({
    name: ASSET_TYPE_LABELS[a.type] ?? a.type,
    value: a.value,
    percentage: a.percentage,
    color: ASSET_TYPE_COLORS[a.type] ?? '#6b7280',
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">포트폴리오 대시보드</h2>
        <p className="text-gray-500 mt-1">전체 자산 현황을 한눈에 확인하세요</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">총 평가액</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalValue ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">총 투자 원금</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalCost ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">총 손익</CardTitle>
            {(summary?.totalReturn ?? 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-blue-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getReturnColor(summary?.totalReturn ?? 0)}`}>
              {formatCurrency(summary?.totalReturn ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">총 수익률</CardTitle>
            {(summary?.totalReturnRate ?? 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-blue-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getReturnColor(summary?.totalReturnRate ?? 0)}`}>
              {formatPercent(summary?.totalReturnRate ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
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
                    cx="50%"
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
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), '평가액']}
                    labelFormatter={(label) => label}
                  />
                  <Legend
                    formatter={(value, entry: any) =>
                      `${value} (${entry.payload.percentage.toFixed(1)}%)`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <CardTitle>보유 종목 현황</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(summary?.holdings ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                보유 중인 자산이 없습니다
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>종목</TableHead>
                    <TableHead className="text-right">평가액</TableHead>
                    <TableHead className="text-right">수익률</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.holdings.map((holding) => (
                    <TableRow key={holding.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{holding.asset.name}</div>
                          <div className="text-xs text-gray-400">
                            {ASSET_TYPE_LABELS[holding.asset.type] ?? holding.asset.type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(holding.currentValue, holding.asset.currency)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getReturnColor(holding.returnRate)}`}>
                        {formatPercent(holding.returnRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
