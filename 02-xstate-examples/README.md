# 02. XState 예제

> 💡 **학습 목표**: XState를 사용하여 실무 수준의 상태 머신을 구현합니다.

> **이전 섹션 복습:** [01-basic-fsm](../01-basic-fsm)에서 FSM의 기본 개념과 직접 구현 방법을 배웠습니다.

## XState란?

[XState](https://xstate.js.org/)는 JavaScript/TypeScript를 위한 강력한 상태 관리 라이브러리입니다. 유한 상태 기계(FSM)와 상태 차트(Statecharts)를 구현할 수 있으며, 복잡한 애플리케이션 로직을 명확하고 예측 가능하게 관리할 수 있습니다.

> 이 예제는 **XState v5** API 기준으로 작성되었습니다.

**Actor 기반 실행 모델 (XState v5):**
- 머신(machine)은 **정의**이고, 실제 실행은 actor가 담당
- 이벤트는 actor에 `send`, 상태는 `subscribe`/`getSnapshot`으로 확인
- 필요 시 actor 내부에서 다른 actor를 spawn하여 병렬 작업 구성 가능

### XState의 주요 특징

- ✅ **타입 안전성**: TypeScript 완벽 지원
- 🎨 **시각화**: [Stately Studio](https://stately.ai/studio)로 상태 머신 시각화
- 🔄 **비동기 처리**: Promise, Observable 등 비동기 작업 지원
- 🧪 **테스트 용이**: 각 상태와 전이를 독립적으로 테스트 가능
- 📦 **프레임워크 독립적**: React, Vue, Svelte 등 어디서나 사용 가능

## 실습 예제

### 1. Basic Machine (기본 머신)

XState의 기본 사용법을 배웁니다.

**주요 개념:**
- `createMachine()`: 상태 머신 정의
- `createActor()`: 머신 인스턴스 생성
- `context`: 상태 머신의 데이터
- `actions`: 상태 전이 시 실행되는 함수

**예제:**
- 간단한 토글 머신
- Context를 활용한 카운터 머신

### 2. Form Validation (폼 유효성 검사)

실제 UI에서 자주 사용하는 폼 유효성 검사를 XState로 구현합니다.

**상태 흐름:**
```
editing → validating → submitting → success
                ↓
              error → editing
```

**주요 기능:**
- 입력 값 검증
- 에러 메시지 관리
- 조건부 상태 전이
- 폼 초기화

### 3. Fetch Example (비동기 데이터 페칭)

Promise 기반의 비동기 작업을 XState로 처리합니다.

**상태 흐름:**
```
idle → loading → success
          ↓
       failure → (retry) → loading
          ↓
       error (max retries)
```

**주요 기능:**
- `invoke`: 비동기 작업 실행
- `fromPromise`: Promise를 XState와 통합
- 재시도 로직
- 에러 처리

### 4. LLM Chat (🆕 LLM 호출)

**💡 핵심 통찰: LLM 호출도 일반 비동기 작업과 동일한 패턴!**

REST API 호출 (fetch-example.ts)과 LLM API 호출 (llm-chat.ts)이 XState에서 어떻게 동일하게 처리되는지 보여줍니다.

**상태 흐름:**
```
idle → calling_llm → success
          ↓
       error → (retry) → calling_llm
          ↓
       failed (max retries)
```

**fetch-example.ts vs llm-chat.ts 비교:**

| 측면 | REST API | LLM API |
|------|----------|---------|
| **호출 방식** | `fetch('/api/users/1')` | `openai.chat.completions.create()` |
| **XState 패턴** | `invoke` + `fromPromise` | `invoke` + `fromPromise` (동일!) |
| **성공 처리** | `onDone` → 데이터 저장 | `onDone` → 응답 저장 |
| **에러 처리** | `onError` → 재시도 | `onError` → 재시도 (동일!) |
| **재시도 로직** | guard로 조건 확인 | guard로 조건 확인 (동일!) |

**핵심 메시지:**
```typescript
// 패턴 1: REST API
invoke: {
  src: fromPromise(async () => fetch('/api/users/1'))
}

// 패턴 2: LLM API
invoke: {
  src: fromPromise(async () => openai.chat.completions.create({...}))
}
```
**→ 완전히 동일한 패턴입니다!** XState는 "무엇을 호출하는가"에 무관심합니다.

**주요 기능:**
- LLM API 호출 시뮬레이션
- 재시도 로직 (LLM 특화 에러 처리)
- 대화형 인터페이스
- 타임아웃 및 에러 핸들링

**실무 팁:**
- LLM API는 REST API보다 실패율이 높습니다 (Rate Limit, 서버 과부하 등)
- 재시도 전략이 필수적입니다
- XState의 guard와 after를 사용하여 지수 백오프(Exponential Backoff) 구현 가능

## 예제 파일

- `src/basic-machine.ts`: 토글/카운터 머신
- `src/form-validation.ts`: 폼 유효성 검사
- `src/fetch-example.ts`: 비동기 데이터 페칭 (REST API)
- `src/llm-chat.ts`: 🆕 LLM 호출 (LLM API)

## 실행 방법

### 옵션 1: 프로젝트 루트에서 실행 (권장)

```bash
# 프로젝트 루트에서 의존성 설치
pnpm install

# TypeScript 컴파일
pnpm -C 02-xstate-examples run build

# 기본 머신 실행
pnpm -C 02-xstate-examples run basic

# 폼 유효성 검사 실행
pnpm -C 02-xstate-examples run form

# 비동기 페칭 실행
pnpm -C 02-xstate-examples run fetch

# 🆕 LLM 채팅 실행
pnpm -C 02-xstate-examples run llm
```

### 옵션 2: 현재 디렉토리에서 실행

```bash
# 02-xstate-examples 디렉토리로 이동
cd 02-xstate-examples

# TypeScript 컴파일
pnpm build

# 기본 머신 실행
pnpm basic

# 폼 유효성 검사 실행
pnpm form

# 비동기 페칭 실행
pnpm fetch

# 🆕 LLM 채팅 실행
pnpm llm
```

### 환경 변수 설정 (선택사항)

LLM 예제는 `.env` 파일의 `OPENAI_API_KEY` 설정 여부에 따라 다르게 동작합니다:

- ✅ **OPENAI_API_KEY 있음**: 실제 OpenAI API 호출
- 🎭 **OPENAI_API_KEY 없음**: Mock 응답 사용 (자동)

자세한 설정 방법은 [프로젝트 루트 README](../README.md#환경-변수-설정-선택사항)를 참고하세요.

## 실행 결과

### Basic Machine 예제 출력:
```
=== XState Basic Toggle Machine ===

Current State: inactive

Sending TOGGLE events:

Current State: active
Current State: inactive
Current State: active


=== XState Counter Machine (with Context) ===

Count: 0

Performing operations:

Count: 1
Count: 2
Count: 3
Count: 2
Count: 0
```

**관찰 포인트:**
- **Toggle Machine**: 상태 구독(subscribe)을 통해 모든 상태 변화를 실시간으로 추적합니다
- **Counter Machine**: Context를 사용하여 카운트 값을 관리하며, INCREMENT/DECREMENT/RESET 이벤트로 값을 조작합니다

## XState vs 직접 구현

| 항목 | 직접 구현 | XState |
|------|----------|--------|
| 코드 복잡도 | 높음 | 낮음 |
| 상태 관리 | if/switch 문 | 선언적 정의 |
| 디버깅 | 어려움 | 쉬움 (시각화 가능) |
| 테스트 | 복잡 | 간단 |
| 타입 안전성 | 수동 관리 | 자동 추론 |

## 시각화 도구

XState는 [Stately Studio](https://stately.ai/studio)에서 상태 머신을 시각적으로 편집하고 테스트할 수 있습니다.

```bash
# 프로젝트에 시각화 도구 추가 (선택사항)
pnpm add @statelyai/inspect
```

## 다음 단계

**이 섹션에서 배운 것:**
- ✅ XState의 기본 사용법 (createMachine, createActor)
- ✅ Context를 활용한 데이터 관리
- ✅ Guard와 Actions를 이용한 조건부 로직
- ✅ Promise 기반 비동기 작업 처리

**다음 섹션 미리보기:** [03-workflow-comparison](../03-workflow-comparison)

XState는 강력하지만 유일한 선택지는 아닙니다. 실무에서는 다양한 워크플로우 라이브러리가 사용됩니다:
- **Mastra Workflow**: XState 기반, AI 통합에 특화
- **LangGraph**: LLM 에이전트에 최적화

다음 섹션에서는 동일한 주문 처리 워크플로우를 세 가지 라이브러리로 구현하며:
- 🔍 각 라이브러리의 철학적 차이 이해
- 🎯 프로젝트에 맞는 도구 선택 기준 학습
- 📊 아키텍처 관계도로 명확한 비교
