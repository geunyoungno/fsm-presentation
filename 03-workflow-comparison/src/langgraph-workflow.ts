/**
 * LangGraph를 사용한 주문 처리 워크플로우
 * LLM 기반 AI 에이전트 워크플로우에 최적화
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph';

const CONFIRM_DELAY_MS = 500;
const PAYMENT_DELAY_MS = 1000;
const SHIPPING_DELAY_MS = 2000;
const MAX_PAYMENT_RETRIES = 3;
const PAYMENT_SUCCESS_RATE = 0.7;

// StateGraph Annotation을 사용하여 상태 정의 (런타임 타입 검증 역할)
const OrderGraphAnnotation = Annotation.Root({
  orderId: Annotation<string>,
  items: Annotation<string[]>,
  total: Annotation<number>,
  orderStatus: Annotation<'pending' | 'processing_payment' | 'paid' | 'shipping' | 'delivered' | 'canceled'>,
  retryCount: Annotation<number>,
  messages: Annotation<string[]>
});

type OrderGraphState = typeof OrderGraphAnnotation.State;

// 노드 함수들: 상태를 받아 부분 업데이트를 반환
async function createOrderNode(state: OrderGraphState): Promise<Partial<OrderGraphState>> {
  console.log('⏳ [Pending] 주문 생성 중 (결제 대기)...');
  return {
    orderId: 'ORD-001',
    items: ['Item A', 'Item B'],
    total: 100,
    orderStatus: 'pending',
    retryCount: 0,
    messages: [...(state.messages || []), '주문 생성됨 (Pending)']
  };
}

async function confirmOrderNode(state: OrderGraphState): Promise<Partial<OrderGraphState>> {
  console.log('✅ [Confirm Order] 주문 확인됨');
  await new Promise(resolve => setTimeout(resolve, CONFIRM_DELAY_MS));
  return {
    // messages 배열은 히스토리 누적을 위한 로그
    messages: [...state.messages, '주문 확인됨']
  };
}

async function processPaymentNode(state: OrderGraphState): Promise<Partial<OrderGraphState>> {
  console.log('💳 [Process Payment] 결제 처리 중...');
  await new Promise(resolve => setTimeout(resolve, PAYMENT_DELAY_MS));

  const success = Math.random() < PAYMENT_SUCCESS_RATE;

  if (success) {
    console.log('💰 [Paid] 결제 완료!');
    return {
      orderStatus: 'paid',
      messages: [...state.messages, '결제 완료 (Paid)']
    };
  } else {
    console.log('❌ [Payment Failed] 결제 실패');
    return {
      orderStatus: 'pending',
      retryCount: state.retryCount + 1,
      messages: [...state.messages, `결제 실패 (시도 ${state.retryCount + 1})`]
    };
  }
}

async function shipOrderNode(state: OrderGraphState): Promise<Partial<OrderGraphState>> {
  console.log('🚚 [Shipping] 배송 시작');
  await new Promise(resolve => setTimeout(resolve, SHIPPING_DELAY_MS));
  return {
    orderStatus: 'shipping',
    messages: [...state.messages, '배송 시작됨 (Shipping)']
  };
}

async function deliverOrderNode(state: OrderGraphState): Promise<Partial<OrderGraphState>> {
  console.log('🎉 [Delivered] 배송 완료!');
  console.log(`주문 ${state.orderId} - 총액: $${state.total}`);
  return {
    orderStatus: 'delivered',
    messages: [...state.messages, '배송 완료 (Delivered)']
  };
}

/**
 * LangGraph의 재시도 전략: 조건부 엣지를 사용한 동적 라우팅
 *
 * 이 접근법의 장점:
 * - 워크플로우 그래프 자체가 재시도 경로를 명시적으로 표현
 * - 각 노드는 단순한 작업만 수행 (결제 시도 1회)
 * - 상태에 따른 동적 라우팅으로 복잡한 분기 처리 가능
 * - 시각화했을 때 흐름을 쉽게 이해 가능
 *
 * 동작 방식:
 * 1. process_payment 노드 실행 후 이 함수 호출
 * 2. 상태를 검사하여 다음 노드 결정:
 *    - 결제 실패(pending) + 재시도 가능 → 'process_payment' (같은 노드로 재진입)
 *    - 결제 실패 + 최대 재시도 초과 → END (워크플로우 종료)
 *    - 결제 성공(paid) → 'ship_order' (다음 단계로 진행)
 *
 * @param state - 현재 워크플로우 상태
 * @returns 다음에 실행할 노드의 이름 또는 END
 */
function shouldRetryPayment(state: OrderGraphState): string {
  // 결제 실패 상태이고 아직 재시도 가능한 경우
  if (state.orderStatus === 'pending' && state.retryCount < MAX_PAYMENT_RETRIES) {
    console.log(`🔄 [Retry ${state.retryCount}] 결제 재시도...`);
    return 'process_payment'; // 결제 처리 노드로 다시 돌아감 (루프)
  }
  // 최대 재시도 횟수 초과 시
  else if (state.orderStatus === 'pending' && state.retryCount >= MAX_PAYMENT_RETRIES) {
    console.log('🚫 [Canceled] 최대 재시도 횟수 초과 - 주문 취소');
    return END; // 워크플로우 종료
  }
  // 결제 성공 시
  return 'ship_order'; // 배송 단계로 진행
}

// LangGraph 워크플로우 구성: 노드와 엣지를 명시적으로 연결
const workflow = new StateGraph(OrderGraphAnnotation)
  // 노드 추가
  .addNode('create_order', createOrderNode)
  .addNode('confirm_order', confirmOrderNode)
  .addNode('process_payment', processPaymentNode)
  .addNode('ship_order', shipOrderNode)
  .addNode('deliver_order', deliverOrderNode)
  // 엣지 연결
  .addEdge('__start__', 'create_order')
  .addEdge('create_order', 'confirm_order')
  .addEdge('confirm_order', 'process_payment')
  // 조건부 엣지: 결제 후 라우팅
  .addConditionalEdges('process_payment', shouldRetryPayment)
  .addEdge('ship_order', 'deliver_order')
  .addEdge('deliver_order', '__end__');

// 그래프 컴파일: 실행 가능한 애플리케이션으로 변환
const app = workflow.compile();

// 실행
async function runLangGraphWorkflow() {
  console.log('=== LangGraph Order Workflow ===\n');
  console.log('특징: LLM 통합, 에이전트 기반, 동적 라우팅\n');

  try {
    // 초기 상태는 Annotation에 맞는 기본값으로 구성
    const initialState: OrderGraphState = {
      orderId: '',
      items: [],
      total: 0,
      orderStatus: 'pending',
      retryCount: 0,
      messages: []
    };

    const result = await app.invoke(initialState);

    console.log('\n--- 워크플로우 메시지 히스토리 ---');
    result.messages.forEach((msg: string, idx: number) => {
      console.log(`${idx + 1}. ${msg}`);
    });

    console.log('\n✨ LangGraph 워크플로우 완료\n');
  } catch (error) {
    console.error('워크플로우 실행 중 오류:', error);
  }
}

// 실행
runLangGraphWorkflow();
