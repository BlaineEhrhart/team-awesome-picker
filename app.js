// --- Sound Effects (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function ensureAudioResumed() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTick(time, pitch = 800, volume = 0.15) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.06);
}

function playVictoryFanfare() {
    const now = audioCtx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.2, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.3);
    });
    // Final shimmer
    const shimmer = audioCtx.createOscillator();
    const sGain = audioCtx.createGain();
    shimmer.connect(sGain);
    sGain.connect(audioCtx.destination);
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1047, now + 0.48);
    shimmer.frequency.exponentialRampToValueAtTime(2094, now + 0.9);
    sGain.gain.setValueAtTime(0.15, now + 0.48);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    shimmer.start(now + 0.48);
    shimmer.stop(now + 1.0);
}

// --- State ---
let names = JSON.parse(localStorage.getItem('teamNames') || '[]');

// --- DOM refs ---
const nameInput = document.getElementById('nameInput');
const addBtn = document.getElementById('addBtn');
const nameChips = document.getElementById('nameChips');
const spinBtn = document.getElementById('spinBtn');
const generateBtn = document.getElementById('generateBtn');
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const winnerDisplay = document.getElementById('winnerDisplay');
const groupSizeInput = document.getElementById('groupSize');
const groupsGrid = document.getElementById('groupsGrid');

// --- Name Management ---
function saveNames() {
    localStorage.setItem('teamNames', JSON.stringify(names));
}

function setInputsEnabled(enabled) {
    nameInput.disabled = !enabled;
    addBtn.disabled = !enabled;
    document.querySelectorAll('.chip button').forEach(b => b.disabled = !enabled);
}

function addName() {
    const raw = nameInput.value;
    if (!raw.trim()) return;
    const entries = raw.split(',').map(s => s.trim()).filter(Boolean);
    let added = false;
    for (const entry of entries) {
        if (names.some(n => n.toLowerCase() === entry.toLowerCase())) continue;
        names.push(entry);
        added = true;
    }
    if (!added) {
        nameInput.select();
        return;
    }
    nameInput.value = '';
    nameInput.focus();
    saveNames();
    render();
}

function removeName(index) {
    names.splice(index, 1);
    saveNames();
    render();
}

function renderChips() {
    nameChips.innerHTML = '';
    names.forEach((name, i) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = name;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', `Remove ${name}`);
        removeBtn.addEventListener('click', () => removeName(i));
        chip.appendChild(removeBtn);
        nameChips.appendChild(chip);
    });
}

function updateButtonStates() {
    const hasNames = names.length > 0;
    spinBtn.disabled = !hasNames;
    generateBtn.disabled = !hasNames;
}

// --- Wheel ---
const COLORS = [
    '#00ffff', '#ff00ff', '#ff2d95', '#7b2dff', '#00ff88',
    '#0088ff', '#ff6600', '#ff0066', '#00ccaa', '#aa00ff',
    '#ffcc00', '#00aaff', '#ff3366', '#33ffcc', '#cc00ff',
];
let currentAngle = 0;
let spinning = false;

function drawWheel() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 4;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (names.length === 0) {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#5a6a8a';
        ctx.font = '14px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Add names to spin', cx, cy);
        return;
    }

    const sliceAngle = (Math.PI * 2) / names.length;

    names.forEach((name, i) => {
        const start = currentAngle + i * sliceAngle;
        const end = start + sliceAngle;

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + sliceAngle / 2);
        ctx.font = 'bold 13px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelRadius = radius * 0.65;
        const label = name.length > 12 ? name.slice(0, 11) + '…' : name;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(label, labelRadius, 0);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, labelRadius, 0);
        ctx.restore();
    });
}

function spinWheel() {
    if (spinning || names.length === 0) return;
    spinning = true;
    spinBtn.disabled = true;
    setInputsEnabled(false);
    winnerDisplay.textContent = '';

    ensureAudioResumed();
    const totalRotation = Math.PI * 2 * (4 + Math.random() * 4); // 4-8 full spins
    const duration = ultraSlowMode ? 60000 : 3000 + Math.random() * 1000;
    const startAngle = currentAngle;
    const startTime = performance.now();
    let lastSliceIndex = -1;

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        currentAngle = startAngle + totalRotation * eased;
        drawWheel();

        // Play tick when crossing a slice boundary
        const sliceAngle = (Math.PI * 2) / names.length;
        const norm = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const currentSlice = Math.floor(norm / sliceAngle);
        if (currentSlice !== lastSliceIndex) {
            lastSliceIndex = currentSlice;
            const pitch = 600 + (1 - progress) * 600; // higher pitch when fast
            playTick(audioCtx.currentTime, pitch, 0.12);
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            spinning = false;
            spinBtn.disabled = false;
            setInputsEnabled(true);
            // Determine winner: pointer is at the top (-PI/2)
            const norm = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const pointerPos = ((-Math.PI / 2 - norm) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            const winnerIndex = Math.floor(pointerPos / sliceAngle) % names.length;
            winnerDisplay.textContent = `🎉 ${names[winnerIndex]}!`;
            playVictoryFanfare();
        }
    }

    requestAnimationFrame(animate);
}

// --- Random Groups ---
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateGroups() {
    if (names.length === 0) return;
    const size = Math.max(1, Math.min(names.length, parseInt(groupSizeInput.value) || 2));
    groupSizeInput.value = size;
    generateBtn.disabled = true;

    const shuffled = shuffle(names);
    const numGroups = Math.ceil(shuffled.length / size);
    const baseSize = Math.floor(shuffled.length / numGroups);
    const remainder = shuffled.length % numGroups;
    const groups = [];
    let index = 0;
    for (let i = 0; i < numGroups; i++) {
        const groupSize = baseSize + (i < remainder ? 1 : 0);
        groups.push(shuffled.slice(index, index + groupSize));
        index += groupSize;
    }
    // Never allow a group of 1 — merge singleton into the previous group
    if (groups.length > 1 && groups[groups.length - 1].length === 1) {
        const singleton = groups.pop();
        groups[groups.length - 1].push(...singleton);
    }

    animateCardShuffle(shuffled, groups);
}

function animateCardShuffle(shuffled, groups) {
    // Set up the overlay container
    groupsGrid.innerHTML = '';
    groupsGrid.classList.add('shuffle-overlay');
    const gridRect = groupsGrid.getBoundingClientRect();
    const areaW = groupsGrid.offsetWidth;
    const areaH = Math.max(200, groupsGrid.offsetHeight);
    groupsGrid.style.minHeight = areaH + 'px';

    // Create card elements starting stacked in the center
    const cards = shuffled.map((name) => {
        const el = document.createElement('div');
        el.className = 'shuffle-card';
        el.textContent = name;
        groupsGrid.appendChild(el);
        // Start stacked in center
        const cardW = el.offsetWidth;
        const cardH = el.offsetHeight;
        el.style.left = (areaW / 2 - cardW / 2) + 'px';
        el.style.top = (areaH / 2 - cardH / 2) + 'px';
        el.style.transform = 'rotate(0deg) scale(0)';
        return { el, name, w: cardW, h: cardH };
    });

    // Phase 1: Deal cards out to random positions
    ensureAudioResumed();
    requestAnimationFrame(() => {
        cards.forEach((card, i) => {
            setTimeout(() => {
                card.el.classList.add('dealing');
                const x = Math.random() * (areaW - card.w - 20) + 10;
                const y = Math.random() * (areaH - card.h - 20) + 10;
                const rot = (Math.random() - 0.5) * 30;
                card.el.style.left = x + 'px';
                card.el.style.top = y + 'px';
                card.el.style.transform = `rotate(${rot}deg) scale(1)`;
                playTick(audioCtx.currentTime, 400 + i * 30, 0.1);
            }, i * 60);
        });
    });

    const dealTime = cards.length * 60 + 600;

    // Phase 2: Shuffle — move cards around randomly a few times
    const shuffleRounds = 3;
    const shuffleInterval = 400;
    setTimeout(() => {
        let round = 0;
        function doShuffleRound() {
            if (round >= shuffleRounds) {
                // Phase 3: Settle into groups
                settleIntoGroups(cards, groups, areaW, areaH);
                return;
            }
            round++;
            cards.forEach((card, ci) => {
                card.el.classList.remove('dealing');
                card.el.classList.add('shuffling');
                const x = Math.random() * (areaW - card.w - 20) + 10;
                const y = Math.random() * (areaH - card.h - 20) + 10;
                const rot = (Math.random() - 0.5) * 40;
                card.el.style.left = x + 'px';
                card.el.style.top = y + 'px';
                card.el.style.transform = `rotate(${rot}deg) scale(1)`;
            });
            // Shuffle whoosh sound per round
            playTick(audioCtx.currentTime, 300 + round * 100, 0.15);
            setTimeout(doShuffleRound, shuffleInterval);
        }
        doShuffleRound();
    }, dealTime);
}

function settleIntoGroups(cards, groups, areaW, areaH) {
    const minColWidth = 150;
    const rowHeight = 32;
    const groupHeaderHeight = 28;
    const padding = 12;

    // Determine how many columns fit per row, then wrap
    const colsPerRow = Math.max(1, Math.floor((areaW - padding) / minColWidth));
    const colWidth = (areaW - padding) / Math.min(groups.length, colsPerRow);

    // Calculate row offsets — each "row of groups" is stacked vertically
    function getGroupPosition(gi) {
        const row = Math.floor(gi / colsPerRow);
        const col = gi % colsPerRow;
        // Find the tallest group in previous rows to get the y offset
        let yOffset = padding;
        for (let r = 0; r < row; r++) {
            let maxInRow = 0;
            for (let c = 0; c < colsPerRow; c++) {
                const idx = r * colsPerRow + c;
                if (idx < groups.length) {
                    maxInRow = Math.max(maxInRow, groups[idx].length);
                }
            }
            yOffset += groupHeaderHeight + maxInRow * rowHeight + padding;
        }
        return { x: col * colWidth + padding, y: yOffset };
    }

    // Add group header labels
    groups.forEach((group, gi) => {
        const pos = getGroupPosition(gi);
        const header = document.createElement('div');
        header.className = 'shuffle-card settling';
        header.style.fontWeight = '700';
        header.style.color = 'var(--primary)';
        header.style.background = 'transparent';
        header.style.border = 'none';
        header.style.boxShadow = 'none';
        header.style.fontSize = '0.9rem';
        header.style.left = pos.x + 'px';
        header.style.top = pos.y + 'px';
        header.style.transform = 'scale(1)';
        header.style.opacity = '0';
        header.textContent = `Group ${gi + 1}`;
        groupsGrid.appendChild(header);
        setTimeout(() => { header.style.opacity = '1'; }, 400);
    });

    // Build a name -> target position map
    const targets = {};
    groups.forEach((group, gi) => {
        const pos = getGroupPosition(gi);
        group.forEach((name, ni) => {
            targets[name] = {
                x: pos.x,
                y: pos.y + groupHeaderHeight + ni * rowHeight,
            };
        });
    });

    // Calculate needed height from the last row of groups
    const lastRowStart = Math.floor((groups.length - 1) / colsPerRow) * colsPerRow;
    let lastRowMaxMembers = 0;
    for (let c = lastRowStart; c < groups.length; c++) {
        lastRowMaxMembers = Math.max(lastRowMaxMembers, groups[c].length);
    }
    const lastGroupPos = getGroupPosition(groups.length - 1);
    const neededHeight = lastGroupPos.y + groupHeaderHeight + lastRowMaxMembers * rowHeight + padding;
    groupsGrid.style.minHeight = neededHeight + 'px';

    // Settle cards
    cards.forEach(card => {
        card.el.classList.remove('shuffling');
        card.el.classList.add('settling');
        const t = targets[card.name];
        card.el.style.left = t.x + 'px';
        card.el.style.top = t.y + 'px';
        card.el.style.transform = 'rotate(0deg) scale(1)';
    });

    // Victory fanfare when groups are formed
    setTimeout(() => playVictoryFanfare(), 400);

    // Re-enable generate button after animation
    setTimeout(() => {
        generateBtn.disabled = names.length === 0;
    }, 600);
}

function renderGroups(groups) {
    groupsGrid.innerHTML = '';
    groups.forEach((group, i) => {
        const card = document.createElement('div');
        card.className = 'group-card';
        const h3 = document.createElement('h3');
        h3.textContent = `Group ${i + 1}`;
        card.appendChild(h3);
        const ul = document.createElement('ul');
        group.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            ul.appendChild(li);
        });
        card.appendChild(ul);
        groupsGrid.appendChild(card);
    });
}

function clearResults() {
    winnerDisplay.textContent = '';
    groupsGrid.innerHTML = '<p class="empty-state">Add names and click Generate to create groups.</p>';
}

function render() {
    renderChips();
    updateButtonStates();
    drawWheel();
    clearResults();
}

// --- Event Listeners ---
addBtn.addEventListener('click', addName);
nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addName();
});
spinBtn.addEventListener('click', spinWheel);
generateBtn.addEventListener('click', generateGroups);

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
});

// --- Konami Code ---
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIndex = 0;
const secretOverlay = document.getElementById('secretOverlay');

document.addEventListener('keydown', (e) => {
    if (e.key === KONAMI[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === KONAMI.length) {
            konamiIndex = 0;
            secretOverlay.classList.add('active');
        }
    } else {
        konamiIndex = e.key === KONAMI[0] ? 1 : 0;
    }
});

document.getElementById('secretClose').addEventListener('click', () => {
    secretOverlay.classList.remove('active');
});

secretOverlay.addEventListener('click', (e) => {
    if (e.target === secretOverlay) secretOverlay.classList.remove('active');
});

let ultraSlowMode = false;
document.getElementById('secretSlow').addEventListener('click', () => {
    ultraSlowMode = !ultraSlowMode;
    document.getElementById('secretSlow').textContent = ultraSlowMode
        ? 'Ultra Slow Spin: ON'
        : 'Ultra Slow Spin (60s)';
    secretOverlay.classList.remove('active');
});

// --- Init ---
render();
