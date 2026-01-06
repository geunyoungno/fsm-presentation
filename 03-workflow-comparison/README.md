# 03. 워크플로우 라이브러리 비교

> 💡 **학습 목표**: 동일한 워크플로우를 세 가지 라이브러리로 구현하며 각각의 철학과 적합한 사용 사례를 이해합니다.

> **이전 섹션 복습:** [02-xstate-examples](../02-xstate-examples)에서 XState의 강력한 기능들을 배웠습니다.

이 섹션에서는 동일한 워크플로우를 세 가지 다른 라이브러리로 구현하여 각각의 특징과 장단점을 비교합니다.

## 🎯 빠른 선택 가이드

어떤 라이브러리를 선택해야 할까요?

| 상황 | 추천 라이브러리 | 이유 |
|------|----------------|------|
| 프론트엔드 UI 상태 관리 | **XState** | React/Vue 통합, 상태 시각화 |
| 장기 실행 백엔드 AI 워크플로우 | **Mastra** | 상태 영속화, suspend/resume |
| LLM 에이전트 시스템 | **LangGraph** | 동적 라우팅, 도구 호출 |

## 📚 문서 구성

이 섹션은 세 가지 주제로 나뉩니다:

### 1️⃣ [주문 처리 워크플로우 비교](./docs/order-workflow.md)
동일한 주문 처리 흐름을 세 가지 라이브러리로 구현하며 기본 개념을 이해합니다.

**포함 내용:**
- 📊 라이브러리별 상세 비교
- 🔄 주문 처리 흐름 구현 방식
- 📋 비교표 및 선택 가이드
- 🏗️ 설계 철학 차이
- 🔍 구현 차이점 심층 분석

### 2️⃣ [LLM 챗봇 워크플로우 비교](./docs/llm-chatbot.md)
LLM API 호출과 재시도 로직을 각 라이브러리가 어떻게 처리하는지 비교합니다.

**포함 내용:**
- 🤖 LLM 재시도 전략 비교
  - XState: 상태 + after + guard
  - Mastra: Step 내부 while 루프 + Durable Execution
  - LangGraph: 조건부 엣지 (Conditional Edges)
- 📊 재시도 전략 비교표
- 💡 핵심 통찰 (패턴의 유사성, LLM 통합, 복잡도 트레이드오프)

### 3️⃣ [아키텍처 깊이 이해하기](./docs/architecture.md)
Pregel, Apache Beam 등 각 라이브러리의 기반 아키텍처를 상세히 알아봅니다.

**포함 내용:**
- 📖 Pregel & Apache Beam 이란?
- 🧬 Mastra와 XState의 관계
- 🔀 LangGraph의 독립적 설계
- 🎨 아키텍처 관계도
- 🔗 참고 자료

## 📊 비교 대상

1. **XState** - UI/애플리케이션 상태 관리
2. **Mastra Workflow** - AI 통합 비즈니스 워크플로우 (XState 기반)
3. **LangGraph** - LLM 기반 에이전트 워크플로우 (독립적 구현)

## 🚀 시작하기

### 준비 사항

- Node.js 20+
- pnpm

### 설치 및 빌드

```bash
# 프로젝트 루트에서 의존성 설치
pnpm install

# TypeScript 컴파일
pnpm -C 03-workflow-comparison run build
```

### 환경 변수 설정 (선택사항)

LLM 예제의 환경 변수 설정은 루트 README를 참고하세요:
`README.md#환경-변수-설정-선택사항`

## 📖 상세 문서

- 📄 [주문 처리 워크플로우 상세 비교](./docs/order-workflow.md)
- 📄 [LLM 챗봇 워크플로우 비교](./docs/llm-chatbot.md)
- 📄 [아키텍처 깊이 이해하기](./docs/architecture.md)

## 참고 사항

- Mastra는 `zod`를 peer dependency로 요구합니다.
- 결제 성공/실패는 랜덤이며 `src/*-workflow.ts` 상단 상수로 조정 가능합니다.
- `.env`에 `OPENAI_API_KEY`가 없으면 LLM 예제는 Mock 응답을 사용합니다.

## 다음 단계

**이 섹션에서 배운 것:**
- ✅ XState, Mastra, LangGraph의 철학적 차이
- ✅ Mastra는 XState 기반, LangGraph는 독립적 구현
- ✅ Pregel/Apache Beam 개념 이해
- ✅ 프로젝트별 최적 도구 선택 기준

**다음 섹션 미리보기:** [04-advanced-topics](../04-advanced-topics)

기본 FSM을 마스터했다면, 이제 실무 수준의 고급 패턴을 배울 차례입니다:
- 🎯 **계층적 상태 (Statecharts)**: 복잡한 시스템을 구조화하는 강력한 도구
- 💾 **상태 영속화**: 사용자 경험을 향상시키는 필수 기능
- 🧪 **테스트 전략**: FSM을 효과적으로 테스트하는 방법
- 🔧 **디버깅 도구**: XState DevTools 활용

이러한 고급 기법들은 프로덕션 환경에서 FSM을 성공적으로 사용하는 데 필수적입니다!
