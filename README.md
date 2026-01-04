# FSM Presentation Examples

이 저장소는 FSM/Statechart 개념을 단계별 예제로 설명하는 데모 프로젝트입니다.
각 폴더는 주제별로 독립된 TypeScript 예제를 제공합니다.

## 구성

- `01-basic-fsm`: 순수 TypeScript로 구현한 기본 FSM
- `02-xstate-examples`: XState v5 기반 예제
- `03-workflow-comparison`: XState vs Mastra vs LangGraph 비교
- `04-advanced-topics`: 계층적 상태, 상태 영속화 등 고급 주제

## 준비 사항

- Node.js 20+
- pnpm

## 빠른 시작

```bash
# 의존성 설치
pnpm install

# 전체 빌드
pnpm -r build
```

## 예제 실행

```bash
# 기본 FSM
pnpm -C 01-basic-fsm run toggle
pnpm -C 01-basic-fsm run traffic

# XState 예제
pnpm -C 02-xstate-examples run basic
pnpm -C 02-xstate-examples run form
pnpm -C 02-xstate-examples run fetch

# 워크플로우 비교
pnpm -C 03-workflow-comparison run xstate
pnpm -C 03-workflow-comparison run mastra
pnpm -C 03-workflow-comparison run langgraph

# 고급 주제
pnpm -C 04-advanced-topics run hierarchical
pnpm -C 04-advanced-topics run persistence
```

각 폴더의 `README.md`에 상세 설명이 있습니다.
