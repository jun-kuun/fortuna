import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RebalancingTab from '@/components/strategy/RebalancingTab';
import ReturnTrendTab from '@/components/strategy/ReturnTrendTab';
import GoalSimulationTab from '@/components/strategy/GoalSimulationTab';
import { PieChart, TrendingUp, Target } from 'lucide-react';

export default function StrategyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">내 투자 플랜</h2>
        <p className="text-gray-500 mt-1">자산 비중을 점검하고, 투자 목표를 설정하세요</p>
      </div>

      <Tabs defaultValue="rebalancing" className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="rebalancing" className="flex items-center gap-2 px-4">
            <PieChart className="h-4 w-4" />
            자산 비중 조정
          </TabsTrigger>
          <TabsTrigger value="return-trend" className="flex items-center gap-2 px-4">
            <TrendingUp className="h-4 w-4" />
            투자 성과
          </TabsTrigger>
          <TabsTrigger value="goal" className="flex items-center gap-2 px-4">
            <Target className="h-4 w-4" />
            목표 달성 계산기
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rebalancing">
          <RebalancingTab />
        </TabsContent>
        <TabsContent value="return-trend">
          <ReturnTrendTab />
        </TabsContent>
        <TabsContent value="goal">
          <GoalSimulationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
