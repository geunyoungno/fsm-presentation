/**
 * LangGraph를 사용한 LLM 챗봇 워크플로우
 * 에이전트 기반 동적 라우팅과 LLM 통합 강조
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { loadEnv, isOpenAIAvailable } from './env.js';
import { callOpenAI } from './openai-client.js';

// 환경 변수 로드
const env = loadEnv();

// 상수 정의
const LLM_CALL_DELAY_MS = 1000;
const MAX_LLM_RETRIES = 3;
const LLM_SUCCESS_RATE = 0.8; // Mock 전용
const VALIDATION_DELAY_MS = 300;

// 대화 메시지 타입
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// LangGraph Annotation을 사용한 상태 정의
const ChatGraphAnnotation = Annotation.Root({
  userMessage: Annotation<string>,
  conversationHistory: Annotation<Message[]>,
  currentResponse: Annotation<string | null>,
  retryCount: Annotation<number>,
  status: Annotation<'waiting' | 'validating' | 'processing' | 'success' | 'failed'>
});

type ChatGraphState = typeof ChatGraphAnnotation.State;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock LLM 응답 생성
 */
const callLLMMock = async (
  conversationHistory: Message[]
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
    'langgraph': 'LangGraph는 LLM 에이전트 워크플로우에 특화된 프레임워크입니다. 동적 라우팅과 조건부 엣지를 통해 복잡한 에이전트 행동을 구현할 수 있습니다.',
    'agent': 'LangGraph의 에이전트는 상태를 기반으로 다음 행동을 동적으로 결정합니다. ReAct 패턴, 도구 호출, 멀티 에이전트 협업 등을 지원합니다.',
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
  conversationHistory: Message[]
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
 * 노드 1: 입력 검증
 */
async function validateInputNode(state: ChatGraphState): Promise<Partial<ChatGraphState>> {
  console.log('🔍 [Validating] 입력 검증 중...');
  await delay(VALIDATION_DELAY_MS);

  const userMessage = state.userMessage.trim();

  if (userMessage.length === 0) {
    console.log('⚠️ [Validation Failed] 빈 메시지는 처리할 수 없습니다');
    return {
      status: 'failed'
    };
  }

  console.log(`✅ [Validation Success] 메시지: "${userMessage}"`);
  return {
    status: 'validating'
  };
}

/**
 * 노드 2: LLM 호출
 *
 * LangGraph의 철학:
 * - 각 노드는 단일 작업만 수행 (여기서는 LLM 호출 1회)
 * - 재시도는 조건부 엣지를 통해 워크플로우 그래프 수준에서 처리
 * - 노드는 순수하고 테스트하기 쉬움
 */
async function callLLMNode(state: ChatGraphState): Promise<Partial<ChatGraphState>> {
  const attempt = state.retryCount + 1;
  console.log(`💳 [LLM Call] 시도 ${attempt}/${MAX_LLM_RETRIES}`);

  try {
    // 대화 히스토리에 사용자 메시지 추가
    const updatedHistory: Message[] = [
      ...state.conversationHistory,
      { role: 'user', content: state.userMessage }
    ];

    // LLM 호출
    const response = await callLLM(updatedHistory);

    // 성공
    console.log('💰 [LLM Success] 응답 생성 완료');
    return {
      currentResponse: response,
      conversationHistory: [
        ...updatedHistory,
        { role: 'assistant', content: response }
      ],
      status: 'success'
    };
  } catch (error) {
    console.log(`❌ [LLM Failed] ${error instanceof Error ? error.message : String(error)}`);
    return {
      retryCount: attempt,
      status: 'processing' // 재시도 가능 상태
    };
  }
}

/**
 * 노드 3: 응답 출력
 */
async function displayResponseNode(state: ChatGraphState): Promise<Partial<ChatGraphState>> {
  console.log('\n✅ [Response Ready] 응답 준비 완료');
  console.log(`사용자: ${state.userMessage}`);
  console.log(`봇: ${state.currentResponse}\n`);

  return {};
}

/**
 * 노드 4: 실패 처리
 */
async function handleFailureNode(state: ChatGraphState): Promise<Partial<ChatGraphState>> {
  console.log('\n🚫 [Failed] 최대 재시도 횟수 초과');
  console.log('시스템을 재시작하거나 나중에 다시 시도해주세요.\n');
  return {
    status: 'failed'
  };
}

/**
 * LangGraph의 핵심: 조건부 엣지를 통한 동적 라우팅
 *
 * 재시도 전략:
 * - 검증 실패 시 즉시 종료
 * - LLM 호출 실패 + 재시도 가능 → call_llm으로 다시 돌아감 (루프)
 * - LLM 호출 실패 + 최대 재시도 초과 → handle_failure로 이동
 * - LLM 호출 성공 → display_response로 진행
 *
 * 장점:
 * - 워크플로우 그래프 자체가 재시도 경로를 명시적으로 표현
 * - 시각화했을 때 흐름을 쉽게 이해 가능
 * - 각 노드는 단순한 작업만 수행 (관심사의 분리)
 */
function routeAfterValidation(state: ChatGraphState): string {
  if (state.status === 'failed') {
    return END; // 검증 실패 시 즉시 종료
  }
  return 'call_llm'; // 검증 성공 시 LLM 호출로 진행
}

function routeAfterLLMCall(state: ChatGraphState): string {
  // LLM 호출 성공
  if (state.status === 'success') {
    return 'display_response';
  }

  // LLM 호출 실패 + 재시도 가능
  if (state.status === 'processing' && state.retryCount < MAX_LLM_RETRIES) {
    console.log(`🔄 [Retry ${state.retryCount}] 재시도 준비...`);
    return 'call_llm'; // 같은 노드로 다시 돌아감 (루프)
  }

  // 최대 재시도 횟수 초과
  return 'handle_failure';
}

/**
 * LangGraph 워크플로우 구성
 *
 * 특징:
 * - 노드와 엣지를 명시적으로 연결
 * - 조건부 엣지로 동적 라우팅 구현
 * - 그래프 시각화 가능 (Mermaid, 시각화 도구 등)
 */
const workflow = new StateGraph(ChatGraphAnnotation)
  // 노드 추가
  .addNode('validate_input', validateInputNode)
  .addNode('call_llm', callLLMNode)
  .addNode('display_response', displayResponseNode)
  .addNode('handle_failure', handleFailureNode)
  // 엣지 연결
  .addEdge('__start__', 'validate_input')
  // 조건부 엣지: 검증 후 라우팅
  .addConditionalEdges('validate_input', routeAfterValidation)
  // 조건부 엣지: LLM 호출 후 라우팅 (재시도 로직)
  .addConditionalEdges('call_llm', routeAfterLLMCall)
  // 응답 출력 후 종료
  .addEdge('display_response', '__end__')
  // 실패 처리 후 종료
  .addEdge('handle_failure', '__end__');

// 그래프 컴파일
const app = workflow.compile();

// 실행
async function runLangGraphChatbot() {
  console.log('=== LangGraph Chatbot Workflow ===\n');
  console.log('특징: 에이전트 기반, 동적 라우팅, LLM 통합\n');

  const messages = [
    'Hello!',
    'FSM에 대해 알려줘',
    'LangGraph의 특징은 뭐야?'
  ];
  let conversationHistory: Message[] = [];

  for (const message of messages) {
    console.log(`\n--- 새로운 메시지 처리: "${message}" ---\n`);

    try {
      const initialState: ChatGraphState = {
        userMessage: message,
        conversationHistory,
        currentResponse: null,
        retryCount: 0,
        status: 'waiting'
      };

      const result = await app.invoke(initialState);

      if (result.status === 'success') {
        console.log('--- 대화 히스토리 ---');
        result.conversationHistory.forEach((msg, idx) => {
          console.log(`${idx + 1}. [${msg.role}] ${msg.content}`);
        });
        conversationHistory = result.conversationHistory;
      } else if (result.status === 'failed') {
        console.log('워크플로우가 실패 상태로 종료되었습니다.');
      }
    } catch (error) {
      console.error('워크플로우 실행 중 오류:', error);
    }

    // 다음 메시지 전 대기
    await delay(1000);
  }

  console.log('\n✨ LangGraph 챗봇 워크플로우 완료\n');
}

runLangGraphChatbot();
