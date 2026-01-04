/**
 * XState 기본 사용법
 * 토글 머신을 XState로 구현
 */

import { createMachine, createActor, assign } from 'xstate';

// 토글 머신 정의
const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  states: {
    inactive: {
      on: {
        TOGGLE: 'active'
      }
    },
    active: {
      on: {
        TOGGLE: 'inactive'
      }
    }
  }
});

console.log('=== XState Basic Toggle Machine ===\n');

// Actor 생성 및 실행 (XState v5에서는 Actor가 실행 주체)
const toggleActor = createActor(toggleMachine);

// 상태 변경 구독: 상태 전이가 발생할 때마다 콜백 실행
toggleActor.subscribe((state) => {
  console.log(`Current State: ${state.value}`);
});

toggleActor.start();

// 이벤트 전송: TOGGLE 이벤트를 연속으로 보내 상태 전이를 확인
console.log('\nSending TOGGLE events:\n');
toggleActor.send({ type: 'TOGGLE' });
toggleActor.send({ type: 'TOGGLE' });
toggleActor.send({ type: 'TOGGLE' });

toggleActor.stop();

// ===== 조금 더 복잡한 예제: 카운터 머신 =====

interface CounterContext {
  count: number;
}

type CounterEvent =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET' };

// Context/Events 타입을 명시하면 액션에서 타입 안전성을 유지할 수 있음
const counterMachine = createMachine({
  id: 'counter',
  types: {} as {
    context: CounterContext;
    events: CounterEvent;
  },
  initial: 'active',
  context: {
    count: 0
  },
  states: {
    active: {
      on: {
        INCREMENT: {
          // assign을 사용해 새로운 context를 반환하는 방식이 권장됨
          actions: assign({
            count: ({ context }) => context.count + 1
          })
        },
        DECREMENT: {
          actions: assign({
            count: ({ context }) => context.count - 1
          })
        },
        RESET: {
          actions: assign({
            count: 0
          })
        }
      }
    }
  }
});

console.log('\n\n=== XState Counter Machine (with Context) ===\n');

const counterActor = createActor(counterMachine);

// context 변화 확인용 구독
counterActor.subscribe((state) => {
  console.log(`Count: ${state.context.count}`);
});

counterActor.start();

// 이벤트 시퀀스를 통해 count 변화 확인
console.log('\nPerforming operations:\n');
counterActor.send({ type: 'INCREMENT' });
counterActor.send({ type: 'INCREMENT' });
counterActor.send({ type: 'INCREMENT' });
counterActor.send({ type: 'DECREMENT' });
counterActor.send({ type: 'RESET' });

counterActor.stop();
