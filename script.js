// --- START OF FILE script.js (Enhanced by Amartha - Crackle Reduction v1) ---

const { createApp, ref, onMounted, onUnmounted, nextTick, watch } = Vue;

const app = createApp({
    setup() {
        // --- State (Unchanged) ---
        const canvas = ref(null);
        let ctx = null;
        let animationFrameId = null;
        let motes = [];
        const numMotes = 150;
        const mouse = { x: null, y: null, radius: 150, interactingMoteIds: new Set(), };
        let audioCtx = null;
        let masterGain = null;
        let reverbNode = null;
        let reverbGain = null;
        let limiterNode = null;
        let userInteracted = ref(false);
        let isAudioReady = false;
        let _targetMasterGain = 0.0;

        // --- Helper Functions ---
        function getPitchFromScale(value, maxInput, baseFreq = 110, octaveRange = 3) {
            if (!maxInput || maxInput <= 0) return baseFreq; let normalizedValue = 1 - value / maxInput; normalizedValue = Math.max(0, Math.min(1, normalizedValue)); const totalSteps = (pentatonicSteps.length - 1) * octaveRange; let stepIndex = Math.floor(normalizedValue * totalSteps); stepIndex = Math.max(0, Math.min(totalSteps - 1, stepIndex)); const octave = Math.floor(stepIndex / (pentatonicSteps.length - 1)); const noteInOctave = stepIndex % (pentatonicSteps.length - 1); const semitones = octave * 12 + pentatonicSteps[noteInOctave]; const calculatedFreq = baseFreq * Math.pow(2, semitones / 12); return isFinite(calculatedFreq) && calculatedFreq > 0 ? calculatedFreq : baseFreq;
        }

        // *** MODIFIED mapValueToGain ***
        function mapValueToGain(
            value,
            maxInput,
            minGain = 0.001,
            maxGain = 0.025 // <<< REDUCED Max Gain <<<
        ) {
            if (!maxInput || maxInput <= 0) return minGain;
            let normalizedValue = value / maxInput;
            normalizedValue = Math.max(0, Math.min(1, normalizedValue));
            const calculatedGain = minGain + normalizedValue * (maxGain - minGain);
            return isFinite(calculatedGain) && calculatedGain >= 0 ? calculatedGain : minGain;
        }
        const pentatonicSteps = [0, 2, 4, 7, 9, 12];
        function createPseudoReverbImpulse(duration = 1.5, decay = 1.0) { if (!audioCtx) return null; const sampleRate = audioCtx.sampleRate; const length = sampleRate * duration; const impulse = audioCtx.createBuffer(2, length, sampleRate); const impulseL = impulse.getChannelData(0); const impulseR = impulse.getChannelData(1); for (let i = 0; i < length; i++) { const p = Math.pow(1 - i / length, decay); const n = Math.random() * 2 - 1; impulseL[i] = n * p; impulseR[i] = n * p; } return impulse; }

        // --- Mote Class ---
        class Mote {
            constructor(x, y, canvasWidth, canvasHeight, id) { this.id = id; this.x = x; this.y = y; this.size = Math.random() * 2.5 + 0.8; this.baseAlpha = Math.random() * 0.4 + 0.2; this.alpha = this.baseAlpha; this.vx = (Math.random() - 0.5) * 0.6; this.vy = (Math.random() - 0.5) * 0.6; this.canvasWidth = canvasWidth; this.canvasHeight = canvasHeight; this.maxSpeed = 1.5; this.baseColorVal = Math.floor(Math.random() * 55 + 200); this.oscillator = null; this.gainNode = null; this.isConnected = false; this.currentGain = 0; }
            startSound() { if (!isAudioReady || this.oscillator || !audioCtx || !masterGain || !reverbNode || !reverbGain) return; try { this.oscillator = audioCtx.createOscillator(); this.gainNode = audioCtx.createGain(); this.oscillator.type = "sine"; const initialFreq = getPitchFromScale(this.y, this.canvasHeight); const initialGain = 0; this.currentGain = initialGain; this.oscillator.frequency.setValueAtTime(initialFreq, audioCtx.currentTime); this.gainNode.gain.setValueAtTime(initialGain, audioCtx.currentTime); this.oscillator.connect(this.gainNode); this.gainNode.connect(masterGain); this.gainNode.connect(reverbGain); this.oscillator.start(); this.isConnected = true; } catch (error) { console.error("Error starting mote sound:", error); this.stopSound(); } }
            stopSound() { try { if (this.gainNode) { this.gainNode.gain.cancelScheduledValues(audioCtx ? audioCtx.currentTime : 0); } if (this.oscillator) { this.oscillator.stop(); this.oscillator.disconnect(); } if (this.gainNode) { this.gainNode.disconnect(); } } catch (error) { } finally { this.oscillator = null; this.gainNode = null; this.isConnected = false; } }
            updateSound() { if (!this.isConnected || !this.oscillator || !this.gainNode || !audioCtx) return; const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy); const targetFreq = getPitchFromScale(this.y, this.canvasHeight); const targetGain = mapValueToGain(speed, this.maxSpeed /*, uses default min/maxGain now */); if (isFinite(targetFreq) && targetFreq > 0) { this.oscillator.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1); } else { /* warning */ } const safeTargetGain = Math.max(0.0001, targetGain); if (isFinite(safeTargetGain)) { if (Math.abs(this.currentGain - safeTargetGain) > 0.0001) { this.gainNode.gain.setTargetAtTime(safeTargetGain, audioCtx.currentTime, 0.08); this.currentGain = safeTargetGain; } } else { /* warning */ } }

            // *** MODIFIED triggerInteractionSound ***
            triggerInteractionSound() {
                if (!isAudioReady || !this.gainNode || !audioCtx || !this.isConnected) return;
                const now = audioCtx.currentTime;

                // Calculate peak gain, adding a smaller bump
                const peakGain = this.currentGain + 0.06; // <<< REDUCED Spike <<<

                if (isFinite(peakGain) && peakGain > this.currentGain) {
                    const actualCurrentGain = this.gainNode.gain.value;
                    this.gainNode.gain.cancelScheduledValues(now);
                    this.gainNode.gain.setValueAtTime(actualCurrentGain, now);
                    this.gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.02);
                    this.gainNode.gain.setTargetAtTime(this.currentGain, now + 0.03, 0.1);
                } else {
                    console.warn(`Invalid peakGain (${peakGain}) for interaction on Mote ${this.id}`);
                }
            }
            // Update and Draw methods unchanged from previous correct version
            update(mouseX, mouseY, influenceRadius) { const wasInteracting = mouse.interactingMoteIds.has(this.id); let isInteracting = false; if (mouseX !== null && mouseY !== null) { const dx = this.x - mouseX; const dy = this.y - mouseY; const distance = Math.sqrt(dx * dx + dy * dy) + 1e-5; const maxDistance = influenceRadius; if (distance < maxDistance) { isInteracting = true; const forceDirectionX = dx / distance; const forceDirectionY = dy / distance; const force = (1 - distance / maxDistance) * 0.15; if (isFinite(forceDirectionX) && isFinite(forceDirectionY)) { this.vx += forceDirectionX * force; this.vy += forceDirectionY * force; } this.alpha = Math.max(0.1, this.baseAlpha * (distance / maxDistance)); if (!wasInteracting && this.isConnected) { this.triggerInteractionSound(); mouse.interactingMoteIds.add(this.id); } } } if (!isInteracting) { this.alpha += (this.baseAlpha - this.alpha) * 0.05; if (wasInteracting) { mouse.interactingMoteIds.delete(this.id); } } this.vx *= 0.985; this.vy *= 0.985; const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy); if (speed > this.maxSpeed && this.maxSpeed > 0) { this.vx = (this.vx / speed) * this.maxSpeed; this.vy = (this.vy / speed) * this.maxSpeed; } this.x += this.vx; this.y += this.vy; if (this.x > this.canvasWidth + this.size) this.x = -this.size; else if (this.x < -this.size) this.x = this.canvasWidth + this.size; if (this.y > this.canvasHeight + this.size) this.y = -this.size; else if (this.y < -this.size) this.y = this.canvasHeight + this.size; if (this.isConnected) { this.updateSound(); } }
            draw(ctx) { const colorVal = Math.floor(this.baseColorVal); ctx.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, ${this.alpha})`; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }
        } // End Mote Class

        // --- Initialization & Control (Includes Limiter/Visibility setup) ---
        function initAudio() { if (audioCtx) return; try { console.log("Amartha preparing the orchestra..."); audioCtx = new (window.AudioContext || window.webkitAudioContext)(); masterGain = audioCtx.createGain(); masterGain.gain.value = 0.6; _targetMasterGain = 0.6; reverbNode = audioCtx.createConvolver(); reverbGain = audioCtx.createGain(); reverbGain.gain.value = 0.6; const impulse = createPseudoReverbImpulse(1.5, 1.0); if (impulse && reverbNode) { reverbNode.buffer = impulse; } else { console.warn("Failed to create reverb buffer"); } limiterNode = audioCtx.createDynamicsCompressor(); limiterNode.threshold.setValueAtTime(-1, audioCtx.currentTime); limiterNode.knee.setValueAtTime(0, audioCtx.currentTime); limiterNode.ratio.setValueAtTime(20, audioCtx.currentTime); limiterNode.attack.setValueAtTime(0.005, audioCtx.currentTime); limiterNode.release.setValueAtTime(0.050, audioCtx.currentTime); if (reverbGain && reverbNode) reverbGain.connect(reverbNode); if (reverbNode && masterGain) reverbNode.connect(masterGain); if (masterGain && limiterNode) masterGain.connect(limiterNode); if (limiterNode && audioCtx) limiterNode.connect(audioCtx.destination); isAudioReady = true; console.log("Audio Context ready (with Limiter). Waiting for user interaction..."); } catch (e) { console.error("Web Audio API failed!", e); isAudioReady = false; } }
        function unlockAudio() { if (!isAudioReady && !audioCtx) initAudio(); if (!audioCtx) { console.error("Cannot unlock, AudioContext not available."); return; } if (audioCtx.state === "suspended") { audioCtx.resume().then(() => { console.log("Audio Context Resumed! Let the music begin."); userInteracted.value = true; handleVisibilityChange(); motes.forEach((mote) => { if (!mote.isConnected) mote.startSound(); }); }).catch((e) => console.error("Audio Context resume failed: ", e)); } else if (audioCtx.state === "running") { userInteracted.value = true; motes.forEach((mote) => { if (!mote.isConnected) mote.startSound(); }); } }
        function initMotes(width, height) { motes.forEach((mote) => mote.stopSound()); motes = []; mouse.interactingMoteIds.clear(); if (!width || !height) return; for (let i = 0; i < numMotes; i++) { motes.push(new Mote(Math.random() * width, Math.random() * height, width, height, i)); } if (userInteracted.value && isAudioReady) { motes.forEach((mote) => mote.startSound()); } console.log(`Initialized ${numMotes} motes for a ${width}x${height} canvas.`); }
        function handleVisibilityChange() { if (!isAudioReady || !audioCtx || !masterGain) return; const now = audioCtx.currentTime; const fadeTime = 0.5; if (document.hidden) { console.log("Tab hidden, fading audio out."); masterGain.gain.cancelScheduledValues(now); masterGain.gain.setTargetAtTime(0.0, now, fadeTime / 3); } else { if (audioCtx.state === 'suspended') { audioCtx.resume().then(() => { console.log("Context resumed by visibility change."); masterGain.gain.cancelScheduledValues(now); masterGain.gain.setTargetAtTime(_targetMasterGain, now, fadeTime); }); } else { console.log("Tab visible, fading audio in to target:", _targetMasterGain); masterGain.gain.cancelScheduledValues(now); masterGain.gain.setTargetAtTime(_targetMasterGain, now, fadeTime); } } }

        // --- Animation Loop (Unchanged) ---
        function animate() { if (!ctx || !canvas.value) { return; } ctx.fillStyle = "rgba(10, 10, 15, 0.1)"; ctx.fillRect(0, 0, canvas.value.width, canvas.value.height); motes.forEach((mote) => { mote.update(mouse.x, mouse.y, mouse.radius); mote.draw(ctx); }); animationFrameId = requestAnimationFrame(animate); }

        // --- Event Handlers (Unchanged) ---
        function resizeCanvas() { if (canvas.value) { const newWidth = window.innerWidth; const newHeight = window.innerHeight; if ((canvas.value.width !== newWidth || canvas.value.height !== newHeight) && newWidth > 0 && newHeight > 0) { canvas.value.width = newWidth; canvas.value.height = newHeight; console.log(`Resized canvas. Re-initializing motes.`); initMotes(newWidth, newHeight); } } }
        function handleMouseMove(event) { if (!userInteracted.value) { unlockAudio(); } mouse.x = event.clientX; mouse.y = event.clientY; }
        function handleMouseLeave() { mouse.x = null; mouse.y = null; mouse.interactingMoteIds.clear(); }
        function handleTouchStart(event) { event.preventDefault(); if (event.touches.length > 0) { if (!userInteracted.value) { unlockAudio(); } mouse.x = event.touches[0].clientX; mouse.y = event.touches[0].clientY; } }
        function handleTouchMove(event) { event.preventDefault(); if (event.touches.length > 0) { mouse.x = event.touches[0].clientX; mouse.y = event.touches[0].clientY; } }
        function handleTouchEnd(event) { mouse.x = null; mouse.y = null; mouse.interactingMoteIds.clear(); }

        // --- Vue Lifecycle Hooks (Includes Visibility Listener add/remove) ---
        onMounted(() => { nextTick(() => { if (canvas.value) { ctx = canvas.value.getContext("2d"); if (ctx) { canvas.value.width = window.innerWidth; canvas.value.height = window.innerHeight; initAudio(); if (canvas.value.width > 0 && canvas.value.height > 0) { initMotes(canvas.value.width, canvas.value.height); } else { console.warn("Initial canvas dimensions invalid, skipping mote init."); } window.addEventListener("resize", resizeCanvas); window.addEventListener("mousemove", handleMouseMove); document.body.addEventListener("mouseleave", handleMouseLeave); window.addEventListener('touchstart', handleTouchStart, { passive: false }); window.addEventListener('touchmove', handleTouchMove, { passive: false }); window.addEventListener('touchend', handleTouchEnd, { passive: false }); window.addEventListener('touchcancel', handleTouchEnd, { passive: false }); document.addEventListener('visibilitychange', handleVisibilityChange); animate(); } else { console.error("Failed to get 2D context."); } } else { console.error("Canvas ref null on mount."); } }); });
        onUnmounted(() => { console.log("Amartha signing off: Cleaning up."); cancelAnimationFrame(animationFrameId); motes.forEach((mote) => mote.stopSound()); if (audioCtx && audioCtx.state !== "closed") { audioCtx.close().then(() => console.log("AudioContext closed.")).catch((e) => console.warn("Error closing AC:", e)); } window.removeEventListener("resize", resizeCanvas); window.removeEventListener("mousemove", handleMouseMove); document.body.removeEventListener("mouseleave", handleMouseLeave); window.removeEventListener('touchstart', handleTouchStart); window.removeEventListener('touchmove', handleTouchMove); window.removeEventListener('touchend', handleTouchEnd); window.removeEventListener('touchcancel', handleTouchEnd); document.removeEventListener('visibilitychange', handleVisibilityChange); });

        // --- Expose (Unchanged) ---
        return { canvas, unlockAudio, userInteracted };
    }, // End setup
}); // End App

// --- Directive (Unchanged) ---
app.directive("show-prompt", { updated(el, binding) { if (binding.value === true) { el.classList.add('hidden'); } else { el.classList.remove('hidden'); } }, mounted(el, binding) { if (binding.value === true) { el.classList.add('hidden'); } else { el.classList.remove('hidden'); } } });

app.mount("#app");

// --- END OF FILE script.js (Enhanced by Amartha - Crackle Reduction v1) ---