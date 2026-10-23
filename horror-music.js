/* Browser music controller. Load once, then instantiate once per game. */
(() => {
  'use strict';
  const defaultBase = new URL('./audio/', document.currentScript.src).href;
  class HorrorMusic extends EventTarget {
    constructor({ baseURL = defaultBase, volume = 0.35, crossfade = 6,
      manualFade = 3, storageKey = 'horror.music.volume.v1' } = {}) {
      super();
      this.tracks = [
        { title: 'Illusion', file: 'illusion.mp3' },
        { title: 'Trava', file: 'trava.mp3' },
        { title: 'Марш', file: 'march.mp3' },
        { title: 'Фантазия', file: 'fantasy.mp3' }
      ];
      this.baseURL = new URL(baseURL, document.baseURI).href.replace(/\/?$/, '/');
      this.storageKey = storageKey;
      this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null && Number.isFinite(Number(saved)))
          this.volume = Math.max(0, Math.min(1, Number(saved)));
      } catch (_) { /* Private browsing may disable storage. */ }
      this.crossfade = Math.max(0.1, Number(crossfade) || 6);
      this.manualFade = Math.max(0.1, Number(manualFade) || 3);
      this.index = 0;
      this.playing = false;
      this.busy = false;
      this.destroyed = false;
      this.error = '';
      this.retryAfter = 0;
      this.generation = 0;
    }
    get state() {
      return { index: this.index, title: this.tracks[this.index].title,
        volume: this.volume, playing: this.playing, busy: this.busy, error: this.error };
    }
    emit() { this.dispatchEvent(new CustomEvent('change', { detail: this.state })); }
    init() {
      if (this.destroyed) throw new Error('Music controller has been destroyed');
      if (this.ctx) return;
      const Context = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Context(); // Separate from SFX: game pause must not suspend this context.
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.decks = this.tracks.map(track => {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        // Embedded data URLs retain offline index.html launching without a local server.
        audio.src = window.BRAIN_FOG_MUSIC?.[track.file] || new URL(track.file, this.baseURL).href;
        audio.loop = false;
        const source = this.ctx.createMediaElementSource(audio);
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(this.master);
        audio.addEventListener('timeupdate', () => this.tick());
        audio.addEventListener('ended', () => this.tick());
        audio.load();
        return { audio, source, gain };
      });
      this.timer = setInterval(() => this.tick(), 100);
    }
    setVolume(value) {
      if (!Number.isFinite(Number(value))) return;
      this.volume = Math.max(0, Math.min(1, Number(value)));
      if (this.master) {
        const p = this.master.gain, now = this.ctx.currentTime;
        p.cancelScheduledValues(now);
        p.setTargetAtTime(this.volume, now, 0.02);
      }
      try { localStorage.setItem(this.storageKey, String(this.volume)); } catch (_) {}
      this.emit();
    }
    start() { return this.select(this.index, 1.5); }
    next() { return this.select((this.index + 1) % this.tracks.length, this.manualFade); }
    previous() {
      return this.select((this.index + this.tracks.length - 1) % this.tracks.length, this.manualFade);
    }
    async select(index, seconds = this.manualFade) {
      if (this.destroyed || this.busy) return false;
      if (!Number.isInteger(index) || index < 0 || index >= this.tracks.length)
        throw new RangeError('Invalid track index');
      if (this.playing && index === this.index) {
        await this.ctx.resume();
        await this.decks[index].audio.play();
        return true;
      }
      this.busy = true;
      this.error = '';
      this.emit();
      const generation = this.generation;
      let next;
      let timeout;
      try {
        this.init();
        next = this.decks[index];
        const old = this.playing ? this.decks[this.index] : null;
        const resumed = this.ctx.resume(); // Called directly from click, before any await.
        next.audio.currentTime = 0;
        const started = next.audio.play();
        await Promise.race([
          Promise.all([resumed, started]),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(
            new Error('Could not load music. Extract the complete archive and try again.')), 15000); })
        ]);
        clearTimeout(timeout);
        if (generation !== this.generation) { next.audio.pause(); return false; }
        const now = this.ctx.currentTime;
        let duration = Math.max(0.1, Number(seconds) || 3);
        if (old && Number.isFinite(old.audio.duration))
          duration = Math.min(duration, Math.max(0.1, old.audio.duration - old.audio.currentTime));
        const incoming = new Float32Array(129), outgoing = new Float32Array(129);
        for (let i = 0; i < incoming.length; i++) {
          const angle = i / (incoming.length - 1) * Math.PI / 2;
          incoming[i] = Math.sin(angle);
          outgoing[i] = Math.cos(angle);
        }
        incoming[0] = 0; incoming[128] = 1;
        outgoing[0] = 1; outgoing[128] = 0;
        next.gain.gain.cancelScheduledValues(now);
        next.gain.gain.setValueCurveAtTime(incoming, now, duration);
        if (old) {
          old.gain.gain.cancelScheduledValues(now);
          old.gain.gain.setValueCurveAtTime(outgoing, now, duration);
        }
        this.index = index;
        this.playing = true;
        this.transition = { old, end: now + duration };
        this.emit();
        return true;
      } catch (error) {
        clearTimeout(timeout);
        if (generation !== this.generation) return false;
        if (next) next.audio.pause();
        this.busy = false;
        this.error = error.message || 'Could not start music';
        this.retryAfter = Date.now() + 15000;
        this.emit();
        throw error;
      }
    }
    tick() {
      if (!this.ctx || this.destroyed) return;
      if (this.transition && this.ctx.currentTime >= this.transition.end) {
        if (this.transition.old) {
          this.transition.old.audio.pause();
          this.transition.old.audio.currentTime = 0;
        }
        this.transition = null;
        this.busy = false;
        this.emit();
      }
      if (!this.playing || this.busy || this.ctx.state !== 'running' || Date.now() < this.retryAfter) return;
      const audio = this.decks[this.index].audio;
      if (audio.ended || (Number.isFinite(audio.duration) && audio.duration - audio.currentTime <= this.crossfade))
        this.select((this.index + 1) % this.tracks.length, this.crossfade).catch(() => {});
    }
    bindControls(root) {
      const prev = root.querySelector('[data-music-prev]');
      const next = root.querySelector('[data-music-next]');
      const slider = root.querySelector('[data-music-volume]');
      const title = root.querySelector('[data-music-title]');
      const output = root.querySelector('[data-music-percent]');
      const status = root.querySelector('[data-music-status]');
      const abort = new AbortController(), options = { signal: abort.signal };
      prev?.addEventListener('click', () => this.previous().catch(() => {}), options);
      next?.addEventListener('click', () => this.next().catch(() => {}), options);
      slider?.addEventListener('input', () => this.setVolume(Number(slider.value) / 100), options);
      const render = () => {
        const state = this.state;
        if (title) title.textContent = state.title;
        if (slider) slider.value = String(Math.round(state.volume * 100));
        if (output) output.textContent = Math.round(state.volume * 100) + '%';
        if (prev) prev.disabled = state.busy || !state.playing;
        if (next) next.disabled = state.busy || !state.playing;
        if (status) status.textContent = state.error || (state.busy ? 'Crossfading…' : '');
      };
      this.addEventListener('change', render, options);
      render();
      return () => abort.abort();
    }
    async destroy() {
      this.destroyed = true;
      this.generation++;
      clearInterval(this.timer);
      for (const deck of this.decks || []) {
        deck.audio.pause();
        deck.audio.removeAttribute('src');
        deck.audio.load();
        deck.source.disconnect();
        deck.gain.disconnect();
      }
      this.master?.disconnect();
      if (this.ctx && this.ctx.state !== 'closed') await this.ctx.close();
      this.playing = false;
      this.busy = false;
      this.emit();
    }
  }
  window.HorrorMusic = HorrorMusic;
})();
