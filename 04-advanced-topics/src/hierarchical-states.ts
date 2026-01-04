/**
 * 계층적 상태 (Hierarchical States / Statecharts)
 * 복잡한 상태를 중첩된 구조로 관리
 */

import { createMachine, createActor } from 'xstate';

/**
 * 음악 플레이어 예제
 * - 최상위 상태: 전원 ON/OFF
 * - 하위 상태 (전원 ON 시): 재생, 일시정지, 중지
 * - 재생 하위 상태: 일반 재생, 반복 재생, 셔플 재생
 */

const musicPlayerMachine = createMachine({
  id: 'musicPlayer',
  initial: 'powerOff',
  states: {
    powerOff: {
      // 전원이 꺼진 상태: 전원 켜기 이벤트만 허용
      entry: () => console.log('⚫ [Power OFF] 전원 꺼짐'),
      on: {
        POWER_ON: 'powerOn'
      }
    },
    powerOn: {
      // 전원이 켜진 상태 내부에 재생 관련 하위 상태 존재
      entry: () => console.log('🟢 [Power ON] 전원 켜짐'),
      initial: 'stopped',
      states: {
        stopped: {
          // 재생 시작 전 기본 상태
          entry: () => console.log('  ⏹️  [Stopped] 정지 상태'),
          on: {
            PLAY: 'playing'
          }
        },
        playing: {
          // 재생 중 상태 안에 재생 모드(일반/반복/셔플) 서브 상태 포함
          entry: () => console.log('  ▶️  [Playing] 재생 중'),
          initial: 'normal',
          states: {
            normal: {
              entry: () => console.log('    🎵 [Normal] 일반 재생'),
              on: {
                TOGGLE_REPEAT: 'repeat',
                TOGGLE_SHUFFLE: 'shuffle'
              }
            },
            repeat: {
              entry: () => console.log('    🔁 [Repeat] 반복 재생'),
              on: {
                TOGGLE_REPEAT: 'normal',
                TOGGLE_SHUFFLE: 'shuffle'
              }
            },
            shuffle: {
              entry: () => console.log('    🔀 [Shuffle] 셔플 재생'),
              on: {
                TOGGLE_SHUFFLE: 'normal',
                TOGGLE_REPEAT: 'repeat'
              }
            }
          },
          on: {
            PAUSE: 'paused',
            STOP: 'stopped'
          }
        },
        paused: {
          // 일시정지 상태에서 재생 재개 또는 정지 가능
          entry: () => console.log('  ⏸️  [Paused] 일시정지'),
          on: {
            PLAY: 'playing',
            STOP: 'stopped'
          }
        }
      },
      on: {
        // 전원 OFF는 하위 상태 어디에서든 전환 가능
        POWER_OFF: 'powerOff'
      }
    }
  }
});

console.log('=== Hierarchical States: Music Player ===\n');

const playerActor = createActor(musicPlayerMachine);

// 상태 변화 로그 (중첩 상태는 객체 형태로 출력됨)
playerActor.subscribe((state) => {
  console.log(`\n현재 상태: ${JSON.stringify(state.value)}`);
});

playerActor.start();

// 시나리오: 음악 플레이어 사용 흐름을 순서대로 시뮬레이션
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  await delay(500);
  console.log('\n--- 전원 켜기 ---');
  playerActor.send({ type: 'POWER_ON' });

  await delay(500);
  console.log('\n--- 재생 시작 ---');
  playerActor.send({ type: 'PLAY' });

  await delay(500);
  console.log('\n--- 반복 재생 모드 ---');
  playerActor.send({ type: 'TOGGLE_REPEAT' });

  await delay(500);
  console.log('\n--- 셔플 재생 모드 ---');
  playerActor.send({ type: 'TOGGLE_SHUFFLE' });

  await delay(500);
  console.log('\n--- 일시정지 ---');
  playerActor.send({ type: 'PAUSE' });

  await delay(500);
  console.log('\n--- 재생 재개 ---');
  playerActor.send({ type: 'PLAY' });

  await delay(500);
  console.log('\n--- 정지 ---');
  playerActor.send({ type: 'STOP' });

  await delay(500);
  console.log('\n--- 전원 끄기 ---');
  playerActor.send({ type: 'POWER_OFF' });

  await delay(500);
  console.log('\n\n✨ 계층적 상태 데모 완료');
  playerActor.stop();
})();

/**
 * 계층적 상태의 장점:
 *
 * 1. 코드 재사용성
 *    - 공통 전이를 부모 상태에 정의하여 모든 하위 상태에서 사용
 *    - 예: powerOn 상태의 POWER_OFF 이벤트
 *
 * 2. 상태 복잡도 감소
 *    - 중첩된 상태로 복잡한 로직을 계층적으로 구조화
 *    - 각 레벨의 책임을 명확히 분리
 *
 * 3. 유지보수성 향상
 *    - 관련된 상태를 그룹화하여 이해하기 쉬움
 *    - 변경 사항의 영향 범위를 제한
 *
 * 4. History States
 *    - 이전 상태를 기억하고 복원 가능 (XState의 history 기능)
 */
