/**
 * 간단한 토글 스위치 FSM 예제
 * 상태: ON, OFF
 * 이벤트: TOGGLE
 */

type ToggleState = 'ON' | 'OFF';
type ToggleEventType = 'TOGGLE';

// 상태 머신이 제공해야 하는 최소 기능을 명시
interface ToggleFSMInterface {
  currentState: ToggleState;
  transition(event: ToggleEventType): void;
  getState(): ToggleState;
}

// 가장 단순한 FSM 구현: 현재 상태 + 이벤트 처리 함수
class ToggleFSM implements ToggleFSMInterface {
  currentState: ToggleState;

  constructor(initialState: ToggleState = 'OFF') {
    this.currentState = initialState;
  }

  // 이벤트에 따라 다음 상태로 전이
  transition(event: ToggleEventType): void {
    if (event === 'TOGGLE') {
      // 단일 이벤트만 허용하므로 분기 로직은 매우 단순함
      this.currentState = this.currentState === 'OFF' ? 'ON' : 'OFF';
      console.log(`Event: ${event} -> New State: ${this.currentState}`);
    } else {
      console.warn(`⚠️  Invalid event: "${event}". Only "TOGGLE" is supported.`);
    }
  }

  // 외부에서 현재 상태를 읽을 수 있도록 getter 제공
  getState(): ToggleState {
    return this.currentState;
  }
}

// 실행 예제
console.log('=== Simple Toggle FSM ===\n');

// 기본 상태는 OFF, 이후 TOGGLE 이벤트를 순서대로 발생시켜 상태 변화를 확인
const toggle = new ToggleFSM();
console.log(`Initial State: ${toggle.getState()}`);

toggle.transition('TOGGLE'); // OFF -> ON
toggle.transition('TOGGLE'); // ON -> OFF
toggle.transition('TOGGLE'); // OFF -> ON

console.log(`\nFinal State: ${toggle.getState()}`);
