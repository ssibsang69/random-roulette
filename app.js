/**
 * app.js - 오늘의 운명 룰렛 메인 컨트롤러
 * 
 * - 참가자 등록, 삭제, 중복/공백 유효성 검사
 * - 룰렛 연동 및 공정한 무작위 추첨 (Math.random)
 * - 회전 중 UI 제어 (비활성화 및 연속 클릭 방지)
 * - 결과 발표, 색종이 연출, 효과음 재생
 * - 최근 추첨 히스토리 관리 및 전체 초기화 확인 모달
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------
  // 1. 상태 관리 변수
  // --------------------------------------------------
  let participants = [
    { id: 1, name: '민수' },
    { id: 2, name: '지우' },
    { id: 3, name: '서연' },
    { id: 4, name: '현우' }
  ];
  let nextId = 5;
  let historyRecords = [];
  let isSpinning = false;

  // 당첨 축하 위트 문구 템플릿 목록
  const victoryPhrases = [
    (name) => `오늘 밥값은 ${name}에게 맡겨 보세요! 🍚`,
    (name) => `오늘의 설거지 당번은 바로 ${name}! 깨끗하게 부탁해요 🧼`,
    (name) => `모두 박수! 오늘의 커피는 ${name}가 쏩니다 ☕`,
    (name) => `운명의 선택을 받은 오늘의 주인공, ${name}! 🥳`,
    (name) => `오늘의 벌칙과 미션은 ${name}의 손에! 멋진 활약 기대해요 🎯`,
    (name) => `하늘이 정해준 운명! 오늘의 당첨자 ${name}에게 영광을 ⭐`
  ];

  // --------------------------------------------------
  // 2. DOM 요소 참조
  // --------------------------------------------------
  const participantInput = document.getElementById('participantInput');
  const addParticipantForm = document.getElementById('addParticipantForm');
  const addBtn = document.getElementById('addBtn');
  const inputFeedback = document.getElementById('inputFeedback');
  const participantListEl = document.getElementById('participantList');
  const emptyListStateEl = document.getElementById('emptyListState');
  const participantCountBadge = document.getElementById('participantCountBadge');
  const minParticipantsNotice = document.getElementById('minParticipantsNotice');
  const resetAllBtn = document.getElementById('resetAllBtn');
  const loadSampleBtn = document.getElementById('loadSampleBtn');

  const spinBtn = document.getElementById('spinBtn');
  const rouletteGuideText = document.getElementById('rouletteGuideText');
  const resultIdleState = document.getElementById('resultIdleState');
  const resultActiveState = document.getElementById('resultActiveState');
  const winnerNameEl = document.getElementById('winnerName');
  const winnerMessageEl = document.getElementById('winnerMessage');
  const spinAgainBtn = document.getElementById('spinAgainBtn');

  const historyListEl = document.getElementById('historyList');
  const historyCountEl = document.getElementById('historyCount');

  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const soundText = document.getElementById('soundText');

  const confirmModal = document.getElementById('confirmModal');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const modalConfirmBtn = document.getElementById('modalConfirmBtn');

  // 룰렛 인스턴스 초기화
  const roulette = new window.RouletteWheel('rouletteCanvas');

  // --------------------------------------------------
  // 3. 렌더링 및 UI 업데이트 함수들
  // --------------------------------------------------

  // 참가자 목록 DOM 렌더링
  function renderParticipants() {
    participantListEl.innerHTML = '';
    const count = participants.length;

    // 참가자 수 배지
    participantCountBadge.textContent = `${count}명`;

    // 0명일 때 빈 상태 표시
    if (count === 0) {
      emptyListStateEl.classList.remove('hidden');
    } else {
      emptyListStateEl.classList.add('hidden');
    }

    // 2명 미만일 때 경고 및 추첨 버튼 비활성화
    if (count < 2) {
      minParticipantsNotice.classList.remove('hidden');
      spinBtn.disabled = true;
      rouletteGuideText.textContent = count === 0 
        ? '참가자를 먼저 등록해 주세요' 
        : '최소 2명의 참가자가 필요합니다 (1명 추가 필요)';
    } else {
      minParticipantsNotice.classList.add('hidden');
      if (!isSpinning) {
        spinBtn.disabled = false;
        rouletteGuideText.textContent = '누가 오늘의 주인공이 될까요? ✨';
      }
    }

    // 아이템 리스트 생성
    participants.forEach((p, index) => {
      const li = document.createElement('li');
      li.className = 'participant-item';

      const color = roulette.getParticipantColor(index);

      li.innerHTML = `
        <div class="participant-meta">
          <span class="color-dot" style="background-color: ${color};"></span>
          <span class="participant-name">${escapeHtml(p.name)}</span>
        </div>
        <button class="btn-delete-item" data-id="${p.id}" title="${escapeHtml(p.name)} 삭제" aria-label="${escapeHtml(p.name)} 삭제" ${isSpinning ? 'disabled' : ''}>
          &times;
        </button>
      `;

      participantListEl.appendChild(li);
    });

    // 룰렛 캔버스 갱신
    roulette.setParticipants(participants);
  }

  // 최근 추첨 기록 DOM 렌더링
  function renderHistory() {
    historyListEl.innerHTML = '';
    historyCountEl.textContent = `${historyRecords.length}건`;

    if (historyRecords.length === 0) {
      historyListEl.innerHTML = '<li class="history-empty">아직 진행된 추첨 기록이 없습니다.</li>';
      return;
    }

    historyRecords.slice(0, 5).forEach((record) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <span><strong class="history-winner">${escapeHtml(record.name)}</strong> 당첨</span>
        <span class="history-time">${record.time}</span>
      `;
      historyListEl.appendChild(li);
    });
  }

  // 인풋 피드백 메시지 표시
  function showFeedback(msg, isError = true) {
    inputFeedback.textContent = msg;
    inputFeedback.style.color = isError ? 'var(--danger)' : 'var(--success)';
    if (msg) {
      setTimeout(() => {
        if (inputFeedback.textContent === msg) {
          inputFeedback.textContent = '';
        }
      }, 3000);
    }
  }

  // --------------------------------------------------
  // 4. 참가자 추가 / 삭제 핸들러
  // --------------------------------------------------

  function handleAddParticipant() {
    if (isSpinning) return;

    const rawName = participantInput.value;
    const trimmedName = rawName.trim();

    // 1) 비어있거나 공백만 있는 경우
    if (!trimmedName) {
      showFeedback('참가자 이름을 입력해 주세요.');
      participantInput.focus();
      return;
    }

    // 2) 중복 등록 방지
    const isDuplicate = participants.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      showFeedback(`"${trimmedName}"(은)는 이미 등록되어 있습니다.`);
      participantInput.select();
      return;
    }

    // 3) 글자 수 제한 (12자)
    if (trimmedName.length > 12) {
      showFeedback('이름은 최대 12자까지 입력할 수 있습니다.');
      return;
    }

    // 참가자 등록 성공
    participants.push({
      id: nextId++,
      name: trimmedName
    });

    participantInput.value = '';
    showFeedback('');
    renderParticipants();

    if (window.soundController) {
      window.soundController.playClick();
    }
  }

  // 참가자 개별 삭제
  participantListEl.addEventListener('click', (e) => {
    if (isSpinning) return;
    const deleteBtn = e.target.closest('.btn-delete-item');
    if (!deleteBtn) return;

    const id = parseInt(deleteBtn.dataset.id, 10);
    participants = participants.filter((p) => p.id !== id);
    renderParticipants();

    if (window.soundController) {
      window.soundController.playClick();
    }
  });

  // 폼 제출 (추가 버튼 또는 Enter 키)
  addParticipantForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAddParticipant();
  });

  // 예시 참가자 불러오기
  loadSampleBtn.addEventListener('click', () => {
    if (isSpinning) return;
    participants = [
      { id: nextId++, name: '민수' },
      { id: nextId++, name: '지우' },
      { id: nextId++, name: '서연' },
      { id: nextId++, name: '현우' }
    ];
    renderParticipants();
  });

  // --------------------------------------------------
  // 5. 룰렛 회전 및 당첨 연출 로직
  // --------------------------------------------------

  function startSpin() {
    // 예외 상황 방어
    if (isSpinning || participants.length < 2) return;

    // 회전 상태 전환 및 UI 잠금
    isSpinning = true;
    spinBtn.disabled = true;
    spinAgainBtn.disabled = true;
    addBtn.disabled = true;
    participantInput.disabled = true;
    resetAllBtn.disabled = true;

    // 안내 문구 변경
    rouletteGuideText.textContent = '두근두근... 운명의 룰렛이 돌아갑니다! 🌀';

    // 결과 표시창 초기화 (이전 결과 숨김)
    resultActiveState.classList.add('hidden');
    resultIdleState.classList.remove('hidden');
    resultIdleState.querySelector('.result-idle-text').textContent = '추첨 진행 중...';
    resultIdleState.querySelector('.result-idle-sub').textContent = '룰렛이 멈출 때까지 잠시만 기다려 주세요!';

    // 1. 공정한 무작위 당첨자 선정 (Math.random)
    const winnerIndex = Math.floor(Math.random() * participants.length);
    const chosenWinner = participants[winnerIndex];

    // 2. 룰렛 회전 시작 (목표 인덱스가 정확히 12시 포인터에 멈춤)
    roulette.spinToWinner(winnerIndex, (winner) => {
      // 3. 회전 완료 콜백 (포인터와 당첨자 100% 일치)
      handleSpinComplete(winner);
    });
  }

  // 회전 완료 후 결과 발표
  function handleSpinComplete(winner) {
    isSpinning = false;

    // 사운드 및 색종이 효과
    if (window.soundController) {
      window.soundController.playWin();
    }
    if (window.confettiEngine) {
      window.confettiEngine.start();
    }

    // 결과 영역 텍스트 반영
    winnerNameEl.textContent = winner.name;
    const randomPhraseFunc = victoryPhrases[Math.floor(Math.random() * victoryPhrases.length)];
    winnerMessageEl.textContent = randomPhraseFunc(winner.name);

    // 결과 활성화 상태 표시
    resultIdleState.classList.add('hidden');
    resultActiveState.classList.remove('hidden');
    rouletteGuideText.textContent = `🎉 오늘의 주인공은 바로 "${winner.name}"님입니다! 🎉`;

    // 히스토리 기록 추가
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    historyRecords.unshift({
      name: winner.name,
      time: timeStr
    });
    renderHistory();

    // UI 잠금 해제
    spinBtn.disabled = false;
    spinAgainBtn.disabled = false;
    addBtn.disabled = false;
    participantInput.disabled = false;
    resetAllBtn.disabled = false;
    renderParticipants();
  }

  // 추첨 버튼 클릭
  spinBtn.addEventListener('click', startSpin);

  // 한 번 더 추첨하기 버튼
  spinAgainBtn.addEventListener('click', startSpin);

  // --------------------------------------------------
  // 6. 전체 초기화 모달 로직
  // --------------------------------------------------

  resetAllBtn.addEventListener('click', () => {
    if (isSpinning) return;
    confirmModal.classList.remove('hidden');
  });

  modalCancelBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
  });

  // 모달 바깥 배경 클릭 시 닫기
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      confirmModal.classList.add('hidden');
    }
  });

  modalConfirmBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');

    // 데이터 초기화
    participants = [];
    historyRecords = [];
    roulette.reset();

    // 결과 영역 초기화
    resultActiveState.classList.add('hidden');
    resultIdleState.classList.remove('hidden');
    resultIdleState.querySelector('.result-idle-text').textContent = '아직 추첨하지 않았어요';
    resultIdleState.querySelector('.result-idle-sub').textContent = '참가자를 확인하고 룰렛을 돌려보세요!';
    
    if (window.confettiEngine) {
      window.confettiEngine.stop();
    }

    renderParticipants();
    renderHistory();
    showFeedback('전체 목록과 기록이 초기화되었습니다.', false);
  });

  // --------------------------------------------------
  // 7. 사운드 켜기/끄기 토글
  // --------------------------------------------------
  soundToggleBtn.addEventListener('click', () => {
    if (!window.soundController) return;
    const isMuted = window.soundController.toggleMute();
    if (isMuted) {
      soundIcon.textContent = '🔇';
      soundText.textContent = '효과음 OFF';
      soundToggleBtn.classList.add('muted');
    } else {
      soundIcon.textContent = '🔊';
      soundText.textContent = '효과음 ON';
      soundToggleBtn.classList.remove('muted');
      window.soundController.playClick();
    }
  });

  // --------------------------------------------------
  // 8. 보조 유틸리티 (XSS 방어)
  // --------------------------------------------------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 초기 렌더링 실행
  renderParticipants();
  renderHistory();
});
