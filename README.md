# FSM Presentation Examples

이 저장소는 FSM/Statechart 개념을 단계별 예제로 설명하는 데모 프로젝트입니다.
각 폴더는 주제별로 독립된 TypeScript 예제를 제공합니다.

## 구성

- `01-basic-fsm`: 순수 TypeScript로 구현한 기본 FSM
- `02-xstate-examples`: XState v5 기반 예제
- `03-workflow-comparison`: XState vs Mastra vs LangGraph 비교
- `04-advanced-topics`: 계층적 상태, 상태 영속화 등 고급 주제

## 🎯 빠른 선택 가이드

어떤 라이브러리를 선택해야 할까요?

| 상황 | 추천 라이브러리 | 이유 |
|------|----------------|------|
| 프론트엔드 UI 상태 관리 | **XState** | React/Vue 통합, 상태 시각화 |
| 장기 실행 백엔드 AI 워크플로우 | **Mastra** | 상태 영속화, suspend/resume |
| LLM 에이전트 시스템 | **LangGraph** | 동적 라우팅, 도구 호출 |

자세한 비교는 [03-workflow-comparison](03-workflow-comparison/README.md)을 참고하세요.

## 준비 사항

- Node.js 20+
- pnpm

## 빠른 시작

```bash
# 의존성 설치
pnpm install

# 전체 빌드
pnpm -r build
```

### 환경 변수 설정 (선택사항)

**실제 LLM API를 사용하려면** 다음 단계를 따르세요:

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집
# OPENAI_API_KEY=sk-your-actual-api-key-here
```

**환경 변수를 설정하지 않으면** Mock 응답이 자동으로 사용됩니다.

#### 환경 변수 설명

| 변수 | 설명 | 필수 여부 | 기본값 |
|------|------|----------|--------|
| `OPENAI_API_KEY` | OpenAI API 키 | 선택 | - |
| `OPENAI_MODEL` | 사용할 모델 | 선택 | `gpt-4o-mini` |

**OpenAI API 키 발급:**
1. [OpenAI Platform](https://platform.openai.com/api-keys)에 접속
2. 로그인 후 API Keys 섹션으로 이동
3. "Create new secret key" 클릭
4. 생성된 키를 `.env` 파일에 복사

**실행 예시:**

환경 변수 없이 실행 (Mock 사용):
```bash
pnpm -C 02-xstate-examples run llm

# 출력:
# --- 환경 설정 확인 ---
# ⚠️  OPENAI_API_KEY가 설정되지 않았습니다.
# 🎭 Mock 응답을 사용합니다.
# -------------------
```

환경 변수와 함께 실행 (실제 API 사용):
```bash
export OPENAI_API_KEY=sk-...
pnpm -C 02-xstate-examples run llm

# 출력:
# --- 환경 설정 확인 ---
# ✅ OPENAI_API_KEY가 설정되었습니다.
# 🚀 실제 LLM API를 호출합니다.
# 📦 사용 모델: gpt-4o-mini
# -------------------
```

## 예제 실행

```bash
# 기본 FSM
pnpm -C 01-basic-fsm run toggle
pnpm -C 01-basic-fsm run traffic

# XState 예제
pnpm -C 02-xstate-examples run basic
pnpm -C 02-xstate-examples run form
pnpm -C 02-xstate-examples run fetch
pnpm -C 02-xstate-examples run llm    # 🆕 LLM 호출 예제

# 워크플로우 비교 (주문 처리)
pnpm -C 03-workflow-comparison run xstate
pnpm -C 03-workflow-comparison run mastra
pnpm -C 03-workflow-comparison run langgraph

# 워크플로우 비교 (LLM 챗봇) 🆕
pnpm -C 03-workflow-comparison run chatbot-xstate
pnpm -C 03-workflow-comparison run chatbot-mastra
pnpm -C 03-workflow-comparison run chatbot-langgraph

# 고급 주제
pnpm -C 04-advanced-topics run hierarchical
pnpm -C 04-advanced-topics run persistence
```

각 폴더의 `README.md`에 상세 설명이 있습니다.
