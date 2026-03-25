import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  impact: string;
}

const priorityConfig = {
  HIGH: { label: '긴급', className: 'bg-red-100 text-red-700 border-red-200' },
  MEDIUM: { label: '권장', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  LOW: { label: '참고', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export default function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          현재 특별한 추천 사항이 없습니다. 포트폴리오 상태가 양호합니다!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          추천 액션
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, i) => {
          const config = priorityConfig[rec.priority];
          return (
            <div key={i} className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex-shrink-0 mt-0.5">
                <Badge variant="outline" className={config.className}>
                  {config.label}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">{rec.category}</span>
                </div>
                <h4 className="font-medium text-gray-900 text-sm">{rec.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {rec.impact}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
