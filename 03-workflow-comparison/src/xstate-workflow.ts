/**
 * XState를 사용한 주문 처리 워크플로우
 * 전통적인 UI/애플리케이션 상태 관리에 최적화
 */

import { createMachine, createActor, assign } from 'xstate';

interface OrderContext {
  orderId: string;
  items: string[];
  total: number;
  orderStatus: 'pending' | 'processing_payment' | 'paid' | 'shipping' | 'delivered' | 'canceled';
  retryCount: number;
}

type OrderEvent =
  | { type: 'CONFIRM_ORDER' }
  | { type: 'PROCESS_PAYMENT' }
  | { type: 'PAYMENT_SUCCESS' }
  | { type: 'PAYMENT_FAILED' }
  | { type: 'RETRY_PAYMENT' }
  | { type: 'SHIP_ORDER' }
  | { type: 'DELIVER_ORDER' }
  | { type: 'CANCEL' };

const PAYMENT_DELAY_MS = 1000;
const SHIPPING_DELAY_MS = 2000;
const PAYMENT_SUCCESS_RATE = 0.7;
const MAX_PAYMENT_RETRIES = 3;
const CONFIRM_EVENT_DELAY_MS = 500;
const PROCESS_PAYMENT_EVENT_DELAY_MS = 1000;
const SHIP_EVENT_DELAY_MS = 1000;
const RETRY_EVENT_DELAY_MS = 1500;
const WORKFLOW_DONE_DELAY_MS = 8000;

const orderMachine = createMachine({
  id: 'order',
  types: {} as {
    context: OrderContext;
    events: OrderEvent;
  },
  initial: 'pending',
  context: {
    orderId: 'ORD-001',
    items: ['Item A', 'Item B'],
    total: 100,
    orderStatus: 'pending',
    retryCount: 0
  },
  states: {
    pending: {
      // 결제 전 단계 (주문 작성 중)
      entry: () => console.log('⏳ [Pending] 결제 대기 중...'),
      on: {
        CONFIRM_ORDER: 'confirmed'
      }
    },
    confirmed: {
      // 주문 확인 단계
      entry: () => console.log('✅ [Confirmed] 주문 확인됨'),
      on: {
        PROCESS_PAYMENT: 'processing_payment',
        CANCEL: 'canceled'
      }
    },
    processing_payment: {
      // 결제 처리 중: 일정 시간 후 성공/실패 분기
      entry: assign({ orderStatus: 'processing_payment' }),
      after: {
        [PAYMENT_DELAY_MS]: [
          {
            guard: () => Math.random() < PAYMENT_SUCCESS_RATE,
            target: 'paid',
            actions: assign({
              orderStatus: 'paid',
              retryCount: 0 // 성공 시 재시도 횟수 초기화
            })
          },
          {
            target: 'payment_failed',
            actions: assign({
              retryCount: ({ context }) => context.retryCount + 1
            })
          }
        ]
      },
      exit: () => console.log('💳 [Processing Payment] 결제 처리 중...')
    },
    paid: {
      // 결제 완료 시 배송으로 이동 가능
      entry: () => console.log('💰 [Paid] 결제 완료!'),
      on: {
        SHIP_ORDER: 'shipping'
      }
    },
    payment_failed: {
      // 결제 실패 시 재시도 또는 취소
      entry: ({ context }) => {
        console.log(`❌ [Payment Failed] 결제 실패 (시도: ${context.retryCount})`);
      },
      // 지연 후 자동으로 재시도 또는 취소
      after: {
        [RETRY_EVENT_DELAY_MS]: [
          {
            guard: ({ context }) => context.retryCount < MAX_PAYMENT_RETRIES,
            target: 'processing_payment',
            actions: () => console.log('\n🔄 재시도 중...')
          },
          {
            target: 'canceled'
          }
        ]
      }
    },
    shipping: {
      // 배송 시작 후 일정 시간 뒤 완료 처리
      entry: [
        assign({ orderStatus: 'shipping' }),
        () => console.log('🚚 [Shipping] 배송 시작')
      ],
      after: {
        [SHIPPING_DELAY_MS]: {
          target: 'delivered',
          actions: assign({
            orderStatus: 'delivered'
          })
        }
      }
    },
    delivered: {
      // 최종 완료 상태
      entry: ({ context }) => {
        console.log('🎉 [Delivered] 배송 완료!');
        console.log(`주문 ${context.orderId} - 총액: $${context.total}`);
      },
      type: 'final'
    },
    canceled: {
      // 취소는 별도 종료 상태로 처리
      entry: [
        assign({ orderStatus: 'canceled' }),
        () => console.log('🚫 [Canceled] 주문 취소됨')
      ],
      type: 'final'
    }
  }
});

console.log('=== XState Order Workflow ===\n');
console.log('특징: 명확한 상태 전이, 타입 안전성, 시각화 가능\n');

const orderActor = createActor(orderMachine);

// 상태 변화를 콘솔에서 확인
orderActor.subscribe((state) => {
  console.log(`\n현재 상태: ${state.value}`);
});

orderActor.start();

// 워크플로우 실행
setTimeout(() => orderActor.send({ type: 'CONFIRM_ORDER' }), CONFIRM_EVENT_DELAY_MS);
setTimeout(() => orderActor.send({ type: 'PROCESS_PAYMENT' }), PROCESS_PAYMENT_EVENT_DELAY_MS);

// 결제 완료 시 배송 시작
orderActor.subscribe((state) => {
  if (state.value === 'paid') {
    // 결제 완료 후 배송 이벤트를 지연 전송
    setTimeout(() => orderActor.send({ type: 'SHIP_ORDER' }), SHIP_EVENT_DELAY_MS);
  }
});

// 완료 후 종료
setTimeout(() => {
  console.log('\n\n✨ XState 워크플로우 완료\n');
  orderActor.stop();
}, WORKFLOW_DONE_DELAY_MS);
