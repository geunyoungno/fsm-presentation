/**
 * Mastra를 사용한 LLM 챗봇 워크플로우
 * AI 통합과 데이터 파이프라인 강조
 */

import { createStep, createWorkflow } from '@mastra/core';
import { z } from 'zod';
import { loadEnv, isOpenAIAvailable, callOpenAI } from './env.js';

// 환경 변수 로드
const env = loadEnv();

// 상수 정의
const LLM_CALL_DELAY_MS = 1000;
const MAX_LLM_RETRIES = 3;
const LLM_SUCCESS_RATE = 0.8; // Mock 전용
const VALIDATION_DELAY_MS = 300;

// 대화 메시지 스키마
const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string()
});

// 챗봇 상태 스키마
const chatStateSchema = z.object({
  userMessage: z.string(),
  conversationHistory: z.array(messageSchema),
  currentResponse: z.string().nullable(),
  retryCount: z.number(),
  status: z.enum(['waiting', 'validating', 'processing', 'success', 'failed'])
});

type ChatState = z.infer<typeof chatStateSchema>;
type ChatInput = Partial<ChatState>;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock LLM 응답 생성
 */
const callLLMMock = async (
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  console.log('🤖 [Calling LLM Mock] Mock API 호출 중...');
  await delay(LLM_CALL_DELAY_MS);

  if (Math.random() > LLM_SUCCESS_RATE) {
    throw new Error('LLM API 호출 실패: Rate limit exceeded');
  }

  const lastUserMessage = conversationHistory
    .filter(msg => msg.role === 'user')
    .pop()?.content || '';

  const responses: Record<string, string> = {
    'hello': '안녕하세요! 무엇을 도와드릴까요?',
    'fsm': 'FSM(Finite State Machine)은 시스템을 명확한 상태들과 그들 간의 전이로 모델링하는 방법입니다.',
    'mastra': 'Mastra는 AI 통합과 복잡한 데이터 파이프라인에 최적화된 워크플로우 프레임워크입니다. Zod를 사용한 강력한 타입 검증과 40개 이상의 LLM 제공자를 지원합니다.',
    'workflow': 'Mastra 워크플로우는 Step을 체이닝하여 데이터를 변환하는 파이프라인 방식입니다. 각 Step은 inputSchema와 outputSchema로 타입 안전성을 보장합니다.',
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
 * Step 1: 입력 검증
 *
 * Mastra의 강점: Zod 스키마를 활용한 런타임 타입 검증
 * - 빈 메시지나 잘못된 형식을 사전에 차단
 * - inputSchema와 outputSchema가 데이터 계약(contract) 역할
 */
const validateInput = createStep({
  id: 'validate-input',
  inputSchema: chatStateSchema.partial(),
  outputSchema: chatStateSchema,
  execute: async ({ inputData }) => {
    const input = inputData as ChatInput;
    console.log('🔍 [Validating] 입력 검증 중...');
    await delay(VALIDATION_DELAY_MS);

    const userMessage = input.userMessage?.trim() || '';

    if (userMessage.length === 0) {
      console.log('⚠️ [Validation Failed] 빈 메시지는 처리할 수 없습니다');
      return {
        userMessage: '',
        conversationHistory: input.conversationHistory || [],
        currentResponse: null,
        retryCount: 0,
        status: 'failed'
      } satisfies ChatState;
    }

    console.log(`✅ [Validation Success] 메시지: "${userMessage}"`);
    return {
      userMessage,
      conversationHistory: input.conversationHistory || [],
      currentResponse: null,
      retryCount: input.retryCount || 0,
      status: 'validating'
    } satisfies ChatState;
  }
});

/**
 * Step 2: LLM 호출 (재시도 로직 포함)
 *
 * Mastra의 재시도 전략: Step 내부에서 while 루프 사용
 *
 * 장점:
 * - Step이 독립적으로 재시도 로직을 완전히 제어
 * - AI 작업(LLM 호출)의 재시도에 특히 적합
 * - 워크플로우 그래프는 단순하게 유지 (재시도는 Step의 내부 구현)
 *
 * 동작 방식:
 * 1. 성공하거나 최대 재시도 횟수에 도달할 때까지 반복
 * 2. 각 시도마다 LLM API 호출
 * 3. 성공 시 즉시 break, 실패 시 retryCount 증가
 */
const callLLMStep = createStep({
  id: 'call-llm',
  inputSchema: chatStateSchema,
  outputSchema: chatStateSchema,
  execute: async ({ inputData }) => {
    let state: ChatState = { ...inputData };

    // 검증 실패 시 그대로 반환
    if (state.status === 'failed') {
      return state;
    }

    state.status = 'processing';
    let success = false;

    /**
     * 재시도 루프
     *
     * - LLM API는 일시적 장애가 빈번함 (Rate Limit, Timeout 등)
     * - 재시도를 통해 성공률을 크게 높일 수 있음
     * - 각 시도를 명시적으로 로깅하여 디버깅 용이
     */
    while (!success && state.retryCount < MAX_LLM_RETRIES) {
      const attempt = state.retryCount + 1;

      try {
        console.log(`💳 [LLM Call] 시도 ${attempt}/${MAX_LLM_RETRIES}`);

        // 대화 히스토리에 사용자 메시지 추가
        const updatedHistory = [
          ...state.conversationHistory,
          { role: 'user' as const, content: state.userMessage }
        ];

        // LLM 호출
        const response = await callLLM(updatedHistory);

        // 성공: 응답과 히스토리 업데이트
        console.log('💰 [LLM Success] 응답 생성 완료');
        state = {
          ...state,
          currentResponse: response,
          conversationHistory: [
            ...updatedHistory,
            { role: 'assistant' as const, content: response }
          ],
          status: 'success'
        };
        success = true;
      } catch (error) {
        console.log(`❌ [LLM Failed] ${error instanceof Error ? error.message : String(error)}`);
        state = {
          ...state,
          retryCount: attempt
        };

        if (attempt < MAX_LLM_RETRIES) {
          console.log(`🔄 [Retry ${attempt}] 재시도 준비...`);
          await delay(1500); // 재시도 전 대기
        }
      }
    }

    // 최대 재시도 횟수 초과
    if (!success) {
      console.log('🚫 [LLM Failed] 최대 재시도 횟수 초과');
      state = {
        ...state,
        status: 'failed'
      };
    }

    return state;
  }
});

/**
 * Step 3: 응답 출력
 *
 * Mastra의 파이프라인 철학:
 * - 각 Step은 단일 책임 (SRP: Single Responsibility Principle)
 * - 데이터 변환과 부수 효과(로깅)를 분리
 */
const displayResponse = createStep({
  id: 'display-response',
  inputSchema: chatStateSchema,
  outputSchema: chatStateSchema,
  execute: async ({ inputData }) => {
    const state = inputData;

    if (state.status === 'success' && state.currentResponse) {
      console.log('\n✅ [Response Ready] 응답 준비 완료');
      console.log(`사용자: ${state.userMessage}`);
      console.log(`봇: ${state.currentResponse}\n`);
    } else if (state.status === 'failed') {
      console.log('\n⚠️ [Error] 응답을 생성할 수 없습니다\n');
    }

    return state;
  }
});

/**
 * Mastra 워크플로우 구성
 *
 * 특징:
 * - then() 체이닝으로 선형적인 파이프라인 구성
 * - 각 Step의 outputSchema가 다음 Step의 inputSchema와 호환되어야 함
 * - commit()으로 워크플로우 최종 확정
 */
const chatWorkflow = createWorkflow({
  id: 'chatbot-workflow',
  inputSchema: chatStateSchema.partial(),
  outputSchema: chatStateSchema
})
  .then(validateInput)
  .then(callLLMStep)
  .then(displayResponse)
  .commit();

// 실행
async function runMastraChatbot() {
  console.log('=== Mastra Chatbot Workflow ===\n');
  console.log('특징: AI 통합, 데이터 파이프라인, Zod 타입 검증\n');

  const messages = [
    'Hello!',
    'FSM에 대해 알려줘',
    'Mastra의 장점은 뭐야?'
  ];
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const message of messages) {
    console.log(`\n--- 새로운 메시지 처리: "${message}" ---\n`);

    try {
      const run = await chatWorkflow.createRunAsync();
      const result = await run.start({
        inputData: {
          userMessage: message,
          conversationHistory,
          retryCount: 0
        }
      });

      if (result.status === 'success') {
        console.log('--- 대화 히스토리 ---');
        result.result.conversationHistory.forEach((msg, idx) => {
          console.log(`${idx + 1}. [${msg.role}] ${msg.content}`);
        });
        conversationHistory = result.result.conversationHistory;
      } else if (result.status === 'failed') {
        console.error('워크플로우 실행 실패:', result.error);
      }
    } catch (error) {
      console.error('워크플로우 실행 중 오류:', error);
    }

    // 다음 메시지 전 대기
    await delay(1000);
  }

  console.log('\n✨ Mastra 챗봇 워크플로우 완료\n');
}

runMastraChatbot();
