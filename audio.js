/**
 * audio.js - Web Audio API 기반의 가볍고 선명한 효과음 모듈
 * 외부 오디오 파일 없이 순수 브라우저 신디사이저로 생성하여 100% 동작 보장
 */

class SoundController {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
  }

  // AudioContext 초기화 (사용자 제스처 후 호출)
  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // 룰렛 회전 시 핀을 스쳐 지나갈 때 나는 경쾌한 '틱' 소리
  playTick(frequency = 600) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {
      // AudioContext 정책 방어
    }
  }

  // 당첨 순간 울리는 밝고 경쾌한 3화음 차임 (빰! 빠! 밤!)
  playWin() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = this.audioCtx.currentTime;

      notes.forEach((freq, index) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, now + index * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.45);
      });
    } catch (e) {
      // AudioContext 정책 방어
    }
  }

  // 클릭 버튼 사운드
  playClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
    } catch (e) {}
  }
}

// 전역 싱글톤 등록
window.soundController = new SoundController();
