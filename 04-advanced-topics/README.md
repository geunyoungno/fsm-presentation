# 04. 고급 주제

> 💡 **학습 목표**: 프로덕션 수준의 FSM 구현을 위한 고급 패턴과 실무 기법을 습득합니다.

> **이전 섹션 복습:** [03-workflow-comparison](../03-workflow-comparison)에서 여러 워크플로우 라이브러리의 특징을 비교했습니다.

이 섹션에서는 FSM의 고급 패턴과 실무 적용 기법을 다룹니다.

## 📚 주요 주제

### 1. 계층적 상태 (Hierarchical States / Statecharts)

**Statecharts란?**

David Harel이 1987년에 제안한 개념으로, 기본 FSM을 확장하여 복잡한 시스템을 더 효과적으로 모델링할 수 있게 합니다.

**주요 개념:**

- **중첩 상태 (Nested States)**: 상태 안에 하위 상태를 포함
- **병렬 상태 (Parallel States)**: 여러 상태가 동시에 활성화
- **히스토리 상태 (History States)**: 이전 하위 상태를 기억

**예제: 음악 플레이어**

```
powerOff
powerOn
  ├── stopped
  ├── playing
  │   ├── normal
  │   ├── repeat
  │   └── shuffle
  └── paused
```

**장점:**

1. **복잡도 관리**: 큰 시스템을 작은 단위로 분해
2. **코드 재사용**: 공통 전이를 상위 상태에 정의
3. **유지보수성**: 관련 상태를 그룹화하여 이해하기 쉬움
4. **확장성**: 새로운 하위 상태 추가가 용이

**실무 활용:**
- 복잡한 UI 컴포넌트 (비디오 플레이어, 에디터 등)
- 다단계 위저드/폼
- 게임 상태 관리

---

### 2. 상태 영속화 (State Persistence)

**왜 필요한가?**

- 사용자 경험 향상: 앱 재시작 후에도 이전 상태 유지
- 오류 복구: 크래시 후 상태 복원
- 멀티 디바이스: 여러 기기 간 상태 동기화

**예제: 게임 저장/로드**

게임의 현재 상태(레벨, 점수, 생명)를 파일에 저장하고, 나중에 불러와서 게임을 이어할 수 있습니다.

**저장 방식:**

| 방식 | 사용 사례 | 장점 | 단점 |
|------|----------|------|------|
| **파일 시스템** | 데스크톱 앱 | 간단, 오프라인 가능 | 동기화 어려움 |
| **LocalStorage** | 웹 앱 | 빠름, 간단 | 용량 제한 (5-10MB) |
| **IndexedDB** | 웹 앱 (대용량) | 대용량 가능 | 복잡한 API |
| **Database** | 멀티 유저 | 중앙 관리, 쿼리 가능 | 네트워크 필요 |
| **Cloud Storage** | 멀티 디바이스 | 동기화 쉬움 | 비용, 지연 |

**구현 패턴:**

```typescript
// 1. 상태 직렬화
const stateSnapshot = actor.getSnapshot();
const serialized = JSON.stringify(stateSnapshot.context);

// 2. 저장
localStorage.setItem('appState', serialized);

// 3. 복원
const saved = localStorage.getItem('appState');
const context = JSON.parse(saved);
actor.send({ type: 'RESTORE', context });
```

**주의사항:**

- 🔒 **보안**: 민감한 정보는 암호화
- 🔄 **버전 관리**: 스키마 변경 시 마이그레이션
- ⚠️ **에러 처리**: 저장/로드 실패 처리
- 🧹 **정리**: 오래된 데이터 삭제 정책

---

## 예제 파일

- `src/hierarchical-states.ts`: 계층적 상태 예제
- `src/state-persistence.ts`: 상태 영속화 예제

## 🎯 실무 적용 시 고려사항

### 1. 언제 FSM을 사용해야 하나?

**적합한 경우:**
- ✅ 명확한 상태가 존재
- ✅ 상태 간 전이 규칙이 복잡
- ✅ 비즈니스 로직이 중요
- ✅ 디버깅/추적이 필요

**부적합한 경우:**
- ❌ 단순한 boolean 플래그로 충분
- ❌ 상태가 매우 동적 (무한대)
- ❌ 성능이 극도로 중요 (오버헤드)

### 2. 디버깅 전략

**XState v5 Actor 모델:**
- 머신(machine)은 **정의**이고, 실제 실행은 actor가 담당
- 이벤트는 actor에 `send`, 상태는 actor의 `subscribe`/`getSnapshot`으로 조회
- 필요 시 actor 내부에서 다른 actor를 spawn하여 병렬 작업을 구성

**XState DevTools:**
```typescript
import { inspect } from '@statelyai/inspect';

const actor = createActor(machine, {
  inspect: inspect({
    iframe: false // 브라우저 DevTools 사용
  })
});

actor.start();
```

**로깅:**
```typescript
const actor = createActor(machine);
actor.subscribe((state) => {
  console.log(`[${state.value}] ${state.event.type}`);
});
actor.start();
```

### 3. 테스트 전략

**상태별 테스트:**
```typescript
test('should transition to success on SUBMIT', () => {
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'SUBMIT' });
  expect(actor.getSnapshot().value).toBe('success');
});
```

**경로 테스트:**
```typescript
test('full workflow', () => {
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'START' });
  actor.send({ type: 'PROCESS' });
  actor.send({ type: 'COMPLETE' });
  expect(actor.getSnapshot().value).toBe('done');
});
```

### 4. 성능 최적화

- **메모이제이션**: 동일한 상태 전이 결과 캐싱
- **Lazy Loading**: 필요한 상태만 동적 로드
- **상태 분할**: 큰 머신을 여러 작은 머신으로 분리

---

## 📖 추가 학습 리소스

### 공식 문서
- [XState 공식 문서](https://xstate.js.org/docs/)
- [Stately Studio](https://stately.ai/studio) - 시각화 도구
- [State Machine Catalog](https://stately.ai/registry) - 예제 모음

### 학습 자료
- [Statecharts 원본 논문](https://www.sciencedirect.com/science/article/pii/0167642387900359) - David Harel (1987)
- [The World of Statecharts](https://statecharts.dev/) - Statecharts 종합 가이드
- [XState Visualizer](https://stately.ai/viz) - 온라인 시각화 도구

### 커뮤니티
- [XState Discord](https://discord.gg/xstate)
- [GitHub Discussions](https://github.com/statelyai/xstate/discussions)

---

## 실행 방법

### 옵션 1: 프로젝트 루트에서 실행 (권장)

```bash
# 프로젝트 루트에서 의존성 설치
pnpm install

# TypeScript 컴파일
pnpm -C 04-advanced-topics run build

# 계층적 상태 예제 실행
pnpm -C 04-advanced-topics run hierarchical

# 상태 영속화 예제 실행
pnpm -C 04-advanced-topics run persistence
```

### 옵션 2: 현재 디렉토리에서 실행

```bash
# 04-advanced-topics 디렉토리로 이동
cd 04-advanced-topics

# TypeScript 컴파일
pnpm build

# 계층적 상태 예제 실행
pnpm hierarchical

# 상태 영속화 예제 실행
pnpm persistence
```

## 상태 저장 파일 위치

`state-persistence` 예제는 실행 폴더 기준으로 `game-save.json`을 생성하며, 데모 시작/종료 시 자동으로 삭제합니다.

## 실행 결과 예시

### Hierarchical States 예제 출력:
```
=== Hierarchical States: Music Player ===

현재 상태: "powerOff"
⚫ [Power OFF] 전원 꺼짐

--- 전원 켜기 ---
🟢 [Power ON] 전원 켜짐
  ⏹️  [Stopped] 정지 상태

현재 상태: {"powerOn":"stopped"}

--- 재생 시작 ---
  ▶️  [Playing] 재생 중
    🎵 [Normal] 일반 재생

현재 상태: {"powerOn":{"playing":"normal"}}

--- 반복 재생 모드 ---
    🔁 [Repeat] 반복 재생

현재 상태: {"powerOn":{"playing":"repeat"}}

--- 셔플 재생 모드 ---
    🔀 [Shuffle] 셔플 재생

현재 상태: {"powerOn":{"playing":"shuffle"}}

--- 일시정지 ---
  ⏸️  [Paused] 일시정지

현재 상태: {"powerOn":"paused"}

✨ 계층적 상태 데모 완료
```

### State Persistence 예제 출력:
```
=== State Persistence: Game Save/Load ===

🎮 [idle] 게임 시작!
점수: 0 | 레벨: 1 | 생명: 3

🎯 [playing] 포인트 획득! +10점
점수: 10 | 레벨: 1 | 생명: 3

💾 [playing] 게임 저장 중...
✅ 저장 완료!

📖 [playing] 저장된 게임 불러오기...
✅ 불러오기 완료!
점수: 10 | 레벨: 1 | 생명: 3

🎯 [playing] 포인트 획득! +10점
점수: 20 | 레벨: 1 | 생명: 3

💀 [game_over] 게임 오버!
```

**관찰 포인트:**
- **Hierarchical States**: 중첩된 객체 형태로 계층 구조 표현 (예: `{"powerOn":{"playing":"normal"}}`)
- **State Persistence**: 상태 저장/로드 기능으로 게임 진행 상황 유지

---

## 🎓 핵심 요약

1. **계층적 상태**: 복잡한 시스템을 구조화하는 강력한 도구
2. **상태 영속화**: 사용자 경험을 향상시키는 필수 기능
3. **실무 적용**: 올바른 도구를 올바른 문제에 사용하라
4. **테스트**: FSM은 테스트하기 쉬운 구조를 제공
5. **문서화**: 상태 다이어그램은 최고의 문서

---

## 다음 단계

**이 섹션에서 배운 것:**
- ✅ 계층적 상태로 복잡한 시스템 구조화
- ✅ 상태 영속화로 사용자 경험 향상
- ✅ 실무 적용 시 고려사항 (언제 사용할지, 언제 피할지)
- ✅ 디버깅 및 테스트 전략

**축하합니다! 🎉**

FSM 발표 자료의 모든 섹션을 완료했습니다. 이제 다음 단계를 선택하세요:

1. **복습하기**: 메인 문서([fsm.md](../fsm.md))로 돌아가 전체 내용 정리
2. **실습하기**: 각 섹션의 코드를 직접 수정하며 실험
3. **프로젝트에 적용하기**: 학습한 내용을 실제 프로젝트에 적용
4. **심화 학습**:
   - [XState 공식 문서](https://xstate.js.org/docs/)
   - [Statecharts 원본 논문](https://www.sciencedirect.com/science/article/pii/0167642387900359)
   - [The World of Statecharts](https://statecharts.dev/)

**발표 준비 체크리스트:**
- [ ] 모든 예제 실행 테스트
- [ ] Stately Studio로 주요 머신 시각화
- [ ] 질의응답 시나리오 준비
- [ ] 실제 사용 사례 추가 (선택사항)
