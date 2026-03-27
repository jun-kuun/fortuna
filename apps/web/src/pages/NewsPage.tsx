import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { newsApi, NewsItem } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, TrendingUp, ExternalLink, RefreshCw, Globe, BarChart3 } from 'lucide-react';

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR');
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                {item.source && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {item.source}
                  </Badge>
                )}
                {item.relatedAsset && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs shrink-0">
                    {item.relatedAsset}
                  </Badge>
                )}
                <span className="text-xs text-gray-400 shrink-0">
                  {formatRelativeTime(item.pubDate)}
                </span>
              </div>
              <h3 className="font-medium text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export default function NewsPage() {
  const [tab, setTab] = useState<'market' | 'assets'>('market');
  const [assetFilter, setAssetFilter] = useState<string>('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['news', 'all'],
    queryFn: newsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const marketNews = data?.market ?? [];
  const assetNews = data?.assets ?? [];
  const assetNames = [...new Set(assetNews.map((n) => n.relatedAsset).filter(Boolean))] as string[];
  const filteredAssetNews = assetFilter === 'all' ? assetNews : assetNews.filter((n) => n.relatedAsset === assetFilter);
  const currentNews = tab === 'market' ? marketNews : filteredAssetNews;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">뉴스</h2>
          <p className="text-gray-500 mt-1">시장 동향과 보유 종목 관련 뉴스를 확인하세요</p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? '새로고침 중...' : '새로고침'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'market' ? 'default' : 'outline'}
          onClick={() => setTab('market')}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          시장 뉴스
          {marketNews.length > 0 && (
            <Badge variant="secondary" className="ml-1">{marketNews.length}</Badge>
          )}
        </Button>
        <Button
          variant={tab === 'assets' ? 'default' : 'outline'}
          onClick={() => setTab('assets')}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          종목 뉴스
          {assetNews.length > 0 && (
            <Badge variant="secondary" className="ml-1">{assetNews.length}</Badge>
          )}
        </Button>
      </div>

      {/* Asset filter */}
      {tab === 'assets' && assetNames.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={assetFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAssetFilter('all')}
          >
            전체
          </Button>
          {assetNames.map((name) => (
            <Button
              key={name}
              variant={assetFilter === name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAssetFilter(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">뉴스를 불러오는 중...</div>
        </div>
      ) : currentNews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Newspaper className="h-12 w-12 mb-4" />
            <p>{tab === 'market' ? '시장 뉴스가 없습니다' : '종목 관련 뉴스가 없습니다'}</p>
            {tab === 'assets' && (
              <p className="text-sm mt-1">주식 또는 금 자산을 추가하면 관련 뉴스가 표시됩니다</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {currentNews.map((item, index) => (
            <NewsCard key={`${item.title}-${index}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
