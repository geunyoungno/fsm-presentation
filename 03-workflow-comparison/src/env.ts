/**
 * 환경 변수 타입 정의 및 로드
 */

import path from 'node:path';
import { config } from 'dotenv';

export interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env')
];

/**
 * 환경 변수 검증 및 로드
 */
export function loadEnv(): Env {
  for (const envPath of ENV_CANDIDATES) {
    const result = config({ path: envPath });
    if (!result.error) {
      break;
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // 환경 변수 상태 로깅
  console.log('\n--- 환경 설정 확인 ---');
  if (apiKey) {
    console.log('✅ OPENAI_API_KEY가 설정되었습니다.');
    console.log('🚀 실제 LLM API를 호출합니다.');
    console.log(`📦 사용 모델: ${model}`);
  } else {
    console.log('⚠️  OPENAI_API_KEY가 설정되지 않았습니다.');
    console.log('🎭 Mock 응답을 사용합니다.');
    console.log('💡 실제 LLM을 사용하려면 .env 파일에 OPENAI_API_KEY를 설정하세요.');
  }
  console.log('-------------------\n');

  return {
    OPENAI_API_KEY: apiKey,
    OPENAI_MODEL: model
  };
}

/**
 * OpenAI API 사용 가능 여부 확인
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * 실제 OpenAI API 호출
 */
export async function callOpenAI(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: conversationHistory,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content || '';
}
