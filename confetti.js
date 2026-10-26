/**
 * confetti.js - 경량 Canvas 색종이 파티클 애니메이션
 * 화면을 가리지 않고 2.5초간 은은하게 흩날리는 부드러운 축하 효과
 */

class ConfettiEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.colors = ['#6C5CE7', '#FFD166', '#FF6B6B', '#4D96FF', '#6BCB77', '#FF9F43'];

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    if (!this.canvas) return;
    this.resize();
    this.particles = [];

    // 파티클 60개 생성
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * (this.canvas.height * 0.4) - 20, // 화면 상단 부근에서 시작
        size: Math.random() * 8 + 5,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: Math.random() * 3 + 2.5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1
      });
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.render();
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let activeParticles = 0;

    for (const p of this.particles) {
      p.x += p.velocityX;
      p.y += p.velocityY;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.007; // 서서히 사라짐 (약 2.5초 지속)

      if (p.opacity > 0 && p.y < this.canvas.height) {
        activeParticles++;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        this.ctx.fillStyle = p.color;
        // 직사각형 색종이 조각
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        this.ctx.restore();
      }
    }

    if (activeParticles > 0) {
      this.animationId = requestAnimationFrame(() => this.render());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.animationId = null;
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

window.confettiEngine = new ConfettiEngine('confettiCanvas');
