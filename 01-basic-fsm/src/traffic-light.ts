/**
 * 신호등 FSM 예제
 * 상태: RED, YELLOW, GREEN
 * 이벤트: NEXT
 */

type TrafficState = 'RED' | 'YELLOW' | 'GREEN';
type TrafficEventType = 'NEXT';

// 제네릭 인터페이스로 상태/이벤트 타입을 명시적으로 분리
interface StateMachine<S, E> {
  currentState: S;
  transition(event: E): void;
  getState(): S;
}

// 전이 테이블 기반 FSM: 상태별 다음 상태를 미리 정의
class TrafficLightFSM implements StateMachine<TrafficState, TrafficEventType> {
  currentState: TrafficState;
  private transitions: Record<TrafficState, TrafficState>;

  constructor(initialState: TrafficState = 'RED') {
    this.currentState = initialState;

    // 전이 테이블 정의
    this.transitions = {
      RED: 'GREEN',
      GREEN: 'YELLOW',
      YELLOW: 'RED'
    };
  }

  // NEXT 이벤트가 들어오면 전이 테이블에 따라 다음 상태로 이동
  transition(event: TrafficEventType): void {
    if (event === 'NEXT') {
      const nextState = this.transitions[this.currentState];
      console.log(`${this.currentState} -> ${nextState}`);
      this.currentState = nextState;
    } else {
      console.warn(`⚠️  Invalid event: "${event}". Only "NEXT" is supported.`);
    }
  }

  // 현재 상태를 그대로 반환
  getState(): TrafficState {
    return this.currentState;
  }

  // UI나 출력에 사용할 액션 설명을 상태에 매핑
  getAction(): string {
    const actions: Record<TrafficState, string> = {
      RED: '정지',
      YELLOW: '주의',
      GREEN: '진행'
    };
    return actions[this.currentState];
  }
}

// 실행 예제
console.log('=== Traffic Light FSM ===\n');

// 초기 상태는 RED, 상태와 액션을 함께 출력
const trafficLight = new TrafficLightFSM();
console.log(`Initial State: ${trafficLight.getState()} (${trafficLight.getAction()})\n`);

// 신호등 사이클 시뮬레이션
for (let i = 0; i < 6; i++) {
  trafficLight.transition('NEXT');
  console.log(`Current State: ${trafficLight.getState()} (${trafficLight.getAction()})`);
}
