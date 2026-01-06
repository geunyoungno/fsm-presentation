/**
 * XState를 사용한 LLM 챗봇 워크플로우
 * 상태 머신의 명확한 상태 전이와 타입 안전성 강조
 */

import { createMachine, createActor, assign, fromPromise } from 'xstate';
import { loadEnv, isOpenAIAvailable, callOpenAI } from './env.js';

// 환경 변수 로드
const env = loadEnv();

// 상수 정의
const LLM_CALL_DELAY_MS = 1000;
const MAX_LLM_RETRIES = 3;
const LLM_SUCCESS_RATE = 0.8; // 80% 성공률 (Mock 전용)
const RETRY_DELAY_MS = 1500;

interface ChatContext {
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentResponse: string | null;
  error: string | null;
  retryCount: number;
}

type ChatEvent =
  | { type: 'SEND_MESSAGE'; message: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };

/**
 * Mock LLM 응답 생성
 */
const callLLMMock = async (
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  console.log('🤖 [Calling LLM Mock] Mock API 호출 중...');
  await new Promise(resolve => setTimeout(resolve, LLM_CALL_DELAY_MS));

  // 실패 시뮬레이션
  if (Math.random() > LLM_SUCCESS_RATE) {
    throw new Error('LLM API 호출 실패: Rate limit exceeded');
  }

  // 마지막 사용자 메시지에 대한 응답 생성
  const lastUserMessage = conversationHistory
    .filter(msg => msg.role === 'user')
    .pop()?.content || '';

  const responses: Record<string, string> = {
    'hello': '안녕하세요! 무엇을 도와드릴까요?',
    'fsm': 'FSM(Finite State Machine)은 시스템을 명확한 상태들과 그들 간의 전이로 모델링하는 방법입니다. 예측 가능하고 테스트하기 쉬운 코드를 작성할 수 있습니다.',
    'xstate': 'XState는 JavaScript/TypeScript를 위한 강력한 상태 머신 라이브러리입니다. 타입 안전성과 시각화 도구를 제공하며, 복잡한 워크플로우를 명확하게 관리할 수 있습니다.',
    'workflow': '워크플로우는 작업의 순서와 조건을 정의한 것입니다. XState, Mastra, LangGraph 같은 도구들이 각각 다른 철학으로 워크플로우를 지원합니다.',
    'default': `"${lastUserMessage}"에 대한 질문이군요. 구체적으로 어떤 부분이 궁금하신가요?`
  };

  const lowerMessage = lastUserMessage.toLowerCase();
  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      return value;
    }
  }

  return responses['default'];
};

/**
 * LLM 호출 (환경 변수에 따라 실제 API 또는 Mock 사용)
 */
const callLLM = async (
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  if (isOpenAIAvailable()) {
    // 실제 OpenAI API 호출
    return await callOpenAI(conversationHistory, env.OPENAI_MODEL || 'gpt-4o-mini');
  } else {
    // Mock 응답 반환
    return await callLLMMock(conversationHistory);
  }
};

/**
 * XState 챗봇 머신
 *
 * 상태 흐름:
 * waiting_input → validating → calling_llm → response_ready
 *                                    ↓
 *                                  error → (재시도 or 실패)
 */
const chatbotMachine = createMachine({
  id: 'chatbot',
  types: {} as {
    context: ChatContext;
    events: ChatEvent;
  },
  initial: 'waiting_input',
  context: {
    userMessage: '',
    conversationHistory: [],
    currentResponse: null,
    error: null,
    retryCount: 0
  },
  states: {
    waiting_input: {
      entry: () => console.log('💬 [Waiting Input] 사용자 입력 대기 중...'),
      on: {
        SEND_MESSAGE: {
          target: 'validating',
          actions: assign({
            userMessage: ({ event }) => event.message,
            error: null,
            retryCount: 0
          })
        }
      }
    },
    validating: {
      entry: ({ context }) => console.log(`🔍 [Validating] 입력 검증 중: "${context.userMessage}"`),
      /**
       * XState의 강점: always 전이로 동기 검증 로직을 명확하게 표현
       *
       * - 입력이 비어있으면 즉시 waiting_input으로 복귀
       * - 유효하면 calling_llm으로 진행
       */
      always: [
        {
          guard: ({ context }) => context.userMessage.trim().length === 0,
          target: 'waiting_input',
          actions: () => console.log('⚠️ [Validation Failed] 빈 메시지는 처리할 수 없습니다')
        },
        {
          target: 'calling_llm'
        }
      ]
    },
    calling_llm: {
      entry: () => console.log('🚀 [Calling LLM] LLM 호출 시작'),
      /**
       * XState 패턴: invoke + fromPromise
       *
       * 핵심 통찰:
       * - 02-xstate-examples/llm-chat.ts와 동일한 패턴
       * - 비동기 작업(LLM API)을 상태 머신에서 관리
       * - onDone: 성공 시 다음 상태로 전이
       * - onError: 실패 시 에러 처리 상태로 전이
       */
      invoke: {
        src: fromPromise(async ({ input }: { input: ChatContext }) => {
          // 대화 히스토리에 현재 사용자 메시지 추가
          const updatedHistory = [
            ...input.conversationHistory,
            { role: 'user' as const, content: input.userMessage }
          ];
          const response = await callLLM(updatedHistory);
          return { response, updatedHistory };
        }),
        input: ({ context }) => context,
        onDone: {
          target: 'response_ready',
          actions: assign({
            currentResponse: ({ event }) => event.output.response,
            conversationHistory: ({ event }) => [
              ...event.output.updatedHistory,
              { role: 'assistant' as const, content: event.output.response }
            ]
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) =>
              event.error instanceof Error ? event.error.message : String(event.error)
          })
        }
      }
    },
    response_ready: {
      entry: ({ context }) => {
        console.log('✅ [Response Ready] LLM 응답 수신');
        console.log(`\n사용자: ${context.userMessage}`);
        console.log(`봇: ${context.currentResponse}\n`);
      },
      on: {
        SEND_MESSAGE: {
          target: 'validating',
          actions: assign({
            userMessage: ({ event }) => event.message,
            currentResponse: null,
            error: null,
            retryCount: 0
          })
        },
        RESET: {
          target: 'waiting_input',
          actions: assign({
            userMessage: '',
            conversationHistory: [],
            currentResponse: null,
            error: null,
            retryCount: 0
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
       * XState 재시도 전략: after + guard
       *
       * 장점:
       * - 재시도 로직이 상태 머신에 명시적으로 표현됨
       * - 시각화 도구에서 재시도 경로를 볼 수 있음
       * - 테스트하기 쉬움 (각 경로를 독립적으로 테스트 가능)
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
              ({ context }) => console.log(`🔄 [Retry ${context.retryCount + 1}] 재시도 중...`)
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
      entry: () => {
        console.log('🚫 [Failed] 최대 재시도 횟수 초과');
        console.log('시스템을 재시작하거나 나중에 다시 시도해주세요.');
      },
      on: {
        RESET: {
          target: 'waiting_input',
          actions: assign({
            userMessage: '',
            conversationHistory: [],
            currentResponse: null,
            error: null,
            retryCount: 0
          })
        }
      },
      type: 'final'
    }
  }
});

// 실행
async function runXStateChatbot() {
  console.log('=== XState Chatbot Workflow ===\n');
  console.log('특징: 명확한 상태 전이, 타입 안전성, 시각화 가능\n');

  const chatActor = createActor(chatbotMachine);

  chatActor.subscribe((state) => {
    console.log(`[상태 변경] ${state.value}`);
  });

  chatActor.start();

  // 시뮬레이션: 3개의 대화
  const messages = [
    'Hello!',
    'FSM에 대해 알려줘',
    'XState는 어떤 장점이 있어?'
  ];

  for (let i = 0; i < messages.length; i++) {
    await new Promise(resolve => setTimeout(resolve, i * 3000));
    chatActor.send({ type: 'SEND_MESSAGE', message: messages[i] });
  }

  // 종료
  setTimeout(() => {
    console.log('\n✨ XState 챗봇 워크플로우 완료\n');
    chatActor.stop();
    process.exit(0);
  }, 10000);
}

runXStateChatbot();
