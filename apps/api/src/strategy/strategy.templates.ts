export const STRATEGY_TEMPLATES = [
  {
    id: 'all-weather',
    name: '올웨더 포트폴리오',
    description: '레이 달리오의 사계절 포트폴리오. 어떤 경제 환경에서도 안정적인 수익을 추구합니다.',
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
    name: '60/40 포트폴리오',
    description: '전통적인 주식 60% + 채권(예적금) 40% 배분 전략입니다.',
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
    name: '영구 포트폴리오',
    description: '해리 브라운의 4등분 포트폴리오. 주식, 채권, 금, 현금을 균등 배분합니다.',
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
    name: '성장 공격형',
    description: '주식 비중을 극대화하여 장기 성장을 추구하는 공격적 전략입니다.',
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
