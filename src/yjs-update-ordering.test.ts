import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

// State vector를 사람이 읽을 수 있는 형식으로 디코딩 (Y.js 내장 함수 사용)
function decodeStateVector(stateVector: Uint8Array): Record<number, number> {
  const stateMap = Y.decodeStateVector(stateVector);
  const result: Record<number, number> = {};
  
  // Map을 Record로 변환
  stateMap.forEach((clock, clientId) => {
    result[clientId] = clock;
  });
  
  return result;
}

// 업데이트 정보 분석
function analyzeUpdate(update: Uint8Array): any {
  // 업데이트의 기본 정보만 추출 (완전한 파싱은 복잡함)
  return {
    size: update.length,
    firstBytes: Array.from(update.slice(0, Math.min(8, update.length))),
  };
}

// 상태 로깅 함수 (개선된 버전)
function logDocState(ydoc: Y.Doc, ytext: Y.Text, step: string) {
  const stateVector = Y.encodeStateVector(ydoc);
  const textContent = ytext.toString();
  const decodedStateVector = decodeStateVector(stateVector);
  const stateMap = Y.decodeStateVector(stateVector);
  
  console.log(`\n=== ${step} ===`);
  console.log(`📝 Text content: "${textContent}"`);
  console.log(`📏 Text length: ${ytext.length}`);
  console.log(`🆔 Document clientID: ${ydoc.clientID}`);
  console.log(`🔄 State vector (raw bytes): [${Array.from(stateVector).join(', ')}]`);
  console.log(`🗂️  State vector (Y.js decoded):`, stateMap);
  console.log(`📊 State vector summary: ${stateMap.size} clients`);
  console.log(`Document (raw bytes): ${Array.from(Y.encodeStateAsUpdate(ydoc)).join(', ')}`);
  
  // 각 클라이언트별 상태 설명
  stateMap.forEach((clock, clientId) => {
    console.log(`   Client ${clientId}: clock ${clock}`);
  });
  
  return {
    content: textContent,
    length: ytext.length,
    stateVector: Array.from(stateVector),
    decodedStateVector,
    stateMap,
    clientID: ydoc.clientID,
  };
}

// 업데이트 생성 함수 (개선된 버전)
function generateUpdates(): { updates: Uint8Array[], sourceClientID: number } {
  console.log('\n🔧 Generating updates...');
  
  const sourceDoc = new Y.Doc();
  const sourceText = sourceDoc.getText('test');
  const updates: Uint8Array[] = [];
  
  console.log(`📍 Source document clientID: ${sourceDoc.clientID}`);
  
  sourceDoc.on('update', (update: Uint8Array) => {
    const updateInfo = analyzeUpdate(update);
    console.log(`📦 Update captured: size=${updateInfo.size}, firstBytes=[${updateInfo.firstBytes.join(', ')}]`);
    updates.push(update);
  });
   
  // 각 변경사항을 개별 업데이트로 캡처
  console.log('\n🔄 Making changes...');
  
  // 업데이트 1: "" → "A"
  console.log('Making change 1: insert "A" at 0');
  sourceText.insert(0, 'A');
  
  // 업데이트 2: "A" → "AB"  
  console.log('Making change 2: insert "B" at 1');
  sourceText.insert(1, 'B');
  
  // 업데이트 3: "AB" → "ABC"
  console.log('Making change 3: insert "C" at 2');
  sourceText.insert(2, 'C');
  
  // 업데이트 4: "ABC" → "ABCD"
  console.log('Making change 4: insert "D" at 3');
  sourceText.insert(3, 'D');
  
  console.log(`\n✅ Generated ${updates.length} updates`);
  console.log(`📄 Final source text: "${sourceText.toString()}"`);
  
  // 각 업데이트 정보 출력
  updates.forEach((update, index) => {
    const info = analyzeUpdate(update);
    console.log(`   Update ${index + 1}: ${info.size} bytes`);
  });
  
  return { updates, sourceClientID: sourceDoc.clientID };
}

describe('Y.js Update Ordering Test', () => {
  it('should handle out-of-order updates correctly (1,2,4,3)', () => {
    console.log('\n🚀 Starting update ordering test...');
    console.log('Expected behavior: 4th update should be pending until 3rd is applied');
    
    // 1. 업데이트 생성
    const { updates, sourceClientID } = generateUpdates();
    expect(updates).toHaveLength(4);
    
    // 2. 새로운 doc에서 1,2,4,3 순서로 적용
    const testDoc = new Y.Doc();
    const testText = testDoc.getText('test');
    
    console.log(`\n🎯 Target document clientID: ${testDoc.clientID}`);
    console.log(`🔗 Source clientID: ${sourceClientID}`);
    
    // transaction 이벤트 추적
    const transactionEvents: string[] = [];
    testDoc.on('beforeTransaction', () => {
      transactionEvents.push('before');
      console.log('\n📝 Before transaction');
    });
    
    testDoc.on('afterTransaction', () => {
      transactionEvents.push('after');
      console.log('✅ After transaction');
    });
    
    // 초기 상태
    const initialState = logDocState(testDoc, testText, 'Initial state');
    expect(initialState.content).toBe('');
    expect(initialState.length).toBe(0);
    
    // 업데이트 1 적용
    console.log('\n📦 Applying update 1...');
    Y.applyUpdate(testDoc, updates[0]);
    const state1 = logDocState(testDoc, testText, 'After update 1');
    expect(state1.content).toBe('A');
    expect(state1.length).toBe(1);
    
    // 업데이트 2 적용  
    console.log('\n📦 Applying update 2...');
    Y.applyUpdate(testDoc, updates[1]);
    const state2 = logDocState(testDoc, testText, 'After update 2');
    expect(state2.content).toBe('AB');
    expect(state2.length).toBe(2);
    
    // 업데이트 4 적용 (3번 건너뛰고) - 핵심 테스트 포인트
    console.log('\n📦 Applying update 4 (skipping 3)...');
    console.log('🔍 This should demonstrate the pending behavior...');
    Y.applyUpdate(testDoc, updates[3]);
    const state4 = logDocState(testDoc, testText, 'After update 4 (should be pending)');
    
    // 4번 업데이트가 pending 되었는지 확인
    console.log('\n🔍 Checking if update 4 is pending...');
    console.log(`Text after update 4: "${state4.content}"`);
    console.log(`Expected: "AB" if pending, "ABCD" if immediately applied`);
    
    // State vector 변화 분석
    console.log('\n📈 State vector analysis:');
    const clockBefore = state2.stateMap.get(sourceClientID) || 0;
    const clockAfter = state4.stateMap.get(sourceClientID) || 0;
    console.log(`Before update 4: Client ${sourceClientID} clock was ${clockBefore}`);
    console.log(`After update 4: Client ${sourceClientID} clock is ${clockAfter}`);
    console.log(`Clock difference: ${clockAfter - clockBefore}`);
    
    // 업데이트 3 적용 (4번이 함께 적용되어야 함) - 핵심 테스트 포인트
    console.log('\n📦 Applying update 3 (should trigger 4)...');
    console.log('🔍 This should apply both update 3 and pending update 4...');
    const transactionCountBefore3 = transactionEvents.length;
    Y.applyUpdate(testDoc, updates[2]);
    const finalState = logDocState(testDoc, testText, 'After update 3 (4 should be applied too)');
    
    // 최종 상태 검증
    expect(finalState.content).toBe('ABCD');
    expect(finalState.length).toBe(4);
    
    console.log('\n✨ Test completed!');
    console.log(`Total transaction events: ${transactionEvents.length}`);
    
    // 상태 변화 요약 출력
    console.log('\n📊 State changes summary:');
    console.log(`Initial: "" → After 1: "${state1.content}" → After 2: "${state2.content}" → After 4: "${state4.content}" → Final: "${finalState.content}"`);
    
    // clock 변화 추적
    console.log('\n🕰️ Clock progression:');
    console.log(`Initial: ${initialState.stateMap.get(sourceClientID) || 0}`);
    console.log(`After 1: ${state1.stateMap.get(sourceClientID) || 0}`);
    console.log(`After 2: ${state2.stateMap.get(sourceClientID) || 0}`);
    console.log(`After 4: ${state4.stateMap.get(sourceClientID) || 0}`);
    console.log(`Final: ${finalState.stateMap.get(sourceClientID) || 0}`);
    
    // 실험 결과 분석
    console.log('\n🧪 Experiment Analysis:');
    if (state4.content === 'AB' && finalState.content === 'ABCD') {
      console.log('✅ HYPOTHESIS CONFIRMED: Update 4 was pending until update 3 was applied!');
    } else if (state4.content === 'ABCD') {
      console.log('❌ HYPOTHESIS REJECTED: Update 4 was applied immediately (no pending behavior)');
    } else {
      console.log('🤔 UNEXPECTED: Something else happened...');
    }
  });
  
  it('should handle normal order updates correctly (1,2,3,4) for comparison', () => {
    console.log('\n🔄 Testing normal order (1,2,3,4) for comparison...');
    
    const { updates, sourceClientID } = generateUpdates();
    const testDoc = new Y.Doc();
    const testText = testDoc.getText('test');
    
    console.log(`\n🎯 Comparison test - Target clientID: ${testDoc.clientID}, Source clientID: ${sourceClientID}`);
    
    // 순차적으로 적용
    Y.applyUpdate(testDoc, updates[0]);
    const state1 = logDocState(testDoc, testText, 'Normal order - After 1');
    expect(state1.content).toBe('A');
    
    Y.applyUpdate(testDoc, updates[1]);
    const state2 = logDocState(testDoc, testText, 'Normal order - After 2');
    expect(state2.content).toBe('AB');
    
    Y.applyUpdate(testDoc, updates[2]);
    const state3 = logDocState(testDoc, testText, 'Normal order - After 3');
    expect(state3.content).toBe('ABC');
    
    Y.applyUpdate(testDoc, updates[3]);
    const state4 = logDocState(testDoc, testText, 'Normal order - After 4');
    expect(state4.content).toBe('ABCD');
    
    console.log('✅ Normal order test completed');
    
    // 정상 순서에서의 clock 진행 확인
    console.log('\n🕰️ Normal order clock progression:');
    console.log(`After 1: ${state1.stateMap.get(sourceClientID) || 0}`);
    console.log(`After 2: ${state2.stateMap.get(sourceClientID) || 0}`);
    console.log(`After 3: ${state3.stateMap.get(sourceClientID) || 0}`);
    console.log(`After 4: ${state4.stateMap.get(sourceClientID) || 0}`);
  });
}); 
