import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  icon: LucideIcon;
  score: number | string;
  subtitle: string;
  color: string;
  detail?: string;
}

export default function ScoreCard({ title, icon: Icon, score, subtitle, color, detail }: ScoreCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <span className="text-sm font-medium text-gray-600">{title}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{score}</div>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            {detail && <p className="text-xs text-gray-400 mt-1">{detail}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
