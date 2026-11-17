// Sound synthesis using Web Audio API (zero external assets needed)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.ringtoneInterval = null;
    this.dialToneInterval = null;
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Soft notification ping when a new message arrives
  playMessagePing() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.16); // D6

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  // Incoming call melody (WhatsApp-like rhythmic melodic ring)
  startIncomingRingtone() {
    this.stopIncomingRingtone();
    const playBurst = () => {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + idx * 0.15;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
      } catch {}
    };

    playBurst();
    this.ringtoneInterval = setInterval(playBurst, 2200);
  }

  stopIncomingRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  // Outgoing dial ring tone (repeating gentle double-pip)
  startOutgoingTone() {
    this.stopOutgoingTone();
    const playDialPip = () => {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;

        [0, 0.2].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = ctx.currentTime + offset;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, t); // standard 440Hz dial

          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.14);
        });
      } catch {}
    };

    playDialPip();
    this.dialToneInterval = setInterval(playDialPip, 2400);
  }

  stopOutgoingTone() {
    if (this.dialToneInterval) {
      clearInterval(this.dialToneInterval);
      this.dialToneInterval = null;
    }
  }

  stopAll() {
    this.stopIncomingRingtone();
    this.stopOutgoingTone();
  }
}

export const sounds = new SoundManager();
