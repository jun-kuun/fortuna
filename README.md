# Fortuna - 자산 관리 플랫폼

개인 자산과 포트폴리오를 관리하는 웹 애플리케이션입니다. 자산 등록, 매수/매도 거래 기록, 포트폴리오 현황 분석 기능을 제공합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | NestJS, Prisma, PostgreSQL |
| Frontend | React, Vite, TanStack Query |
| UI | Radix UI (shadcn/ui), Tailwind CSS, Recharts |
| Infra | Docker Compose, pnpm workspaces |

## 프로젝트 구조

```
fortuna/
├── apps/
│   ├── api/             # NestJS 백엔드 (포트 4000)
│   └── web/             # React + Vite 프론트엔드 (포트 3000)
├── packages/
│   └── shared/          # 공유 TypeScript 타입
└── docker/
    └── docker-compose.yml
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- pnpm
- Docker

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# PostgreSQL 컨테이너 실행
pnpm db:up

# 마이그레이션 적용
pnpm db:migrate

# 개발 서버 실행 (API + Web 동시 실행)
pnpm dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api

## 주요 기능

### 대시보드
- 총 평가액, 투자 원금, 총 손익, 수익률 요약
- 자산 유형별 비중 도넛 차트
- 보유 종목 현황 테이블

### 자산 관리
- 자산 등록/수정/삭제 (국내주식, 해외주식, 부동산, 예적금, 금, 기타)
- 현재가 수동 업데이트

### 거래 내역
- 매수/매도 거래 기록
- 거래 생성/삭제 시 보유 수량 및 평균 단가 자동 재계산
- 자산별 필터링

## 데이터 모델

```
Asset (1) ──── (0..1) Holding       # 보유 수량, 평균단가, 현재가
Asset (1) ──── (*)    Transaction   # 매수/매도 거래 기록
```

- **평균단가**는 거래 기록으로부터 자동 계산 (비례배분 방식)
- **현재가**는 사용자가 수동 입력

## 스크립트

```bash
pnpm dev              # 프론트/백엔드 동시 실행
pnpm build            # shared → api → web 순서로 빌드
pnpm db:up            # PostgreSQL 컨테이너 시작
pnpm db:down          # PostgreSQL 컨테이너 중지
pnpm db:migrate       # Prisma 마이그레이션 실행
pnpm db:studio        # Prisma Studio 실행
```

## 환경 변수

`apps/api/.env` 파일에 설정합니다.

```env
DATABASE_URL="postgresql://fortuna:fortuna_secret@localhost:5432/fortuna_db?schema=public"
PORT=4000
```
