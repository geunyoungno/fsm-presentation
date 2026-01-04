/**
 * XState를 사용한 비동기 데이터 페칭
 * Promise 기반 비동기 작업 처리 예제
 */

import { createMachine, createActor, fromPromise, assign } from 'xstate';

interface User {
  id: number;
  name: string;
  email: string;
}

interface FetchContext {
  data: User | null;
  error: string | null;
  retryCount: number;
}

const USER_ID = 1;
const FETCH_DELAY_MS = 1000;
const MAX_RETRIES = 3;
const SUCCESS_RATE = 0.7;

// 가짜 API 호출 함수 (성공/실패를 랜덤으로 시뮬레이션)
const fetchUser = async (userId: number): Promise<User> => {
  console.log(`🔄 Fetching user ${userId}...`);

  // 네트워크 지연 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, FETCH_DELAY_MS));

  // 30% 확률로 실패
  if (Math.random() > SUCCESS_RATE) {
    throw new Error('Network error');
  }

  return {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`
  };
};

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: {
    data: null,
    error: null,
    retryCount: 0
  } as FetchContext,
  states: {
    idle: {
      // 초기 상태: FETCH 이벤트가 들어오면 로딩으로 이동
      on: {
        FETCH: 'loading'
      }
    },
    loading: {
      invoke: {
        // fromPromise로 async 작업을 XState invoke로 연결
        src: fromPromise(async () => {
          return await fetchUser(USER_ID);
        }),
        onDone: {
          target: 'success',
          actions: assign({
            data: ({ event }) => event.output as User,
            error: null,
            retryCount: 0
          })
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
            retryCount: ({ context }) => context.retryCount + 1
          })
        }
      }
    },
    success: {
      // 성공 시 결과 출력, 필요하면 다시 FETCH 가능
      entry: ({ context }) => {
        console.log('✅ Success!');
        console.log(`User: ${context.data?.name} (${context.data?.email})`);
      },
      on: {
        FETCH: 'loading'
      }
    },
    failure: {
      // 실패 상태: RETRY 이벤트로 재시도하거나, 최대 횟수 초과 시 error로 이동
      entry: ({ context }) => {
        console.log(`❌ Error: ${context.error}`);
        console.log(`Retry count: ${context.retryCount}`);
      },
      on: {
        RETRY: [
          {
            guard: ({ context }) => context.retryCount < MAX_RETRIES,
            target: 'loading'
          },
          {
            target: 'error'
          }
        ],
        FETCH: 'loading'
      }
    },
    error: {
      // 재시도 한도 초과 시 최종 에러 상태
      entry: () => {
        console.log('🚫 Max retries exceeded. Please try again later.');
      },
      on: {
        FETCH: {
          target: 'loading',
          actions: assign({
            retryCount: 0,
            error: null
          })
        }
      }
    }
  }
});

console.log('=== XState Async Fetch Machine ===\n');

const fetchActor = createActor(fetchMachine);

// 상태 변화 로그
fetchActor.subscribe((state) => {
  console.log(`\n[State: ${state.value}]`);
});

fetchActor.start();

// 자동으로 재시도하는 함수: 현재 상태에 맞는 이벤트를 전송
const attemptFetch = () => {
  const currentState = fetchActor.getSnapshot();

  if (currentState.value === 'idle') {
    fetchActor.send({ type: 'FETCH' });
  } else if (currentState.value === 'failure') {
    setTimeout(() => {
      console.log('\n⏳ Retrying...');
      fetchActor.send({ type: 'RETRY' });
    }, 1000);
  } else if (currentState.value === 'error') {
    console.log('\n🔄 Starting fresh fetch...');
    fetchActor.send({ type: 'FETCH' });
  }
};

// 초기 페치
attemptFetch();

// 실패 시 자동 재시도
fetchActor.subscribe((state) => {
  if (state.value === 'failure') {
    attemptFetch();
  } else if (state.value === 'success') {
    // 성공 후 5초 뒤 종료
    setTimeout(() => {
      console.log('\n👋 Demo completed!');
      fetchActor.stop();
    }, 2000);
  }
});
