/**
 * XState로 LLM 호출하기
 *
 * 핵심 통찰: LLM 호출도 일반적인 비동기 작업과 동일한 패턴!
 * fetch-example.ts와 비교하면서 학습하세요.
 */

import { createMachine, createActor, assign, fromPromise } from 'xstate';
import { loadEnv, isOpenAIAvailable } from './env.js';
import { callOpenAI } from './openai-client.js';

// 환경 변수 로드
const env = loadEnv();

const LLM_CALL_DELAY_MS = 1000;
const MAX_LLM_RETRIES = 3;
const LLM_SUCCESS_RATE = 0.9;
const RETRY_DELAY_MS = 1500;

interface ChatContext {
  message: string;
  response: string | null;
  error: string | null;
  retryCount: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

type ChatEvent =
  | { type: 'SEND_MESSAGE'; message: string }
  | { type: 'RETRY' };

/**
 * Mock LLM 응답 생성
 */
const callLLMMock = async (message: string): Promise<string> => {
  // API 호출 시뮬레이션 (1초 지연)
  await new Promise(resolve => setTimeout(resolve, LLM_CALL_DELAY_MS));

  // 실패 확률 시뮬레이션 (실제 LLM API 에러 시뮬레이션)
  if (Math.random() > LLM_SUCCESS_RATE) {
    throw new Error('LLM API 호출 실패: 타임아웃');
  }

  // 간단한 응답 생성
  const responses: Record<string, string> = {
    'hello': '안녕하세요! 무엇을 도와드릴까요?',
    'fsm': 'FSM(Finite State Machine)은 유한한 개수의 상태로 시스템을 모델링하는 방법입니다.',
    'typescript': 'TypeScript는 JavaScript에 타입 시스템을 추가한 언어입니다.',
    'default': `"${message}"에 대한 응답입니다. 더 구체적인 질문을 해주세요.`
  };

  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      return value;
    }
  }

  return responses['default'];
};

/**
 * LLM 호출 (환경 변수에 따라 실제 API 또는 Mock 사용)
 *
 * OPENAI_API_KEY가 설정되어 있으면 실제 OpenAI API를 호출하고,
 * 없으면 Mock 응답을 반환합니다.
 */
const callLLM = async (
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  if (isOpenAIAvailable()) {
    // 실제 OpenAI API 호출
    return await callOpenAI(conversationHistory, env.OPENAI_MODEL || 'gpt-4o-mini');
  } else {
    // Mock 응답 반환
    const lastMessage = conversationHistory
      .filter(entry => entry.role === 'user')
      .pop()?.content || '';
    return await callLLMMock(lastMessage);
  }
};

const chatMachine = createMachine({
  id: 'chat',
  types: {} as {
    context: ChatContext;
    events: ChatEvent;
  },
  initial: 'idle',
  context: {
    message: '',
    response: null,
    error: null,
    retryCount: 0,
    conversationHistory: []
  },
  states: {
    idle: {
      entry: () => console.log('💬 [Idle] 메시지 입력 대기 중...'),
      on: {
        SEND_MESSAGE: {
          target: 'calling_llm',
          actions: assign({
            message: ({ event }) => event.message,
            response: null,
            error: null,
            retryCount: 0,
            conversationHistory: ({ context, event }) => [
              ...context.conversationHistory,
              { role: 'user' as const, content: event.message }
            ]
          })
        }
      }
    },
    calling_llm: {
      entry: () => console.log('🤖 [Calling LLM] LLM 호출 중...'),
      /**
       * 핵심 패턴: invoke + fromPromise
       *
       * ✨ fetch-example.ts와 비교:
       *
       * fetch-example.ts:
       *   invoke: {
       *     src: fromPromise(async () => {
       *       return await fetch('/api/users/1');
       *     })
       *   }
       *
       * llm-chat.ts (현재 파일):
       *   invoke: {
       *     src: fromPromise(async () => {
       *       return await callLLMSimulated(message);
       *     })
       *   }
       *
       * → 완전히 동일한 패턴!
       * XState는 "무엇을 호출하는가"에 무관심합니다.
       * REST API든 LLM API든 모두 동일하게 처리합니다.
       */
      invoke: {
        src: fromPromise(async ({ input }: { input: ChatContext }) => {
          return await callLLM(input.conversationHistory);
        }),
        input: ({ context }) => context,
        onDone: {
          target: 'success',
          actions: assign({
            response: ({ event }) => event.output,
            conversationHistory: ({ context, event }) => [
              ...context.conversationHistory,
              { role: 'assistant' as const, content: event.output }
            ]
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error)
          })
        }
      }
    },
    success: {
      entry: ({ context }) => {
        console.log('✅ [Success] LLM 응답 수신');
        console.log(`\n사용자: ${context.message}`);
        console.log(`LLM: ${context.response}\n`);
      },
      on: {
        SEND_MESSAGE: {
          target: 'calling_llm',
          actions: assign({
            message: ({ event }) => event.message,
            response: null,
            error: null,
            conversationHistory: ({ context, event }) => [
              ...context.conversationHistory,
              { role: 'user' as const, content: event.message }
            ]
          })
        }
      }
    },
    error: {
      entry: ({ context }) => {
        console.log(`❌ [Error] LLM 호출 실패: ${context.error}`);
        console.log(`재시도 횟수: ${context.retryCount}/${MAX_LLM_RETRIES}`);
      },
      /**
       * LLM 재시도 로직
       *
       * LLM API 호출은 다양한 이유로 실패할 수 있습니다:
       * - 네트워크 타임아웃
       * - API 요율 제한 (Rate Limit)
       * - 서버 과부하
       *
       * XState의 guard를 사용하여 재시도 조건을 명확히 정의합니다.
       */
      after: {
        [RETRY_DELAY_MS]: [
          {
            guard: ({ context }) => context.retryCount < MAX_LLM_RETRIES,
            target: 'calling_llm',
            actions: [
              assign({
                retryCount: ({ context }) => context.retryCount + 1,
                error: null
              }),
              () => console.log('🔄 재시도 중...')
            ]
          },
          {
            target: 'failed'
          }
        ]
      },
      on: {
        RETRY: {
          target: 'calling_llm',
          actions: assign({
            retryCount: ({ context }) => context.retryCount + 1,
            error: null
          })
        }
      }
    },
    failed: {
      entry: () => console.log('🚫 [Failed] 최대 재시도 횟수 초과 - 서비스를 사용할 수 없습니다.'),
      type: 'final'
    }
  }
});

// 실행
console.log('=== XState LLM Chat Example ===\n');
console.log('💡 핵심: LLM 호출도 일반 비동기 작업과 동일한 패턴으로 처리됩니다.\n');
console.log('📝 fetch-example.ts와 비교해보세요!\n');

const chatActor = createActor(chatMachine);

chatActor.subscribe((state) => {
  console.log(`현재 상태: ${state.value}`);
});

chatActor.start();

// 대화 시뮬레이션
setTimeout(() => {
  chatActor.send({
    type: 'SEND_MESSAGE',
    message: 'FSM이 뭐야?'
  });
}, 1000);

// 첫 번째 응답을 기다린 후 두 번째 질문
setTimeout(() => {
  chatActor.send({
    type: 'SEND_MESSAGE',
    message: 'TypeScript에 대해 알려줘'
  });
}, 10000); // 10초로 증가

// 프로그램 종료
setTimeout(() => {
  console.log('\n✨ 대화 완료\n');
  chatActor.stop();
  process.exit(0);
}, 20000); // 20초로 증가
