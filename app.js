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
    const name = nameInput.value.trim();
    if (!name) return;
    if (names.some(n => n.toLowerCase() === name.toLowerCase())) {
        nameInput.select();
        return;
    }
    names.push(name);
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
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444',
    '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
    '#e11d48', '#84cc16', '#a855f7', '#0ea5e9', '#d946ef',
];
let currentAngle = 0;
let spinning = false;

function drawWheel() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 4;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (names.length === 0) {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
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
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + sliceAngle / 2);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelRadius = radius * 0.65;
        ctx.fillText(name.length > 12 ? name.slice(0, 11) + '…' : name, labelRadius, 0);
        ctx.restore();
    });
}

function spinWheel() {
    if (spinning || names.length === 0) return;
    spinning = true;
    spinBtn.disabled = true;
    setInputsEnabled(false);
    winnerDisplay.textContent = '';

    const totalRotation = Math.PI * 2 * (4 + Math.random() * 4); // 4-8 full spins
    const duration = ultraSlowMode ? 60000 : 3000 + Math.random() * 1000;
    const startAngle = currentAngle;
    const startTime = performance.now();

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        currentAngle = startAngle + totalRotation * eased;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            spinning = false;
            spinBtn.disabled = false;
            setInputsEnabled(true);
            // Determine winner: pointer is at the top (-PI/2)
            const sliceAngle = (Math.PI * 2) / names.length;
            const norm = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const pointerPos = ((-Math.PI / 2 - norm) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            const winnerIndex = Math.floor(pointerPos / sliceAngle) % names.length;
            winnerDisplay.textContent = `🎉 ${names[winnerIndex]}!`;
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
    renderGroups(groups);
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
