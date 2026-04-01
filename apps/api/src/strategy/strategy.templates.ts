export const STRATEGY_TEMPLATES = [
  {
    id: 'all-weather',
    name: '안정형 (사계절)',
    description: '경기가 좋든 나쁘든 꾸준히 버티는 스타일. 예적금 비중이 높고, 주식·금을 고르게 섞습니다.',
    allocations: {
      KOREAN_STOCK: 15,
      OVERSEAS_STOCK: 15,
      REAL_ESTATE: 0,
      DEPOSIT: 40,
      GOLD: 15,
      OTHER: 15,
    },
  },
  {
    id: 'sixty-forty',
    name: '균형형 (6:4)',
    description: '주식 60% + 예적금 40%의 전통적인 배분. 성장과 안정 사이 균형을 잡습니다.',
    allocations: {
      KOREAN_STOCK: 30,
      OVERSEAS_STOCK: 30,
      REAL_ESTATE: 0,
      DEPOSIT: 40,
      GOLD: 0,
      OTHER: 0,
    },
  },
  {
    id: 'permanent',
    name: '방어형 (4등분)',
    description: '주식·예적금·금을 고르게 나눠서 어떤 상황에서도 크게 잃지 않는 전략입니다.',
    allocations: {
      KOREAN_STOCK: 12.5,
      OVERSEAS_STOCK: 12.5,
      REAL_ESTATE: 0,
      DEPOSIT: 50,
      GOLD: 25,
      OTHER: 0,
    },
  },
  {
    id: 'growth',
    name: '공격형 (성장)',
    description: '주식 비중을 최대로! 장기적으로 높은 수익을 노리지만 변동성도 큽니다.',
    allocations: {
      KOREAN_STOCK: 40,
      OVERSEAS_STOCK: 40,
      REAL_ESTATE: 10,
      DEPOSIT: 0,
      GOLD: 5,
      OTHER: 5,
    },
  },
];
