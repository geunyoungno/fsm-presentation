/**
 * XState를 사용한 폼 유효성 검사
 * 실용적인 UI 상태 관리 예제
 */

import { createMachine, createActor, assign } from 'xstate';

interface FormContext {
  email: string;
  password: string;
  errors: string[];
}

type FormEvent =
  | { type: 'INPUT_EMAIL'; value: string }
  | { type: 'INPUT_PASSWORD'; value: string }
  | { type: 'SUBMIT' }
  | { type: 'RESET' };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const formMachine = createMachine({
  id: 'form',
  types: {} as {
    context: FormContext;
    events: FormEvent;
  },
  initial: 'editing',
  context: {
    email: '',
    password: '',
    errors: []
  },
  states: {
    editing: {
      // 입력 이벤트는 context 업데이트만 수행
      on: {
        INPUT_EMAIL: {
          actions: assign({
            email: ({ event }) => event.value
          })
        },
        INPUT_PASSWORD: {
          actions: assign({
            password: ({ event }) => event.value
          })
        },
        SUBMIT: {
          target: 'validating'
        }
      }
    },
    validating: {
      // entry에서 유효성 검사를 수행하고 errors를 계산
      entry: assign({
        errors: ({ context }) => {
          const errors: string[] = [];

          if (!context.email) {
            errors.push('이메일을 입력해주세요');
          } else if (!EMAIL_REGEX.test(context.email)) {
            errors.push('올바른 이메일 형식이 아닙니다');
          }

          if (!context.password) {
            errors.push('비밀번호를 입력해주세요');
          } else if (context.password.length < MIN_PASSWORD_LENGTH) {
            errors.push(`비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다`);
          }

          return errors;
        }
      }),
      // errors 유무에 따라 즉시 분기
      always: [
        {
          guard: ({ context }) => context.errors.length === 0,
          target: 'submitting'
        },
        {
          target: 'error'
        }
      ]
    },
    submitting: {
      // 실제 네트워크 요청 대신 지연으로 시뮬레이션
      entry: () => console.log('📤 서버로 전송 중...'),
      after: {
        1000: 'success'
      }
    },
    success: {
      entry: () => console.log('✅ 제출 성공!'),
      // 성공 후 다시 입력 상태로 리셋 가능
      on: {
        RESET: 'editing'
      }
    },
    error: {
      // 에러 상태에서는 메시지를 출력하고 다시 입력받음
      entry: ({ context }) => {
        console.log('❌ 유효성 검사 실패:');
        context.errors.forEach(err => console.log(`  - ${err}`));
      },
      on: {
        INPUT_EMAIL: {
          target: 'editing',
          actions: assign({
            email: ({ event }) => event.value
          })
        },
        INPUT_PASSWORD: {
          target: 'editing',
          actions: assign({
            password: ({ event }) => event.value
          })
        },
        RESET: {
          target: 'editing',
          actions: assign({
            email: '',
            password: '',
            errors: []
          })
        }
      }
    }
  }
});

console.log('=== XState Form Validation Machine ===\n');

const formActor = createActor(formMachine);

// 상태/입력값 변화를 콘솔에서 확인
formActor.subscribe((state) => {
  console.log(`\n[State: ${state.value}]`);
  console.log(`Email: "${state.context.email}"`);
  console.log(`Password: "${state.context.password}"`);
});

formActor.start();

// 시나리오 1: 빈 폼 제출 (실패)
console.log('\n--- 시나리오 1: 빈 폼 제출 ---');
formActor.send({ type: 'SUBMIT' });

// 시나리오 2: 잘못된 이메일 (실패)
console.log('\n\n--- 시나리오 2: 잘못된 이메일 ---');
formActor.send({ type: 'INPUT_EMAIL', value: 'invalid-email' });
formActor.send({ type: 'INPUT_PASSWORD', value: '123' });
formActor.send({ type: 'SUBMIT' });

// 시나리오 3: 올바른 입력 (성공)
console.log('\n\n--- 시나리오 3: 올바른 입력 ---');
formActor.send({ type: 'RESET' });
formActor.send({ type: 'INPUT_EMAIL', value: 'user@example.com' });
formActor.send({ type: 'INPUT_PASSWORD', value: 'password123' });
formActor.send({ type: 'SUBMIT' });

// 성공 후 대기
setTimeout(() => {
  formActor.stop();
}, 1500);
