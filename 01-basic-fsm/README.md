# 01. FSM 기본 개념

> 💡 **학습 목표**: FSM의 핵심 개념을 이해하고, TypeScript로 직접 구현해봅니다.

## 유한 상태 기계(Finite State Machine)란?

유한 상태 기계는 시스템이 가질 수 있는 **유한한 개수의 상태**와 그 상태들 간의 **전이(transition)** 규칙을 정의한 계산 모델입니다.

### 핵심 구성요소

1. **상태(States)**: 시스템이 가질 수 있는 유한한 상태들
2. **이벤트(Events)**: 상태 전이를 유발하는 신호
3. **전이(Transitions)**: 이벤트에 따른 상태 변화 규칙
4. **초기 상태(Initial State)**: 시스템의 시작 상태

## 왜 FSM을 사용하는가?

- **명확성**: 복잡한 상태 로직을 명확하게 표현
- **예측 가능성**: 모든 가능한 상태와 전이를 명시적으로 정의
- **디버깅 용이**: 상태 흐름을 추적하고 문제를 찾기 쉬움
- **테스트 용이**: 각 상태와 전이를 독립적으로 테스트 가능

## 실습 예제

### 1. Simple Toggle (간단한 토글 스위치)

가장 기본적인 FSM 예제입니다.

- **상태**: ON, OFF
- **이벤트**: TOGGLE
- **전이**: TOGGLE 이벤트 발생 시 상태 전환

```
OFF --[TOGGLE]--> ON
ON  --[TOGGLE]--> OFF
```

### 2. Traffic Light (신호등)

조금 더 복잡한 순환 FSM 예제입니다.

- **상태**: RED, YELLOW, GREEN
- **이벤트**: NEXT
- **전이**: RED → GREEN → YELLOW → RED (순환)

```
RED --[NEXT]--> GREEN --[NEXT]--> YELLOW --[NEXT]--> RED
```

## 예제 파일

- `src/simple-toggle.ts`: 토글 스위치 FSM
- `src/traffic-light.ts`: 신호등 FSM

## 실행 방법

### 옵션 1: 프로젝트 루트에서 실행 (권장)

```bash
# 프로젝트 루트에서 의존성 설치
pnpm install

# TypeScript 컴파일
pnpm -C 01-basic-fsm run build

# 토글 예제 실행
pnpm -C 01-basic-fsm run toggle

# 신호등 예제 실행
pnpm -C 01-basic-fsm run traffic
```

### 옵션 2: 현재 디렉토리에서 실행

```bash
# 01-basic-fsm 디렉토리로 이동
cd 01-basic-fsm

# TypeScript 컴파일
pnpm build

# 토글 예제 실행
pnpm toggle

# 신호등 예제 실행
pnpm traffic
```

## 실행 결과

### Toggle 예제 출력:
```
=== Simple Toggle FSM ===

Initial State: OFF
Event: TOGGLE -> New State: ON
Event: TOGGLE -> New State: OFF
Event: TOGGLE -> New State: ON

Final State: ON
```

### Traffic Light 예제 출력:
```
=== Traffic Light FSM ===

Initial State: RED (정지)

RED -> GREEN
Current State: GREEN (진행)

GREEN -> YELLOW
Current State: YELLOW (주의)

YELLOW -> RED
Current State: RED (정지)

RED -> GREEN
Current State: GREEN (진행)

GREEN -> YELLOW
Current State: YELLOW (주의)

YELLOW -> RED
Current State: RED (정지)
```

**관찰 포인트:**
- Toggle: ON/OFF 상태가 번갈아 전환됩니다
- Traffic Light: RED → GREEN → YELLOW → RED 순환 구조를 확인할 수 있습니다

## 다음 단계

**이 섹션에서 배운 것:**
- ✅ FSM의 핵심 구성요소 (상태, 이벤트, 전이)
- ✅ 클래스 기반 FSM 직접 구현
- ✅ 간단한 토글과 순환 상태 머신

**다음 섹션 미리보기:** [02-xstate-examples](../02-xstate-examples)

직접 구현한 FSM은 간단하지만 한계가 있습니다:
- 복잡한 상태 관리가 어려움
- 타입 안전성이 약함
- 디버깅 도구 부재
- 비동기 처리가 번거로움

다음 섹션에서는 **XState 라이브러리**를 사용하여 이러한 문제들을 해결하고, 실무에서 바로 사용할 수 있는 강력한 상태 머신을 구현합니다:
- 📊 비동기 데이터 페칭 with 재시도 로직
- 📝 폼 유효성 검사 with 에러 처리
- 🎨 Stately Studio로 상태 시각화
