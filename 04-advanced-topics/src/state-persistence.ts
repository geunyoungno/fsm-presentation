/**
 * 상태 영속화 (State Persistence)
 * 애플리케이션 재시작 후에도 상태를 유지
 */

import { createMachine, createActor, assign } from 'xstate';
import fs from 'fs';
import path from 'path';

interface GameContext {
  level: number;
  score: number;
  lives: number;
  playerName: string;
}

type GameEvent =
  | { type: 'NEW_GAME' }
  | { type: 'LOAD_GAME'; savedState: Partial<GameContext> }
  | { type: 'EARN_POINTS'; points: number }
  | { type: 'LOSE_LIFE' }
  | { type: 'LEVEL_UP' }
  | { type: 'SAVE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'QUIT' }
  | { type: 'RESTART' };

const SAVE_FILE = path.join(process.cwd(), 'game-save.json');

// 런타임 타입 체크를 위한 간단한 헬퍼
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// 저장 파일을 읽었을 때 최소 스키마를 만족하는지 확인
const parseSavedGame = (data: unknown): GameContext | null => {
  if (!isRecord(data)) {
    return null;
  }

  const { level, score, lives, playerName } = data;

  if (
    typeof level !== 'number' ||
    typeof score !== 'number' ||
    typeof lives !== 'number' ||
    typeof playerName !== 'string'
  ) {
    return null;
  }

  return {
    level,
    score,
    lives,
    playerName
  };
};

// 현재 게임 컨텍스트를 파일에 저장
const saveGame = (context: GameContext) => {
  console.log('💾 [Saving] 게임 저장 중...');

  const saveData = {
    level: context.level,
    score: context.score,
    lives: context.lives,
    playerName: context.playerName,
    savedAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(saveData, null, 2));
    console.log('✅ 저장 완료!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ 저장 실패:', error.message);
      if ('code' in error) {
        console.error('   오류 코드:', (error as NodeJS.ErrnoException).code);
      }
    } else {
      console.error('❌ 알 수 없는 저장 오류:', error);
    }
  }
};

// 게임 상태 머신
const gameMachine = createMachine({
  id: 'game',
  initial: 'menu',
  context: {
    level: 1,
    score: 0,
    lives: 3,
    playerName: 'Player'
  } as GameContext,
  states: {
    menu: {
      // 메인 메뉴 상태: 새 게임 시작 또는 저장된 게임 로드
      entry: () => console.log('📋 [Menu] 메인 메뉴'),
      on: {
        NEW_GAME: {
          target: 'playing',
          actions: assign({
            level: 1,
            score: 0,
            lives: 3
          })
        },
        LOAD_GAME: {
          target: 'playing',
          // 저장된 상태를 context에 병합
          actions: assign(({ event }) => {
            const loadEvent = event as Extract<GameEvent, { type: 'LOAD_GAME' }>;
            return loadEvent.savedState || {};
          })
        }
      }
    },
    playing: {
      // 실제 플레이 중 상태
      entry: ({ context }) => {
        console.log('🎮 [Playing] 게임 중');
        console.log(`   레벨: ${context.level}, 점수: ${context.score}, 생명: ${context.lives}`);
      },
      on: {
        EARN_POINTS: {
          actions: assign({
            score: ({ context, event }) => {
              const pointsEvent = event as Extract<GameEvent, { type: 'EARN_POINTS' }>;
              return context.score + (pointsEvent.points || 100);
            }
          })
        },
        LOSE_LIFE: {
          actions: assign({
            lives: ({ context }) => context.lives - 1
          })
        },
        LEVEL_UP: {
          actions: assign({
            level: ({ context }) => context.level + 1,
            lives: ({ context }) => context.lives + 1
          })
        },
        SAVE: 'savingFromPlaying',
        PAUSE: 'paused'
      },
      always: {
        // 생명이 0 이하라면 즉시 게임 오버로 전환
        guard: ({ context }) => context.lives <= 0,
        target: 'gameOver'
      }
    },
    paused: {
      entry: () => console.log('⏸️  [Paused] 일시정지'),
      on: {
        RESUME: 'playing',
        SAVE: 'savingFromPaused',
        QUIT: 'menu'
      }
    },
    savingFromPlaying: {
      // 플레이 중 저장 후 다시 playing으로 복귀
      entry: ({ context }) => saveGame(context),
      after: {
        1000: 'playing'
      }
    },
    savingFromPaused: {
      // 일시정지 중 저장 후 다시 paused로 복귀
      entry: ({ context }) => saveGame(context),
      after: {
        1000: 'paused'
      }
    },
    gameOver: {
      // 게임 종료 상태
      entry: ({ context }) => {
        console.log('💀 [Game Over] 게임 종료');
        console.log(`   최종 점수: ${context.score}, 도달 레벨: ${context.level}`);
      },
      on: {
        RESTART: 'menu'
      }
    }
  }
});

// 저장된 상태 로드
function loadSavedGame(): GameContext | null {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      const data = fs.readFileSync(SAVE_FILE, 'utf-8');
      const savedState = JSON.parse(data);
      const parsedState = parseSavedGame(savedState);

      if (!parsedState) {
        console.warn('⚠️  저장된 게임 데이터가 유효하지 않습니다.');
        return null;
      }

      console.log('📂 저장된 게임을 찾았습니다!');
      // 저장 시각은 정보용으로만 출력
      if (isRecord(savedState) && typeof savedState.savedAt === 'string') {
        console.log(`   저장 시각: ${savedState.savedAt}`);
      }
      return parsedState;
    }
  } catch (error) {
    console.error('저장 파일 로드 실패:', error);
  }
  return null;
}

// 저장 파일 삭제
function deleteSaveFile() {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      fs.unlinkSync(SAVE_FILE);
      console.log('🗑️  저장 파일 삭제됨\n');
    }
  } catch (error) {
    console.error('파일 삭제 실패:', error);
  }
}

console.log('=== State Persistence: Game Example ===\n');

// 데모를 위해 기존 저장 파일 삭제 (깨끗한 시작)
deleteSaveFile();

const gameActor = createActor(gameMachine);

// playing 상태일 때 현재 컨텍스트를 간단히 출력
gameActor.subscribe((state) => {
  if (state.value === 'playing') {
    const ctx = state.context;
    console.log(`📊 상태: 레벨 ${ctx.level} | 점수 ${ctx.score} | 생명 ${ctx.lives}\n`);
  }
});

gameActor.start();

// 시나리오: 게임 플레이 및 저장
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('\n=== 시나리오 1: 새 게임 시작 ===\n');
  gameActor.send({ type: 'NEW_GAME' });

  await delay(500);
  console.log('\n--- 점수 획득 ---');
  gameActor.send({ type: 'EARN_POINTS', points: 250 });

  await delay(500);
  console.log('\n--- 레벨 업 ---');
  gameActor.send({ type: 'LEVEL_UP' });

  await delay(500);
  console.log('\n--- 점수 획득 ---');
  gameActor.send({ type: 'EARN_POINTS', points: 300 });

  await delay(500);
  console.log('\n--- 게임 저장 ---');
  gameActor.send({ type: 'SAVE' });

  await delay(2000);
  console.log('\n--- 게임 종료 (Actor 중지) ---');
  gameActor.stop();

  await delay(1000);
  console.log('\n\n=== 시나리오 2: 저장된 게임 로드 ===\n');

  // 새로운 Actor 생성 (앱 재시작 시뮬레이션)
  const newGameActor = createActor(gameMachine);

  newGameActor.subscribe((state) => {
    if (state.value === 'playing') {
      const ctx = state.context;
      console.log(`📊 상태: 레벨 ${ctx.level} | 점수 ${ctx.score} | 생명 ${ctx.lives}\n`);
    }
  });

  newGameActor.start();

  const savedState = loadSavedGame();

  if (savedState) {
    console.log('\n--- 저장된 게임 불러오기 ---');
    newGameActor.send({ type: 'LOAD_GAME', savedState });

    await delay(1000);
    console.log('\n--- 게임 계속 진행 ---');
    newGameActor.send({ type: 'EARN_POINTS', points: 400 });

    await delay(500);
    console.log('\n--- 생명 잃음 ---');
    newGameActor.send({ type: 'LOSE_LIFE' });
  }

  await delay(1000);
  console.log('\n\n✨ 상태 영속화 데모 완료');

  newGameActor.stop();
  deleteSaveFile();
})();

/**
 * 상태 영속화 패턴:
 *
 * 1. 파일 기반 저장 (이 예제)
 *    - JSON 파일에 context 저장
 *    - 간단하고 디버깅이 쉬움
 *
 * 2. LocalStorage (브라우저)
 *    - window.localStorage.setItem('gameState', JSON.stringify(state))
 *    - 브라우저 재시작 후에도 유지
 *
 * 3. Database
 *    - PostgreSQL, MongoDB 등에 저장
 *    - 다중 사용자 환경에 적합
 *
 * 4. 클라우드 스토리지
 *    - AWS S3, Firebase 등
 *    - 여러 기기 간 동기화
 *
 * 주의사항:
 * - 민감한 정보는 암호화하여 저장
 * - 저장 실패 시 처리 로직 필요
 * - 버전 관리 (상태 스키마 변경 시)
 */
