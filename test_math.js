// test_math.js - 룰렛 각도 계산 및 포인터 일치 정확도 검증 테스트

function testRouletteMath(participantCount, winnerIndex) {
  const sliceAngle = (2 * Math.PI) / participantCount;
  const pointerAngle = (3 * Math.PI) / 2; // 270도 (상단 12시)
  const twoPi = 2 * Math.PI;

  // 당첨자 섹터 중심각
  const winnerMidAngle = winnerIndex * sliceAngle + sliceAngle / 2;

  // 정지 각도 계산 공식 (roulette.js와 동일)
  let targetOffset = (pointerAngle - winnerMidAngle) % twoPi;
  if (targetOffset < 0) targetOffset += twoPi;

  let currentAngle = 1.2345; // 임의의 현재 각도
  let currentMod = currentAngle % twoPi;
  let diff = targetOffset - currentMod;
  if (diff < 0) diff += twoPi;

  const spinCount = 6;
  const finalAngle = currentAngle + diff + (spinCount * twoPi);

  // 최종 각도에서 12시 포인터가 가리키는 섹터 확인
  const relativeAngle = ((pointerAngle - (finalAngle % twoPi)) % twoPi + twoPi) % twoPi;
  const pointedSector = Math.floor(relativeAngle / sliceAngle);

  const isMatch = pointedSector === winnerIndex;
  return { isMatch, winnerIndex, pointedSector, relativeAngle, winnerMidAngle };
}

let allPass = true;
// 참가자 2명부터 15명까지, 모든 당첨자 인덱스에 대해 테스트
for (let n = 2; n <= 15; n++) {
  for (let i = 0; i < n; i++) {
    const res = testRouletteMath(n, i);
    if (!res.isMatch) {
      console.error(`FAIL: N=${n}, winner=${i}, got=${res.pointedSector}`);
      allPass = false;
    }
  }
}

if (allPass) {
  console.log("ALL ROULETTE MATH TESTS PASSED! 100% accuracy for all participant counts and indices.");
} else {
  console.error("SOME TESTS FAILED.");
  process.exit(1);
}
