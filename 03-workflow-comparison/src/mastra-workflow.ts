/**
 * Mastra Workflow를 사용한 주문 처리 워크플로우
 * AI 통합과 복잡한 비즈니스 로직에 최적화
 */

import { createStep, createWorkflow } from '@mastra/core';
import { z } from 'zod';

// 주문 처리에 필요한 전체 상태 스키마
const orderSchema = z.object({
  orderId: z.string(),
  items: z.array(z.string()),
  total: z.number(),
  orderStatus: z.enum(['pending', 'processing_payment', 'paid', 'shipping', 'delivered', 'canceled']),
  retryCount: z.number()
});

// 입력은 일부 필드만 허용하도록 partial로 정의
const orderInputSchema = orderSchema.partial();

type OrderState = z.infer<typeof orderSchema>;
type OrderSeed = z.infer<typeof orderInputSchema>;

const CONFIRM_DELAY_MS = 500;
const PAYMENT_DELAY_MS = 1000;
const SHIPPING_DELAY_MS = 2000;
const MAX_PAYMENT_RETRIES = 3;
const PAYMENT_SUCCESS_RATE = 0.7;

// 공통 지연 유틸리티 (워크플로우 단계 시뮬레이션)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createOrder = createStep({
  id: 'create-order',
  inputSchema: orderInputSchema,
  outputSchema: orderSchema,
  execute: async ({ inputData }) => {
    const seed = inputData as OrderSeed;
    console.log('⏳ [Pending] 주문 생성 중 (결제 대기)...');

    // 입력값이 없으면 기본값을 채워 주문 상태를 만든다
    return {
      orderId: seed.orderId ?? 'ORD-001',
      items: seed.items?.length ? seed.items : ['Item A', 'Item B'],
      total: seed.total ?? 100,
      orderStatus: 'pending',
      retryCount: 0
    } satisfies OrderState;
  }
});

const confirmOrder = createStep({
  id: 'confirm-order',
  inputSchema: orderSchema,
  outputSchema: orderSchema,
  execute: async ({ inputData }) => {
    console.log('✅ [Confirm Order] 주문 확인됨');
    await delay(CONFIRM_DELAY_MS);
    // 확인 단계는 상태를 변경하지 않고 그대로 전달
    return inputData;
  }
});

const processPayment = createStep({
  id: 'process-payment',
  inputSchema: orderSchema,
  outputSchema: orderSchema,
  execute: async ({ inputData }) => {
    let state: OrderState = { ...inputData };
    const maxRetries = MAX_PAYMENT_RETRIES;

    /**
     * Mastra의 재시도 전략: Step 내부에서 while 루프를 사용
     *
     * 이 접근법의 장점:
     * - Step이 독립적으로 재시도 로직을 완전히 제어
     * - 워크플로우 그래프는 단순하게 유지 (재시도는 Step의 내부 구현)
     * - AI 작업(LLM 호출)의 재시도에 특히 적합
     *
     * 동작 방식:
     * 1. 결제가 성공하거나(paid) 최대 재시도 횟수에 도달할 때까지 반복
     * 2. 각 반복마다 결제 시도 → 성공 시 break, 실패 시 retryCount 증가
     * 3. 루프 종료 후 아직 paid가 아니면 canceled로 상태 변경
     */
    while (state.orderStatus !== 'paid' && state.retryCount < maxRetries) {
      const attempt = state.retryCount + 1;
      console.log(`💳 [Process Payment] 결제 처리 중... (시도 ${attempt})`);

      // 결제 처리 중 상태로 전환
      state = { ...state, orderStatus: 'processing_payment' };
      await delay(PAYMENT_DELAY_MS);

      // 70% 확률로 결제 성공 시뮬레이션
      const success = Math.random() < PAYMENT_SUCCESS_RATE;

      if (success) {
        console.log('💰 [Paid] 결제 완료!');
        state = {
          ...state,
          orderStatus: 'paid'
        };
        break; // 성공 시 즉시 루프 종료
      }

      console.log('❌ [Payment Failed] 결제 실패');
      state = {
        ...state,
        retryCount: attempt
      };

      if (state.retryCount < maxRetries) {
        console.log(`🔄 [Retry ${state.retryCount}] 결제 재시도...`);
      }
    }

    // 최대 재시도 횟수 초과 시 주문 취소
    if (state.orderStatus !== 'paid') {
      console.log('🚫 [Canceled] 최대 재시도 횟수 초과 - 주문 취소');
      state = { ...state, orderStatus: 'canceled' };
    }

    return state;
  }
});

const shipOrder = createStep({
  id: 'ship-order',
  inputSchema: orderSchema,
  outputSchema: orderSchema,
  execute: async ({ inputData }) => {
    // 결제 완료가 아니라면 배송을 건너뜀
    if (inputData.orderStatus !== 'paid') {
      return inputData;
    }

    console.log('🚚 [Shipping] 배송 시작');
    await delay(SHIPPING_DELAY_MS);

    // 배송 시작 상태로 업데이트
    return {
      ...inputData,
      orderStatus: 'shipping'
    } satisfies OrderState;
  }
});

const deliverOrder = createStep({
  id: 'deliver-order',
  inputSchema: orderSchema,
  outputSchema: orderSchema,
  execute: async ({ inputData }) => {
    // 배송이 시작되지 않았다면 완료 단계로 가지 않음
    if (inputData.orderStatus !== 'shipping') {
      return inputData;
    }

    console.log('🎉 [Delivered] 배송 완료!');
    console.log(`주문 ${inputData.orderId} - 총액: $${inputData.total}`);

    // 최종 배송 완료 상태로 업데이트
    return {
      ...inputData,
      orderStatus: 'delivered'
    } satisfies OrderState;
  }
});

// Step을 순서대로 연결해 워크플로우 그래프를 정의
const orderWorkflow = createWorkflow({
  id: 'order-processing',
  inputSchema: orderInputSchema,
  outputSchema: orderSchema
})
  .then(createOrder)
  .then(confirmOrder)
  .then(processPayment)
  .then(shipOrder)
  .then(deliverOrder)
  .commit();

async function runMastraWorkflow() {
  console.log('=== Mastra Order Workflow ===\n');
  console.log('특징: AI 통합 가능, 복잡한 비즈니스 로직, 데이터 파이프라인\n');

  try {
    // run 단위로 실행하면 추적/중단/재개 같은 기능을 활용할 수 있음
    const run = await orderWorkflow.createRunAsync();
    const result = await run.start({ inputData: {} });

    // 실행 결과 상태별로 분기 처리
    if (result.status === 'success') {
      console.log('\n--- 최종 주문 상태 ---');
      console.log(result.result);
    } else if (result.status === 'failed') {
      console.error('워크플로우 실행 실패:', result.error);
    } else {
      console.warn('워크플로우가 일시 중단되었습니다.');
    }

    console.log('\n✨ Mastra 워크플로우 완료\n');
  } catch (error) {
    console.error('워크플로우 실행 중 오류:', error);
  }
}

// 실행
runMastraWorkflow();
