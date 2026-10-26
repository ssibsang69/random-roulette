/**
 * roulette.js - Canvas 기반 정밀 룰렛 렌더링 및 물리 회전 애니메이션 엔진
 * 
 * - 상단 고정 포인터(12시 방향, 270도/-90도) 기준 정밀 각도 역산
 * - 부드러운 감속 애니메이션 (ease-out quartic)
 * - 회전 시 틱 사운드 연동
 * - HiDPI (레티나 디스플레이) 선명도 대응
 * - 긴 텍스트 자동 축소 및 말줄임 지원
 */

class RouletteWheel {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // 12가지 밝고 구분하기 쉬운 모던 팔레트
    this.palette = [
      '#6C5CE7', // 퍼플
      '#FFD166', // 옐로우
      '#FF6B6B', // 코랄 레드
      '#4D96FF', // 스카이 블루
      '#6BCB77', // 에메랄드 그린
      '#FF9F43', // 오렌지
      '#9B59B6', // 자수정
      '#1DD1A1', // 민트
      '#54A0FF', // 블루
      '#FECA57', // 웜 옐로우
      '#EE5253', // 스트로베리
      '#10AC84'  // 딥 민트
    ];

    this.participants = [];
    this.currentAngle = 0; // 현재 룰렛의 누적 회전 각도 (라디안)
    this.isSpinning = false;
    this.animId = null;

    // 사운드 틱 발생용 이전 섹터 인덱스 추적
    this.lastTickSector = -1;

    // 크기 초기화
    this.initCanvasSize();
    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.draw();
    });
  }

  // 캔버스 해상도 최적화 (HiDPI 선명도 유지)
  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 기본 크기 기준
    const displaySize = Math.min(rect.width || 440, rect.height || 440);
    this.canvas.width = displaySize * dpr;
    this.canvas.height = displaySize * dpr;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 리셋
    this.ctx.scale(dpr, dpr);

    this.size = displaySize;
    this.center = displaySize / 2;
    this.radius = displaySize / 2 - 10; // 외곽 여백
  }

  // 참가자 목록 업데이트
  setParticipants(list) {
    this.participants = [...list];
    this.draw();
  }

  // 각 참가자별 색상 가져오기
  getParticipantColor(index) {
    return this.palette[index % this.palette.length];
  }

  // 룰렛 전체 렌더링
  draw() {
    if (!this.ctx) return;
    const { ctx, center, radius, currentAngle, participants } = this;
    const count = participants.length;

    ctx.clearRect(0, 0, this.size, this.size);

    // 참가자가 0명이거나 1명일 때의 가이드 렌더링
    if (count === 0) {
      this.drawEmptyState('참가자를 등록해 주세요');
      return;
    }
    if (count === 1) {
      this.drawSingleParticipantState(participants[0].name);
      return;
    }

    const sliceAngle = (2 * Math.PI) / count;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(currentAngle);

    // 1. 각 섹터 그리기
    for (let i = 0; i < count; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const color = this.getParticipantColor(i);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();

      // 섹터 구분선
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // 섹터 내 참가자 이름 텍스트 렌더링
      ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      ctx.rotate(midAngle);

      // 텍스트 위치: 중심에서 바깥쪽으로 약 65% 지점
      const textRadius = radius * 0.65;
      ctx.translate(textRadius, 0);
      // 텍스트가 바깥에서 안쪽으로 읽기 쉽도록 90도 회전
      ctx.rotate(Math.PI / 2);

      // 인원수에 따른 폰트 크기 자동 조절
      let fontSize = 16;
      if (count > 12) fontSize = 11;
      else if (count > 8) fontSize = 13;
      else if (count > 4) fontSize = 15;
      else fontSize = 17;

      ctx.font = `bold ${fontSize}px 'Pretendard', 'Noto Sans KR', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 텍스트 가독성을 위한 그림자 및 윤곽
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      // 긴 이름 처리 (최대 길이 제한)
      let displayName = participants[i].name;
      if (displayName.length > 7) {
        displayName = displayName.substring(0, 6) + '…';
      }

      ctx.fillText(displayName, 0, 0);
      ctx.restore();
    }

    // 2. 바깥쪽 테두리 링
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius + 2, 0, 2 * Math.PI);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.25)';
    ctx.stroke();

    ctx.restore();
  }

  // 참가자 0명일 때 기본 휠
  drawEmptyState(message) {
    const { ctx, center, radius } = this;
    ctx.save();
    ctx.translate(center, center);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#F3F4F6';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#E5E7EB';
    ctx.stroke();

    ctx.font = "bold 15px 'Pretendard', 'Noto Sans KR', sans-serif";
    ctx.fillStyle = '#9CA3AF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, 0, 0);

    ctx.restore();
  }

  // 참가자 1명일 때 휠
  drawSingleParticipantState(name) {
    const { ctx, center, radius } = this;
    ctx.save();
    ctx.translate(center, center);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.palette[0];
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.font = "bold 18px 'Pretendard', 'Noto Sans KR', sans-serif";
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.fillText(name, 0, 0);

    ctx.restore();
  }

  /**
   * 룰렛 회전 시작 및 당첨자 확정
   * @param {number} winnerIndex - 미리 공정하게 선정된 당첨자의 인덱스
   * @param {function} onComplete - 애니메이션 완료 시 호출될 콜백
   */
  spinToWinner(winnerIndex, onComplete) {
    if (this.isSpinning || this.participants.length < 2) return;
    this.isSpinning = true;

    const count = this.participants.length;
    const sliceAngle = (2 * Math.PI) / count;

    // 당첨자 섹터의 중심 각도 (기준 좌표계)
    const winnerMidAngle = winnerIndex * sliceAngle + sliceAngle / 2;

    // 12시 고정 포인터 위치: 270도 (3 * PI / 2)
    const pointerAngle = (3 * Math.PI) / 2;

    // 최종 정지 각도 공식:
    // (winnerMidAngle + targetAngle) ≡ pointerAngle (mod 2*PI)
    // targetAngle ≡ pointerAngle - winnerMidAngle (mod 2*PI)
    const twoPi = 2 * Math.PI;
    let targetOffset = (pointerAngle - winnerMidAngle) % twoPi;
    if (targetOffset < 0) targetOffset += twoPi;

    // 현재 각도의 모듈로
    const currentMod = this.currentAngle % twoPi;
    let diff = targetOffset - currentMod;
    if (diff < 0) diff += twoPi;

    // 자연스럽고 박진감 넘치는 6바퀴 회전 추가 (약 3.8초)
    const spinCount = 6;
    const startAngle = this.currentAngle;
    const endAngle = this.currentAngle + diff + (spinCount * twoPi);

    const duration = 3800; // 3.8초 (3~5초 범위)
    const startTime = performance.now();
    this.lastTickSector = -1;

    // 부드러운 감속 이징 (Quartic Ease-Out)
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      this.currentAngle = startAngle + (endAngle - startAngle) * easedProgress;

      // 회전 중 포인터를 통과하는 섹터 감지하여 '틱' 사운드 재생
      this.checkAndPlayTick(sliceAngle, pointerAngle);

      this.draw();

      if (progress < 1) {
        this.animId = requestAnimationFrame(animate);
      } else {
        // 정확한 최종 각도로 스냅
        this.currentAngle = endAngle;
        this.draw();
        this.isSpinning = false;
        this.animId = null;

        // 콜백 호출
        if (typeof onComplete === 'function') {
          onComplete(this.participants[winnerIndex]);
        }
      }
    };

    this.animId = requestAnimationFrame(animate);
  }

  // 12시 포인터에 걸리는 섹터가 변경될 때마다 틱 사운드 재생
  checkAndPlayTick(sliceAngle, pointerAngle) {
    const twoPi = 2 * Math.PI;
    // 현재 포인터 아래에 위치한 각도
    const relativeAngle = ((pointerAngle - (this.currentAngle % twoPi)) % twoPi + twoPi) % twoPi;
    const currentSector = Math.floor(relativeAngle / sliceAngle);

    if (currentSector !== this.lastTickSector) {
      this.lastTickSector = currentSector;
      if (window.soundController) {
        window.soundController.playTick();
      }
    }
  }

  // 현재 룰렛 초기화
  reset() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.isSpinning = false;
    this.currentAngle = 0;
    this.draw();
  }
}

window.RouletteWheel = RouletteWheel;
