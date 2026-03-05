const canvas = document.getElementById("duck-canvas");
const feedBtn = document.getElementById("feed-btn");
const toast = document.getElementById("duck-toast");
const breadCursor = document.getElementById("bread-cursor");

if (canvas instanceof HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { alpha: true });

  if (ctx) {
    const TAU = Math.PI * 2;
    const FRENZY_MS = 9000;
    const BREAD_LIFE_MS = 8500;
    const CULL_FALL_MS = 1300;

    const ducks = [];
    const breads = [];
    const feathers = [];
    const splats = [];

    const pointer = {
      x: 0,
      y: 0,
      active: false
    };

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let lastTime = performance.now();

    let normalDuckCap = width < 700 ? 1400 : 2800;
    let frenzyDuckCap = width < 700 ? 2600 : 4600;

    let feedArmed = false;
    let frenzyUntil = 0;
    let cullMode = false;
    let cullUntil = 0;
    let pondCleared = false;

    const spriteSize = 64;
    const duckSprite = document.createElement("canvas");
    const duckSpriteCtx = duckSprite.getContext("2d");
    duckSprite.width = spriteSize;
    duckSprite.height = spriteSize;

    if (duckSpriteCtx) {
      duckSpriteCtx.font = "48px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
      duckSpriteCtx.textAlign = "center";
      duckSpriteCtx.textBaseline = "middle";
      duckSpriteCtx.fillText("🦆", spriteSize / 2, spriteSize / 2 + 2);
    }

    const breadSize = 48;
    const breadSprite = document.createElement("canvas");
    const breadSpriteCtx = breadSprite.getContext("2d");
    breadSprite.width = breadSize;
    breadSprite.height = breadSize;

    if (breadSpriteCtx) {
      breadSpriteCtx.font = "38px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
      breadSpriteCtx.textAlign = "center";
      breadSpriteCtx.textBaseline = "middle";
      breadSpriteCtx.fillText("🍞", breadSize / 2, breadSize / 2 + 1);
    }

    const featherSize = 40;
    const featherSprite = document.createElement("canvas");
    const featherSpriteCtx = featherSprite.getContext("2d");
    featherSprite.width = featherSize;
    featherSprite.height = featherSize;

    if (featherSpriteCtx) {
      featherSpriteCtx.font =
        "30px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
      featherSpriteCtx.textAlign = "center";
      featherSpriteCtx.textBaseline = "middle";
      featherSpriteCtx.fillText("🪶", featherSize / 2, featherSize / 2 + 1);
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function randomBetween(min, max) {
      return min + Math.random() * (max - min);
    }

    function setToastMessage(text) {
      const toastLabel = toast?.querySelector("p");
      if (toastLabel instanceof HTMLElement) {
        toastLabel.textContent = text;
      }
    }

    function setFeedArmed(nextState) {
      if (pondCleared && nextState) {
        setToastMessage("Pond is empty. Organize to restock ducks.");
        return;
      }

      feedArmed = nextState;
      document.body.classList.toggle("bread-armed", feedArmed);

      if (feedBtn instanceof HTMLButtonElement) {
        feedBtn.textContent = feedArmed ? "Drop Bread" : "Feed the Ducks";
      }

      if (feedArmed) {
        setToastMessage("Bread armed. Click pond space to deploy carbs.");
      } else if (performance.now() < frenzyUntil) {
        setToastMessage("Frenzy active. Maintain operational distance.");
      } else {
        setToastMessage("Warning: Don't feed the ducks.");
      }
    }

    function addFeatherBurst(x, y, count) {
      const now = performance.now();
      for (let i = 0; i < count; i += 1) {
        feathers.push({
          x: x + randomBetween(-10, 10),
          y: y + randomBetween(-10, 10),
          vx: randomBetween(-240, 240),
          vy: randomBetween(-250, 40),
          spin: randomBetween(-5, 5),
          angle: randomBetween(-Math.PI, Math.PI),
          born: now,
          life: randomBetween(600, 1400),
          scale: randomBetween(0.35, 0.8)
        });
      }
    }

    function addSplatBurst(x, y, count) {
      const now = performance.now();
      for (let i = 0; i < count; i += 1) {
        splats.push({
          x: x + randomBetween(-14, 14),
          y: y + randomBetween(-14, 14),
          radius: randomBetween(5, 16),
          vx: randomBetween(-80, 80),
          vy: randomBetween(-120, 40),
          born: now,
          life: randomBetween(450, 1100),
          color: Math.random() > 0.5 ? "rgba(194, 24, 49, 0.88)" : "rgba(139, 0, 0, 0.84)"
        });
      }
    }

    function createDuck(x, y, direction, baseY) {
      return {
        x,
        y,
        baseY,
        vx: direction * randomBetween(18, 42),
        vy: 0,
        driftX: direction * randomBetween(18, 42),
        bobAmp: randomBetween(1.5, 6.5),
        bobFreq: randomBetween(0.45, 1.35),
        phase: Math.random() * TAU,
        returnForce: randomBetween(7, 12),
        drag: randomBetween(5.5, 9),
        scale: randomBetween(0.23, 0.43)
      };
    }

    function seedDucks() {
      ducks.length = 0;
      pondCleared = false;
      cullMode = false;
      cullUntil = 0;

      normalDuckCap = width < 700 ? 1400 : 2800;
      frenzyDuckCap = width < 700 ? 2600 : 4600;

      let spacingX = 23;
      let spacingY = 22;
      let columns = Math.ceil(width / spacingX) + 4;
      let rows = Math.ceil(height / spacingY) + 4;
      const total = columns * rows;

      if (total > normalDuckCap) {
        const scale = Math.sqrt(total / normalDuckCap);
        spacingX *= scale;
        spacingY *= scale;
        columns = Math.ceil(width / spacingX) + 4;
        rows = Math.ceil(height / spacingY) + 4;
      }

      for (let row = 0; row < rows; row += 1) {
        const direction = row % 2 === 0 ? 1 : -1;
        const rowOffset = row % 2 === 0 ? 0 : spacingX / 2;

        for (let col = 0; col < columns; col += 1) {
          const x = col * spacingX + rowOffset + randomBetween(-2, 2);
          const y = row * spacingY + randomBetween(-0.7, 0.7);
          ducks.push(createDuck(x, y, direction, y));
        }
      }
    }

    function resize() {
      const prevWidth = width || window.innerWidth;
      const prevHeight = height || window.innerHeight;

      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const sx = prevWidth > 0 ? width / prevWidth : 1;
      const sy = prevHeight > 0 ? height / prevHeight : 1;

      for (const duck of ducks) {
        duck.x *= sx;
        duck.y *= sy;
        duck.baseY *= sy;
      }

      if (!pondCleared && ducks.length === 0) {
        seedDucks();
      }
    }

    function multiplyDucks() {
      const currentCount = ducks.length;
      if (currentCount >= frenzyDuckCap || currentCount === 0) {
        return;
      }

      const targetCount = Math.min(frenzyDuckCap, Math.floor(currentCount * 1.8));
      for (let i = currentCount; i < targetCount; i += 1) {
        const source = ducks[Math.floor(Math.random() * currentCount)];
        const direction = source.driftX >= 0 ? 1 : -1;
        const clone = createDuck(
          source.x + randomBetween(-14, 14),
          source.y + randomBetween(-10, 10),
          direction,
          source.baseY + randomBetween(-8, 8)
        );

        clone.vx = source.vx + randomBetween(-130, 130);
        clone.vy = source.vy + randomBetween(-90, 90);
        clone.driftX = source.driftX * randomBetween(1.6, 2.4);
        clone.bobAmp = source.bobAmp * randomBetween(1.2, 1.9);
        clone.drag = Math.max(3.2, source.drag - randomBetween(1.5, 2.8));

        ducks.push(clone);
      }
    }

    function triggerFrenzy(x, y) {
      if (pondCleared || cullMode || ducks.length === 0) {
        setToastMessage("No ducks available for frenzy mode.");
        return;
      }

      const now = performance.now();
      frenzyUntil = Math.max(frenzyUntil, now + FRENZY_MS);
      document.body.classList.add("frenzy-mode");
      setToastMessage("Frenzy mode engaged. Please maintain quack protocol.");

      multiplyDucks();

      for (let i = 0; i < ducks.length; i += 1) {
        const duck = ducks[i];
        const dx = x - duck.x;
        const dy = y - duck.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

        duck.vx += (dx / dist) * randomBetween(80, 220);
        duck.vy += (dy / dist) * randomBetween(60, 210);
        duck.driftX = (duck.driftX >= 0 ? 1 : -1) * randomBetween(130, 300);
        duck.drag = Math.max(2.6, duck.drag - 1.8);
      }
    }

    function dropBread(x, y) {
      if (pondCleared || cullMode || ducks.length === 0) {
        return;
      }

      breads.push({
        x,
        y,
        born: performance.now(),
        life: BREAD_LIFE_MS,
        scale: randomBetween(0.85, 1.15)
      });

      triggerFrenzy(x, y);
      setFeedArmed(false);
    }

    function triggerCull() {
      if (ducks.length === 0 || pondCleared) {
        pondCleared = true;
        setToastMessage("Pond already clear.");
        return;
      }

      frenzyUntil = 0;
      setFeedArmed(false);
      breads.length = 0;
      cullMode = true;
      cullUntil = performance.now() + CULL_FALL_MS;
      document.body.classList.remove("frenzy-mode");
      setToastMessage("Pond clear sequence active.");

      for (let i = 0; i < ducks.length; i += 1) {
        const duck = ducks[i];
        duck.vx += randomBetween(-120, 120);
        duck.vy = randomBetween(220, 620);
        duck.drag = randomBetween(0.7, 1.6);

        if (i % 4 === 0) {
          addFeatherBurst(duck.x, duck.y, 2);
          addSplatBurst(duck.x, duck.y, 3);
        }
      }
    }

    function triggerOrganize() {
      frenzyUntil = 0;
      cullMode = false;
      cullUntil = 0;
      pondCleared = false;
      document.body.classList.remove("frenzy-mode");
      breads.length = 0;
      feathers.length = 0;
      splats.length = 0;
      setFeedArmed(false);
      seedDucks();
      setToastMessage("Ducks reorganized into regulation formation.");
    }

    function setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;

      if (breadCursor instanceof HTMLElement) {
        breadCursor.style.left = `${x}px`;
        breadCursor.style.top = `${y}px`;
      }
    }

    function isInteractiveTarget(target) {
      return (
        target instanceof Element &&
        Boolean(target.closest("button, a, input, textarea, select, label, nav, .duck-modal, .layout"))
      );
    }

    function animate(now) {
      const dt = clamp((now - lastTime) / 1000, 0.001, 0.035);
      lastTime = now;

      const frenzyActive = now < frenzyUntil;

      if (cullMode && now >= cullUntil) {
        cullMode = false;
        pondCleared = true;
        ducks.length = 0;
        breads.length = 0;
        setToastMessage("Pond cleared. Ducks removed.");
        window.dispatchEvent(new CustomEvent("duck:cull-complete"));
      }

      if (!frenzyActive && document.body.classList.contains("frenzy-mode")) {
        document.body.classList.remove("frenzy-mode");
        setFeedArmed(false);
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = breads.length - 1; i >= 0; i -= 1) {
        const bread = breads[i];
        const age = now - bread.born;
        if (age > bread.life) {
          breads.splice(i, 1);
        }
      }

      const forceRadius = frenzyActive ? 260 : 180;
      const forceRadiusSq = forceRadius * forceRadius;
      const forceStrength = frenzyActive ? 760 : 340;
      const breadAttractRadius = frenzyActive ? 340 : 260;
      const breadAttractRadiusSq = breadAttractRadius * breadAttractRadius;
      const time = now / 1000;

      for (let i = 0; i < ducks.length; i += 1) {
        const duck = ducks[i];

        if (cullMode) {
          duck.vy += 980 * dt;
          duck.vx *= Math.exp(-1.3 * dt);
          duck.vy *= Math.exp(-0.35 * dt);
          duck.x += duck.vx * dt;
          duck.y += duck.vy * dt;

          const angle = clamp(duck.vy * 0.008, -1.2, 1.2);
          const facingLeft = duck.vx < 0;
          ctx.save();
          ctx.translate(duck.x, duck.y);
          ctx.rotate(angle);
          ctx.scale(facingLeft ? -duck.scale : duck.scale, duck.scale);
          ctx.drawImage(duckSprite, -spriteSize / 2, -spriteSize / 2);
          ctx.restore();
          continue;
        }

        const frenzyFactor = frenzyActive ? 1.9 : 1;
        const targetY = duck.baseY + Math.sin(time * duck.bobFreq + duck.phase) * duck.bobAmp * frenzyFactor;

        const driftTarget = duck.driftX * (frenzyActive ? 2 : 1);
        duck.vx += (driftTarget - duck.vx) * 0.75 * dt;
        duck.vy += (targetY - duck.y) * duck.returnForce * dt;

        if (frenzyActive) {
          duck.vx += randomBetween(-110, 110) * dt;
          duck.vy += randomBetween(-140, 140) * dt;
        }

        if (pointer.active) {
          const dx = duck.x - pointer.x;
          const dy = duck.y - pointer.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < forceRadiusSq) {
            const dist = Math.sqrt(distSq) + 0.001;
            const influence = 1 - dist / forceRadius;
            const push = influence * forceStrength;
            duck.vx += (dx / dist) * push * dt;
            duck.vy += (dy / dist) * push * dt;
          }
        }

        for (let b = 0; b < breads.length; b += 1) {
          const bread = breads[b];
          const dx = bread.x - duck.x;
          const dy = bread.y - duck.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < breadAttractRadiusSq) {
            const dist = Math.sqrt(distSq) + 0.001;
            const influence = 1 - dist / breadAttractRadius;
            const pull = influence * (frenzyActive ? 980 : 360);
            duck.vx += (dx / dist) * pull * dt;
            duck.vy += (dy / dist) * pull * dt;
          }
        }

        const damping = Math.exp(-duck.drag * (frenzyActive ? 0.62 : 1) * dt);
        duck.vx *= damping;
        duck.vy *= damping;

        duck.x += duck.vx * dt;
        duck.y += duck.vy * dt;

        if (frenzyActive) {
          if (duck.x < 12) {
            duck.x = 12;
            duck.vx = Math.abs(duck.vx) * 0.96 + 70;
          }
          if (duck.x > width - 12) {
            duck.x = width - 12;
            duck.vx = -Math.abs(duck.vx) * 0.96 - 70;
          }
          if (duck.y < 12) {
            duck.y = 12;
            duck.vy = Math.abs(duck.vy) * 0.95 + 60;
          }
          if (duck.y > height - 12) {
            duck.y = height - 12;
            duck.vy = -Math.abs(duck.vy) * 0.95 - 60;
          }
        } else {
          if (duck.x < -44) duck.x = width + 44;
          if (duck.x > width + 44) duck.x = -44;
          duck.y = clamp(duck.y, 4, height - 4);
        }

        const angle = clamp(duck.vy * 0.01, -0.5, 0.5);
        const facingLeft = duck.vx < 0;

        ctx.save();
        ctx.translate(duck.x, duck.y);
        ctx.rotate(angle);
        ctx.scale(facingLeft ? -duck.scale : duck.scale, duck.scale);
        ctx.drawImage(duckSprite, -spriteSize / 2, -spriteSize / 2);
        ctx.restore();
      }

      for (let i = 0; i < breads.length; i += 1) {
        const bread = breads[i];
        const lifeRatio = 1 - (now - bread.born) / bread.life;
        const scale = bread.scale * clamp(lifeRatio, 0, 1);

        ctx.save();
        ctx.globalAlpha = clamp(lifeRatio + 0.2, 0, 1);
        ctx.translate(bread.x, bread.y);
        ctx.scale(scale, scale);
        ctx.drawImage(breadSprite, -breadSize / 2, -breadSize / 2);
        ctx.restore();
      }

      for (let i = feathers.length - 1; i >= 0; i -= 1) {
        const feather = feathers[i];
        const age = now - feather.born;
        if (age > feather.life) {
          feathers.splice(i, 1);
          continue;
        }

        feather.vy += 420 * dt;
        feather.vx *= Math.exp(-1.8 * dt);
        feather.vy *= Math.exp(-0.5 * dt);
        feather.x += feather.vx * dt;
        feather.y += feather.vy * dt;
        feather.angle += feather.spin * dt;

        const lifeRatio = 1 - age / feather.life;
        ctx.save();
        ctx.globalAlpha = clamp(lifeRatio, 0, 1);
        ctx.translate(feather.x, feather.y);
        ctx.rotate(feather.angle);
        ctx.scale(feather.scale, feather.scale);
        ctx.drawImage(featherSprite, -featherSize / 2, -featherSize / 2);
        ctx.restore();
      }

      for (let i = splats.length - 1; i >= 0; i -= 1) {
        const splat = splats[i];
        const age = now - splat.born;
        if (age > splat.life) {
          splats.splice(i, 1);
          continue;
        }

        splat.vy += 320 * dt;
        splat.vx *= Math.exp(-2.2 * dt);
        splat.vy *= Math.exp(-0.8 * dt);
        splat.x += splat.vx * dt;
        splat.y += splat.vy * dt;

        const lifeRatio = 1 - age / splat.life;
        ctx.save();
        ctx.globalAlpha = clamp(lifeRatio, 0, 1);
        ctx.fillStyle = splat.color;
        ctx.beginPath();
        ctx.arc(splat.x, splat.y, splat.radius * (0.75 + lifeRatio * 0.35), 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);

    window.addEventListener("pointermove", (event) => {
      setPointer(event.clientX, event.clientY);
    });

    window.addEventListener("pointerdown", (event) => {
      setPointer(event.clientX, event.clientY);

      const target = event.target;
      const interactive = isInteractiveTarget(target);

      if (feedArmed && event.button === 0 && !interactive) {
        dropBread(event.clientX, event.clientY);
        event.preventDefault();
      }
    });

    document.addEventListener("mouseleave", () => {
      pointer.active = false;
    });

    window.addEventListener("duck:cull", () => {
      triggerCull();
    });

    window.addEventListener("duck:organize", () => {
      triggerOrganize();
    });

    if (feedBtn instanceof HTMLButtonElement) {
      feedBtn.addEventListener("click", () => {
        setFeedArmed(!feedArmed);
      });
    }

    resize();
    seedDucks();
    setFeedArmed(false);
    requestAnimationFrame(animate);
  }
}
