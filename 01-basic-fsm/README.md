# 01. FSM 기본 개념

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

아래 명령은 **레포 루트**에서 실행한다고 가정합니다.

```bash
# 의존성 설치
pnpm install

# TypeScript 컴파일
pnpm -C 01-basic-fsm run build

# 토글 예제 실행
pnpm -C 01-basic-fsm run toggle

# 신호등 예제 실행
pnpm -C 01-basic-fsm run traffic
```

## 예상 출력 (요약)

```
=== Simple Toggle FSM ===
Initial State: OFF
Event: TOGGLE -> New State: ON
```

## 다음 단계

다음 섹션([02-xstate-examples](../02-xstate-examples))에서는 XState 라이브러리를 사용하여 더 강력하고 실용적인 FSM을 구현하는 방법을 배웁니다.
