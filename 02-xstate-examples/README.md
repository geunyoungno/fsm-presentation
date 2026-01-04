# 02. XState 예제

## XState란?

[XState](https://xstate.js.org/)는 JavaScript/TypeScript를 위한 강력한 상태 관리 라이브러리입니다. 유한 상태 기계(FSM)와 상태 차트(Statecharts)를 구현할 수 있으며, 복잡한 애플리케이션 로직을 명확하고 예측 가능하게 관리할 수 있습니다.

> 이 예제는 **XState v5** API 기준으로 작성되었습니다.

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

## 예제 파일

- `src/basic-machine.ts`: 토글/카운터 머신
- `src/form-validation.ts`: 폼 유효성 검사
- `src/fetch-example.ts`: 비동기 데이터 페칭

## 실행 방법

아래 명령은 **레포 루트**에서 실행한다고 가정합니다.

```bash
# 의존성 설치
pnpm install

# TypeScript 컴파일
pnpm -C 02-xstate-examples run build

# 기본 머신 실행
pnpm -C 02-xstate-examples run basic

# 폼 유효성 검사 실행
pnpm -C 02-xstate-examples run form

# 비동기 페칭 실행
pnpm -C 02-xstate-examples run fetch
```

## 예상 출력 (요약)

```
=== XState Basic Toggle Machine ===
Current State: inactive
```

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

다음 섹션([03-workflow-comparison](../03-workflow-comparison))에서는 XState를 Mastra Workflow, LangGraph와 비교하며 각 도구의 장단점을 살펴봅니다.
