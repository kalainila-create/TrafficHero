
(function () {
    "use strict";

    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");
    var W = canvas.width;
    var H = canvas.height;

    var LANES = 4;
    var ROAD_LEFT = 60;
    var ROAD_RIGHT = W - 60;
    var LANE_W = (ROAD_RIGHT - ROAD_LEFT) / LANES;
    var CAR_W = 46;
    var CAR_H = 76;

    // ---------- roadside scenery (decorative only) ----------
    var SCENERY_SLOT = 150;       // vertical spacing between items
    var SCENERY_SPEED = 70;       // px/sec, scrolls with the road
    var SCENERY_PATTERN = ["building", "tree", "building", "tree", "building"];
    var BUILDING_COLORS = ["#7d8fa6", "#8a97ab", "#6f7f99", "#93a0b3"];

    function makeScenery() {
        var arr = [];
        for (var i = 0; i < SCENERY_PATTERN.length; i++) {
            arr.push({ y: i * SCENERY_SLOT - SCENERY_SLOT, type: SCENERY_PATTERN[i % SCENERY_PATTERN.length] });
        }
        return arr;
    }

    function updateScenerySide(arr, dt) {
        for (var i = 0; i < arr.length; i++) {
            arr[i].y += SCENERY_SPEED * dt;
            if (arr[i].y > H + 40) {
                arr[i].y -= arr.length * SCENERY_SLOT;
            }
        }
    }

    var PLAYER_Y_BASE = H - 90;
    var PLAYER_Y_MIN = H - 190;   // driving all the way forward
    var PLAYER_Y_MAX = H - 50;    // braking all the way back
    var DRIVE_SPEED = 170;        // px/sec
    var BRAKE_SPEED = 170;        // px/sec

    var MAX_LEVEL = 5;
    // Each level gets a deliberately different length: more time to
    // learn the basics early, less breathing room as it gets harder.
    // Sums to ROUND_TIME (30s) exactly.
    var LEVEL_DURATIONS = [8, 7, 6, 5, 9];
    var LEVEL_START_TIMES = (function () {
        var starts = [0];
        for (var i = 0; i < LEVEL_DURATIONS.length; i++) {
            starts.push(starts[i] + LEVEL_DURATIONS[i]);
        }
        return starts; // [0, 9, 16, 22, 27, 30]
    })();
    var ROUND_TIME = LEVEL_START_TIMES[LEVEL_START_TIMES.length - 1]; // 30
    var COMBO_STEP = 6;           // seconds of clean driving per combo tier
    var MAX_COMBO = 3;
    var STARTING_LIVES = 4;       // a bit more forgiving so fewer runs end early

    // ---------- sprite images ----------
    // Real artwork instead of flat canvas shapes. Everything is preloaded
    // before the game loop starts; if a browser is slow to fetch them the
    // old vector shapes are used as an automatic fallback so the game
    // never just shows blank cars.
    var CAR_KEYS = ["yellow", "blue", "purple", "red", "green"];
    var images = {};
    var imagesReady = false;
    var imageSources = {
        car_yellow: "Images/car_yellow.png",
        car_blue: "Images/car_blue.png",
        car_purple: "Images/car_purple.png",
        car_red: "Images/car_red.png",
        car_green: "Images/car_green.png",
        car_player: "Images/car_player.png",
        ambulance: "Images/ambulance.png",
        pedestrian_1: "Images/pedestrian_1.png",
        pedestrian_2: "Images/pedestrian_2.png"
    };
    (function preload() {
        var keys = Object.keys(imageSources);
        var remaining = keys.length;
        keys.forEach(function (key) {
            var img = new Image();
            img.onload = img.onerror = function () {
                remaining -= 1;
                if (remaining <= 0) { imagesReady = true; }
            };
            img.src = imageSources[key];
            images[key] = img;
        });
    })();

    function laneCenterX(lane) {
        return ROAD_LEFT + LANE_W * lane + LANE_W / 2;
    }

    // ---------- difficulty curve (levels 1-5) ----------
    function spawnIntervalFor(level) {
        return Math.max(0.55, 1.3 - (level - 1) * 0.15);
    }
    function carSpeedFor(level) {
        var mult = 1 + (level - 1) * 0.12;
        return { min: 140 * mult, max: 200 * mult };
    }
    function lightDurationsFor(level) {
        return {
            green: Math.max(3, 5 - (level - 1) * 0.4),
            yellow: Math.max(0.8, 1.5 - (level - 1) * 0.15),
            red: 3.5 + (level - 1) * 0.15
        };
    }
    function ambulanceGapFor(level) {
        return Math.max(6, (14 + Math.random() * 6) - (level - 1) * 1.5);
    }
    function pedestrianGapFor(level) {
        return Math.max(5, (10 + Math.random() * 6) - (level - 1) * 1.2);
    }

    // ---------- game state ----------
    var state = {};

    function newState() {
        return {
            running: true,
            paused: false,
            score: 0,
            level: 1,
            timeLeft: ROUND_TIME,
            lives: STARTING_LIVES,
            driving: false,
            braking: false,
            invulnerable: 0,
            screenFlash: 0,
            shield: false,
            shieldTimer: 0,
            combo: 1,
            cleanTimer: 0,
            dashOffset: 0,
            light: { state: "green", timeLeft: lightDurationsFor(1).green },
            cars: [],
            spawnTimer: 0,
            spawnInterval: spawnIntervalFor(1),
            ambulance: null,
            ambulanceTimer: ambulanceGapFor(1),
            pedestrian: null,
            pedestrianTimer: pedestrianGapFor(1),
            player: { lane: 1, y: PLAYER_Y_BASE },
            sceneryLeft: makeScenery(),
            sceneryRight: makeScenery()
        };
    }

    // ---------- input ----------
    var keys = {};

    // ---------- sound effects (no audio files needed) ----------
    // Browsers block audio until a user gesture, so the context is
    // created lazily on the first key press / tap rather than at load.
    var audioCtx = null;
    function ensureAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) { /* no Web Audio support — game still works silently */ }
        }
        startMusicIfNeeded();
    }
    function playTone(freq, duration, type) {
        if (!audioCtx) { return; }
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type || "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.stop(audioCtx.currentTime + duration);
    }
    function playChime(freq, duration) { playTone(freq, duration, "triangle"); }
    function playBuzz() { playTone(130, 0.35, "sawtooth"); }

    // ---------- background music ----------
    // A short repeating bass riff, generated the same way as the sound
    // effects (no audio file), kept quiet so it sits under the SFX.
    // Starts on the first user gesture (same audio-unlock moment as the
    // SFX) and can be muted from the HUD.
    var MUSIC_PATTERN = [220, 220, 330, 294, 220, 220, 262, 246];
    var MUSIC_STEP_MS = 260;
    var musicEnabled = true;
    var musicStarted = false;
    var musicStep = 0;
    var musicTimer = null;

    function playMusicNote(freq) {
        if (!audioCtx) { return; }
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0.09;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        osc.stop(audioCtx.currentTime + 0.22);
    }

    function musicStep_() {
        if (musicEnabled && state.running && !state.paused) {
            playMusicNote(MUSIC_PATTERN[musicStep % MUSIC_PATTERN.length]);
            musicStep++;
        }
        musicTimer = setTimeout(musicStep_, MUSIC_STEP_MS);
    }

    function startMusicIfNeeded() {
        if (!musicStarted && audioCtx) {
            musicStarted = true;
            musicStep_();
        }
    }

    function changeLane(dir) {
        var target = state.player.lane + dir;
        if (target >= 0 && target < LANES) {
            state.player.lane = target;
        }
    }

    document.addEventListener("keydown", function (e) {
        ensureAudio();
        if (keys[e.keyCode]) { return; }
        keys[e.keyCode] = true;
        handleKey(e.keyCode, true);
    });
    document.addEventListener("keyup", function (e) {
        keys[e.keyCode] = false;
        handleKey(e.keyCode, false);
    });

    function handleKey(code, down) {
        if (code === 80 && down) { togglePause(); return; }   // P = pause
        if (!state.running || state.paused) { return; }
        switch (code) {
            case 37: case 65: if (down) { changeLane(-1); } break;   // Left / A
            case 39: case 68: if (down) { changeLane(1); } break;    // Right / D
            case 38: case 87:                                       // Up / W
                state.driving = down;
                if (down) { state.braking = false; }
                break;
            case 40: case 83:                                       // Down / S
                state.braking = down;
                if (down) { state.driving = false; }
                break;
        }
    }

    function togglePause() {
        if (!state.running) { return; }
        state.paused = !state.paused;
        document.getElementById("pauseOverlay").className = state.paused ? "overlay show" : "overlay";
        if (state.paused) { state.driving = false; state.braking = false; }
    }
    document.getElementById("btnPause").addEventListener("click", togglePause);
    document.getElementById("btnResume").addEventListener("click", togglePause);

    var btnMusic = document.getElementById("btnMusic");
    btnMusic.addEventListener("click", function () {
        ensureAudio();
        musicEnabled = !musicEnabled;
        btnMusic.textContent = musicEnabled ? "\u{1F3B5}" : "\u{1F507}";
        btnMusic.className = musicEnabled ? "pause-btn" : "pause-btn muted";
    });

    function bindPad(id, downFn, upFn) {
        var el = document.getElementById(id);
        if (!el) { return; }
        el.addEventListener("pointerdown", function (ev) { ev.preventDefault(); ensureAudio(); downFn(); });
        if (upFn) {
            el.addEventListener("pointerup", function (ev) { ev.preventDefault(); upFn(); });
            el.addEventListener("pointerleave", function () { upFn(); });
        }
    }
    bindPad("padLeft", function () { if (!state.paused) { changeLane(-1); } });
    bindPad("padRight", function () { if (!state.paused) { changeLane(1); } });
    bindPad("padUp",
        function () { if (!state.paused) { state.driving = true; state.braking = false; } },
        function () { state.driving = false; });
    bindPad("padDown",
        function () { if (!state.paused) { state.braking = true; state.driving = false; } },
        function () { state.braking = false; });

    // ---------- spawning ----------
    function spawnCar() {
        var speed = carSpeedFor(state.level);
        var usedLanes = [];
        var count = (state.level >= 4 && Math.random() < 0.3) ? 2 : 1;
        for (var n = 0; n < count; n++) {
            var lane;
            do { lane = Math.floor(Math.random() * LANES); } while (usedLanes.indexOf(lane) !== -1 && usedLanes.length < LANES);
            usedLanes.push(lane);
            state.cars.push({
                lane: lane,
                y: -CAR_H - n * 60,
                speed: speed.min + Math.random() * (speed.max - speed.min),
                colorKey: CAR_KEYS[Math.floor(Math.random() * CAR_KEYS.length)],
                passed: false
            });
        }
    }

    function spawnAmbulance() {
        state.ambulance = {
            lane: Math.floor(Math.random() * LANES),
            y: -CAR_H,
            speed: 190 + (state.level - 1) * 10,
            resolved: false
        };
        showBanner("giveWayBanner", true);
    }

    function spawnPedestrian() {
        state.pedestrian = {
            y: -20,
            speed: 130 + (state.level - 1) * 8,
            elapsed: 0,
            crossDuration: 3.2,
            resolved: false
        };
        showBanner("crossingBanner", true);
    }

    // ---------- feedback helpers ----------
    var toastTimer = 0;
    function toast(msg) {
        var el = document.getElementById("toast");
        el.textContent = msg;
        el.className = "toast show";
        toastTimer = 1.4;
    }

    function showBanner(id, visible) {
        document.getElementById(id).style.display = visible ? "block" : "none";
    }

    function loseLife(reason) {
        if (state.invulnerable > 0) { return; }
        if (state.shield) {
            state.shield = false;
            state.shieldTimer = 0;
            state.invulnerable = 1.2;
            toast("Shield absorbed it!");
            playChime(520, 0.2);
            return;
        }
        state.lives -= 1;
        state.invulnerable = 1.2;
        state.screenFlash = 0.3;
        state.combo = 1;
        state.cleanTimer = 0;
        toast(reason);
        playBuzz();
        if (state.lives <= 0) {
            endGame();
        }
    }

    // ---------- traffic light ----------
    var LIGHT_NEXT = { green: "yellow", yellow: "red", red: "green" };

    function updateLight(dt) {
        state.light.timeLeft -= dt;
        if (state.light.timeLeft <= 0) {
            var durations = lightDurationsFor(state.level);
            state.light.state = LIGHT_NEXT[state.light.state];
            state.light.timeLeft = durations[state.light.state];
        }
    }

    // ---------- leveling ----------
    // Driven by survival time rather than score, so it's guaranteed to
    // progress predictably within a single round instead of depending on
    // how aggressively the player scores.
    function updateLevel() {
        var elapsed = ROUND_TIME - state.timeLeft;
        var target = 1;
        for (var lvl = LEVEL_DURATIONS.length; lvl >= 1; lvl--) {
            if (elapsed >= LEVEL_START_TIMES[lvl - 1]) { target = lvl; break; }
        }
        target = Math.min(MAX_LEVEL, target);
        if (target > state.level) {
            state.level = target;
            triggerLevelPopup(target);
            if (target === 3) {
                state.shield = true;
                state.shieldTimer = 6;   // seconds of protection
            }
        }
    }

    // A small, non-blocking notification banner — does NOT pause the
    // game, so it never interrupts play. Just a clear heads-up plus a
    // two-note chime.
    function triggerLevelPopup(newLevel) {
        var el = document.getElementById("levelBanner");
        el.textContent = newLevel <= MAX_LEVEL
            ? "LEVEL " + newLevel + "!"
            : "MAX LEVEL!";
        el.className = "level-banner show";
        playChime(880, 0.15);
        setTimeout(function () { playChime(1046, 0.2); }, 150);
        clearTimeout(triggerLevelPopup._hideTimer);
        triggerLevelPopup._hideTimer = setTimeout(function () {
            el.className = "level-banner";
        }, 1800);
    }

    // ---------- main update ----------
    function update(dt) {
        if (state.paused || !state.running) { return; }

        updateLevel();
        updateLight(dt);
        state.dashOffset = (state.dashOffset + dt * 200) % 40;
        updateScenerySide(state.sceneryLeft, dt);
        updateScenerySide(state.sceneryRight, dt);

        if (toastTimer > 0) {
            toastTimer -= dt;
            if (toastTimer <= 0) {
                document.getElementById("toast").className = "toast";
            }
        }
        if (state.invulnerable > 0) { state.invulnerable -= dt; }
        if (state.screenFlash > 0) { state.screenFlash -= dt; }
        if (state.shieldTimer > 0) {
            state.shieldTimer -= dt;
            if (state.shieldTimer <= 0) { state.shield = false; }
        }

        // Combo multiplier: builds the longer you go without losing a life.
        state.cleanTimer += dt;
        state.combo = Math.min(MAX_COMBO, 1 + Math.floor(state.cleanTimer / COMBO_STEP));

        // Persistent warning while the light is red, so it's obvious
        // *before* you lose a life, not just after.
        document.getElementById("redLightBanner").style.display =
            state.light.state === "red" ? "block" : "none";

        // Player's own forward/back movement within the lane.
        if (state.driving) {
            state.player.y = Math.max(PLAYER_Y_MIN, state.player.y - DRIVE_SPEED * dt);
        } else if (state.braking) {
            state.player.y = Math.min(PLAYER_Y_MAX, state.player.y + BRAKE_SPEED * dt);
        }

        // Rule 1: driving through a red light costs a life immediately.
        if (state.driving && state.light.state === "red") {
            loseLife("Ran a red light! -1 life");
            state.driving = false;
        }

        // Score for legal driving time.
        if (state.driving && state.light.state !== "red") {
            state.score += dt * 12 * state.combo;
        }

        // Overall countdown.
        state.timeLeft -= dt;
        if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            endGame();
        }

        // Spawn ordinary traffic.
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
            spawnCar();
            state.spawnTimer = state.spawnInterval;
            state.spawnInterval = Math.max(spawnIntervalFor(state.level), state.spawnInterval - 0.01);
        }

        // Move + collide ordinary traffic.
        for (var i = state.cars.length - 1; i >= 0; i--) {
            var c = state.cars[i];
            c.y += c.speed * dt;

            if (!c.passed && c.y > state.player.y + CAR_H) {
                c.passed = true;
                state.score += 5 * state.combo;
            }
            if (c.lane === state.player.lane &&
                Math.abs(c.y - state.player.y) < CAR_H * 0.7 &&
                state.invulnerable <= 0) {
                loseLife("Crash! -1 life");
            }
            if (c.y > H + CAR_H) { state.cars.splice(i, 1); }
        }

        // Ambulance give-way event. Paused while a pedestrian crossing is
        // active so the two "calls" never overlap and compete for
        // attention.
        if (!state.ambulance && !state.pedestrian) {
            state.ambulanceTimer -= dt;
            if (state.ambulanceTimer <= 0) {
                spawnAmbulance();
                state.ambulanceTimer = ambulanceGapFor(state.level);
            }
        } else if (state.ambulance) {
            var a = state.ambulance;
            a.y += a.speed * dt;

            if (!a.resolved && a.y > state.player.y - CAR_H * 0.4) {
                a.resolved = true;
                if (a.lane === state.player.lane) {
                    state.score = Math.max(0, state.score - 300);
                    toast("Blocked the ambulance! -300");
                    playTone(180, 0.3, "sawtooth");
                } else {
                    state.score += 100 * state.combo;
                    toast("Gave way! +" + (100 * state.combo));
                    playChime(660, 0.15);
                }
            }
            if (a.y > H + CAR_H) {
                state.ambulance = null;
                showBanner("giveWayBanner", false);
            }
        }

        // Pedestrian zebra-crossing event (unlocked from level 2). Paused
        // while an ambulance is active, for the same reason.
        if (!state.pedestrian && !state.ambulance && state.level >= 2) {
            state.pedestrianTimer -= dt;
            if (state.pedestrianTimer <= 0) {
                spawnPedestrian();
                state.pedestrianTimer = pedestrianGapFor(state.level);
            }
        } else if (state.pedestrian) {
            var p = state.pedestrian;
            p.y += p.speed * dt;
            p.elapsed += dt;

            var stillCrossing = p.elapsed < p.crossDuration;
            if (!p.resolved && p.y > state.player.y - CAR_H * 0.4) {
                p.resolved = true;
                if (stillCrossing && state.driving) {
                    // Points-only penalty, same shape as blocking the
                    // ambulance — no life lost, just a real cost for not
                    // stopping.
                    state.score = Math.max(0, state.score - 200);
                    toast("Didn't stop for the pedestrian! -200 points");
                    playTone(180, 0.3, "sawtooth");
                } else if (stillCrossing) {
                    state.score += 50 * state.combo;
                    toast("Gave way to pedestrian! +" + (50 * state.combo));
                    playChime(660, 0.15);
                }
            }
            if (p.y > H + CAR_H) {
                state.pedestrian = null;
                showBanner("crossingBanner", false);
            }
        }

        document.getElementById("hudScore").textContent = Math.floor(state.score);
        document.getElementById("hudLevel").textContent = state.level;
        document.getElementById("hudCombo").textContent = "x" + state.combo;
        document.getElementById("hudTime").textContent = Math.ceil(state.timeLeft);
        document.getElementById("hudLivesVal").textContent = Math.max(0, state.lives);
    }

    // ---------- drawing ----------
    function drawRoad() {
        ctx.fillStyle = "#4f7d3e";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, H);

        ctx.strokeStyle = "#f4d24a";
        ctx.lineWidth = 3;
        for (var lane = 1; lane < LANES; lane++) {
            var x = ROAD_LEFT + LANE_W * lane;
            ctx.beginPath();
            ctx.setLineDash([20, 20]);
            ctx.lineDashOffset = -state.dashOffset;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    function drawBuilding(x, w, y, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#55617a";
        ctx.fillRect(x - 2, y - 4, w + 4, 6);
        ctx.fillStyle = "rgba(255, 230, 140, 0.85)";
        var winW = 7, winH = 9, gapX = 6, gapY = 11;
        for (var wy = y + 10; wy < y + h - 10; wy += winH + gapY) {
            for (var wx = x + 5; wx < x + w - 5; wx += winW + gapX) {
                ctx.fillRect(wx, wy, winW, winH);
            }
        }
    }

    function drawTree(cx, y) {
        ctx.fillStyle = "#6b4a2f";
        ctx.fillRect(cx - 3, y, 6, 22);
        ctx.fillStyle = "#3f7d3a";
        ctx.beginPath(); ctx.arc(cx, y - 4, 14, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 9, y + 4, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 9, y + 4, 10, 0, Math.PI * 2); ctx.fill();
    }

    function drawSceneryColumn(arr, isLeft) {
        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];
            if (item.type === "building") {
                var w = 34, h = 70;
                var x = isLeft ? 8 : W - 8 - w;
                drawBuilding(x, w, item.y, h, BUILDING_COLORS[i % BUILDING_COLORS.length]);
            } else {
                var cx = isLeft ? 30 : W - 30;
                drawTree(cx, item.y);
            }
        }
    }

    var FALLBACK_COLORS = {
        yellow: "#f4c542", blue: "#3b6fd6", purple: "#9b59b6",
        red: "#e0453f", green: "#4caf50", player: "#33c1e8"
    };

    function drawCarSprite(x, y, key) {
        var img = images["car_" + key];
        ctx.save();
        ctx.translate(x, y);
        if (imagesReady && img && img.naturalWidth) {
            ctx.drawImage(img, -CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
        } else {
            ctx.fillStyle = FALLBACK_COLORS[key] || "#999";
            roundRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H, 8);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawAmbulanceSprite(x, y) {
        var img = images.ambulance;
        var w = CAR_W + 8, h = CAR_H;
        ctx.save();
        ctx.translate(x, y);
        if (imagesReady && img && img.naturalWidth) {
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
            ctx.fillStyle = "#f4f4f4";
            roundRect(-w / 2, -h / 2, w, h, 8);
            ctx.fill();
        }
        var beaconColor = Math.floor(Date.now() / 200) % 2 === 0 ? "#3b6fd6" : "#d62828";
        ctx.fillStyle = beaconColor;
        ctx.fillRect(-10, -h / 2 - 6, 20, 8);
        ctx.restore();
    }

    function drawCrossing(y) {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        var stripeW = 14, gap = 10;
        for (var sx = ROAD_LEFT + 4; sx < ROAD_RIGHT - 4; sx += stripeW + gap) {
            ctx.fillRect(sx, y - 12, stripeW, 24);
        }
        ctx.restore();
    }

    function drawPedestrianSprite(x, y, elapsed) {
        var frame = Math.floor(elapsed / 0.25) % 2 === 0 ? images.pedestrian_1 : images.pedestrian_2;
        var w = 26, h = 46;
        ctx.save();
        ctx.translate(x, y);
        if (imagesReady && frame && frame.naturalWidth) {
            ctx.drawImage(frame, -w / 2, -h, w, h);
        } else {
            ctx.fillStyle = "#2b2b2b";
            ctx.beginPath();
            ctx.arc(0, -h + 8, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#e08e0b";
            roundRect(-6, -h + 14, 12, 20, 4);
            ctx.fill();
        }
        ctx.restore();
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawTrafficLight() {
        var lx = 26, ly = 30;
        ctx.fillStyle = "#222";
        ctx.fillRect(lx - 12, ly - 10, 24, 90);
        var colorsOff = "#3a1414,#3a3414,#123a1a".split(",");
        var order = ["red", "yellow", "green"];
        var glow = { red: "#ff4b4b", yellow: "#ffd23f", green: "#4caf50" };
        for (var i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(lx, ly + i * 26, 9, 0, Math.PI * 2);
            ctx.fillStyle = state.light.state === order[i] ? glow[order[i]] : colorsOff[i];
            ctx.fill();
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText(Math.ceil(state.light.timeLeft), lx, ly + 100);
    }

    var nightCanvas = document.createElement("canvas");
    nightCanvas.width = W;
    nightCanvas.height = H;
    var nightCtx = nightCanvas.getContext("2d");

    function drawNightOverlay() {
        // Level 5's "advanced" visual feature: a dusk filter with a
        // headlight-style spotlight following the player's car. The dark
        // tint + cutout are composited on an offscreen buffer first, then
        // drawn once onto the main canvas — punching the spotlight hole
        // with destination-out on the buffer only, so it reveals the true
        // colors underneath instead of erasing them or washing them white.
        nightCtx.clearRect(0, 0, W, H);
        nightCtx.globalCompositeOperation = "source-over";
        nightCtx.fillStyle = "rgba(5, 10, 30, 0.55)";
        nightCtx.fillRect(0, 0, W, H);

        nightCtx.globalCompositeOperation = "destination-out";
        var grad = nightCtx.createRadialGradient(
            laneCenterX(state.player.lane), state.player.y, 10,
            laneCenterX(state.player.lane), state.player.y, 220);
        grad.addColorStop(0, "rgba(0,0,0,0.95)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        nightCtx.fillStyle = grad;
        nightCtx.fillRect(0, 0, W, H);

        ctx.drawImage(nightCanvas, 0, 0);
    }

    function drawScreenFlash() {
        if (state.screenFlash <= 0) { return; }
        var alpha = Math.min(0.5, (state.screenFlash / 0.3) * 0.5);
        ctx.fillStyle = "rgba(220,30,30," + alpha + ")";
        ctx.fillRect(0, 0, W, H);
    }

    function draw() {
        drawRoad();
        drawSceneryColumn(state.sceneryLeft, true);
        drawSceneryColumn(state.sceneryRight, false);

        if (state.pedestrian) {
            drawCrossing(state.pedestrian.y);
        }

        drawTrafficLight();

        for (var i = 0; i < state.cars.length; i++) {
            var c = state.cars[i];
            drawCarSprite(laneCenterX(c.lane), c.y, c.colorKey);
        }
        if (state.ambulance) {
            drawAmbulanceSprite(laneCenterX(state.ambulance.lane), state.ambulance.y);
        }
        if (state.pedestrian && state.pedestrian.elapsed < state.pedestrian.crossDuration) {
            var progress = state.pedestrian.elapsed / state.pedestrian.crossDuration;
            drawPedestrianSprite(ROAD_LEFT + progress * (ROAD_RIGHT - ROAD_LEFT), state.pedestrian.y, state.pedestrian.elapsed);
        }

        if (state.shield) {
            ctx.save();
            var pulse = 4 * Math.sin(Date.now() / 150);
            ctx.beginPath();
            ctx.arc(laneCenterX(state.player.lane), state.player.y, CAR_H * 0.62 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(80,200,255,0.9)";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = "rgba(80,200,255,0.15)";
            ctx.fill();
            ctx.restore();
        }

        var flashingPlayer = state.invulnerable > 0 && Math.floor(state.invulnerable * 10) % 2 === 0;
        if (!flashingPlayer) {
            drawCarSprite(laneCenterX(state.player.lane), state.player.y, "player");
        }

        if (state.level >= 5) {
            drawNightOverlay();
        }
        drawScreenFlash();
    }

    // ---------- game over ----------
    function endGame() {
        if (!state.running) { return; }
        state.running = false;
        showBanner("giveWayBanner", false);
        showBanner("crossingBanner", false);
        showBanner("redLightBanner", false);

        var score = Math.floor(state.score);
        var stars = score >= 1500 ? 3 : score >= 800 ? 2 : score >= 300 ? 1 : 0;
        var messages = [
            "Brush up on the traffic rules and try again!",
            "Good try! Keep practicing the rules.",
            "Well done! You're getting there.",
            "Great Job! You are a Traffic Hero!"
        ];

        document.getElementById("starsDisplay").textContent =
            "\u2605".repeat(stars) + "\u2606".repeat(3 - stars);
        document.getElementById("overlayMessage").textContent =
            messages[stars] + " (Reached Level " + state.level + ")";
        document.getElementById("gameOverOverlay").className = "overlay show";

        // Hand the final score to the server so Session["BestScore"] can
        // be updated, then the UpdatePanel refreshes lblFinalScore /
        // lblBestScore in place.
        document.getElementById(THConfig.hiddenFieldId).value = score;
        if (typeof __doPostBack === "function") {
            __doPostBack(THConfig.saveScoreControlId, "");
        }
    }

    document.getElementById("btnPlayAgain").addEventListener("click", function () {
        document.getElementById("gameOverOverlay").className = "overlay";
        state = newState();
    });

    // ---------- loop ----------
    var lastTs = null;
    function loop(ts) {
        if (lastTs === null) { lastTs = ts; }
        var dt = Math.min((ts - lastTs) / 1000, 0.05);
        lastTs = ts;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }

    state = newState();
    requestAnimationFrame(loop);
})();
