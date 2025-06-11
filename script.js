// Cola aqui o teu JS inteirão do caça-palavras que tu mandou
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('wordSearchCanvas');
    if (!canvas) {
        console.warn("Canvas 'wordSearchCanvas' não encontrado. O script do caça-palavras pode não estar na página correta ou o elemento foi removido.");
        return;
    }

    const ctx = canvas.getContext('2d');
    const wordListElement = document.getElementById('word-list');
    const restartButton = document.getElementById('restart-button');
    const victoryRestartButton = document.getElementById('victory-restart-button');
    const victoryMessage = document.getElementById('victory-message');
    const timerDisplay = document.getElementById('timer-display');

    // Áudios
    const soundCorrect = new Audio('sons/acerto.mp3');
    const soundVictory = new Audio('sons/vitoria.mp3');
    soundCorrect.volume = 0.5;
    soundVictory.volume = 0.7;

    const ALL_WORD_SETS = [
        [ "MOISÉS", "DAVI", "ESTER", "NOÉ", "MARTA", "PEDRO", "PAULO", "JOÃO", "ABRAÃO", "SARA", "JESUS", "DEUS" ],
        [ "ISAIAS", "JEREMIAS", "EZEQUIEL", "DANIEL", "OSEIAS", "JOEL", "AMÓS", "OBADIAS", "JONAS", "MIQUEIAS" ],
        [ "MARIA", "JOSÉ", "ANA", "ELIAS", "SAMUEL", "JUDAS", "CALEBE", "GIDEÃO", "DEBORA", "RUTE" ],
        [ "REBECA", "JACÓ", "RAQUEL", "ISAQUE", "LABÃO", "ESAÚ", "LEIA", "SIMÃO", "BENJAMIM", "NOEMI" ],
        [ "GABRIEL", "MIGUEL", "RAFAEL", "ZACARIAS", "ISABEL", "JOANA", "TOMÉ", "MATEUS", "FILIPE", "ANDRÉ" ],
        [ "JAIRO", "SILAS", "SALOMÃO", "ELIZEU", "CANAÃ", "EVA", "ADÃO", "JOQUEBEDE", "EFRAIM", "GENESIS" ]
    ];

    const GRID_SIZE = 12;
    const CELL_SIZE = canvas.width / GRID_SIZE;
    const FONT_SIZE = CELL_SIZE * 0.6;
    const FONT_FAMILY = 'Arial Black, Arial';

    let grid = [];
    let currentWords = [];
    let foundWords = new Set();

    let isSelecting = false;
    let startCellCoords = { row: -1, col: -1 };
    let endCellCoords = { row: -1, col: -1 };
    let currentSelectionPath = [];

    let timerInterval;
    let secondsElapsed = 0;

    const directions = [
        { dr: 0, dc: 1 },   // Direita
        { dr: 1, dc: 0 },   // Baixo
        { dr: 1, dc: 1 },   // Baixo-direita
        { dr: 1, dc: -1 },  // Baixo-esquerda
        { dr: -1, dc: 1 },  // Cima-direita
        { dr: -1, dc: -1 }  // Cima-esquerda
    ];

    function initializeGame() {
        grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
        foundWords.clear();
        currentSelectionPath = [];
        isSelecting = false;
        startCellCoords = { row: -1, col: -1 };
        endCellCoords = { row: -1, col: -1 };

        clearInterval(timerInterval);
        secondsElapsed = 0;
        updateTimerDisplay();
        startTimer();

        victoryMessage.style.display = 'none';
        restartButton.style.display = 'block';
        victoryRestartButton.style.display = 'none';

        wordListElement.innerHTML = '';
        document.querySelectorAll('.confetti').forEach(c => c.remove());

        placeWords();
        fillEmptyCells();
        displayWordList();
        drawGrid();
    }

    function placeWords() {
        const randomIndex = Math.floor(Math.random() * ALL_WORD_SETS.length);
        currentWords = ALL_WORD_SETS[randomIndex].map(word => word.toUpperCase());

        const wordsToPlace = [...currentWords].sort(() => 0.5 - Math.random());

        wordsToPlace.forEach(word => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 1000) {
                const placementDirections = directions;
                const dir = placementDirections[Math.floor(Math.random() * placementDirections.length)];
                const startRow = Math.floor(Math.random() * GRID_SIZE);
                const startCol = Math.floor(Math.random() * GRID_SIZE);

                if (canPlaceWord(word, startRow, startCol, dir.dr, dir.dc)) {
                    for (let i = 0; i < word.length; i++) {
                        const r = startRow + i * dir.dr;
                        const c = startCol + i * dir.dc;
                        grid[r][c] = word[i];
                    }
                    placed = true;
                }
                attempts++;
            }
            if (!placed) {
                console.warn(`Não foi possível posicionar a palavra: "${word}". Ela será ignorada neste jogo.`);
                currentWords = currentWords.filter(w => w !== word);
            }
        });
    }

    function canPlaceWord(word, r, c, dr, dc) {
        if (r + (word.length - 1) * dr < 0 || r + (word.length - 1) * dr >= GRID_SIZE ||
            c + (word.length - 1) * dc < 0 || c + (word.length - 1) * dc >= GRID_SIZE) {
            return false;
        }
        for (let i = 0; i < word.length; i++) {
            const currentRow = r + i * dr;
            const currentCol = c + i * dc;
            if (grid[currentRow][currentCol] !== '' && grid[currentRow][currentCol] !== word[i]) {
                return false;
            }
        }
        return true;
    }

    function fillEmptyCells() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === '') {
                    grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
                }
            }
        }
    }

    function displayWordList() {
        wordListElement.innerHTML = '';
        currentWords.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            li.dataset.word = word;
            if (foundWords.has(word)) {
                li.style.textDecoration = 'line-through';
                li.style.color = '#999';
            }
            wordListElement.appendChild(li);
        });
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Letras
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const x = c * CELL_SIZE + CELL_SIZE / 2;
                const y = r * CELL_SIZE + CELL_SIZE / 2;

                // Fundo da célula se selecionada
                if (currentSelectionPath.some(cell => cell.row === r && cell.col === c)) {
                    ctx.fillStyle = 'rgba(41, 128, 185, 0.3)';
                    ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                } else if (isCellInFoundWord(r, c)) {
                    ctx.fillStyle = 'rgba(46, 204, 113, 0.5)';
                    ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }

                // Desenho da letra
                ctx.fillStyle = '#2c3e50';
                ctx.fillText(grid[r][c], x, y);
            }
        }

        // Grade
        ctx.strokeStyle = '#95a5a6';
        for (let i = 0; i <= GRID_SIZE; i++) {
            // Linhas horizontais
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
            ctx.stroke();

            // Linhas verticais
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.stroke();
        }
    }

    function isCellInFoundWord(r, c) {
        for (const word of foundWords) {
            for (let i = 0; i < word.length; i++) {
                const path = findWordPath(word);
                if (path.some(cell => cell.row === r && cell.col === c)) {
                    return true;
                }
            }
        }
        return false;
    }

    function findWordPath(word) {
        for (const dir of directions) {
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (checkWordInDirection(word, r, c, dir.dr, dir.dc)) {
                        return [...Array(word.length)].map((_, i) => ({
                            row: r + i * dir.dr,
                            col: c + i * dir.dc
                        }));
                    }
                }
            }
        }
        return [];
    }

    function checkWordInDirection(word, r, c, dr, dc) {
        for (let i = 0; i < word.length; i++) {
            const nr = r + i * dr;
            const nc = c + i * dc;
            if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
            if (grid[nr][nc] !== word[i]) return false;
        }
        return true;
    }

    function getCellFromCoords(x, y) {
        const rect = canvas.getBoundingClientRect();
        const col = Math.floor((x - rect.left) / CELL_SIZE);
        const row = Math.floor((y - rect.top) / CELL_SIZE);
        if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
            return { row, col };
        }
        return null;
    }

    function calculateSelectionPath(start, end) {
        const dr = end.row - start.row;
        const dc = end.col - start.col;

        const stepR = Math.sign(dr);
        const stepC = Math.sign(dc);

        if (stepR !== 0 && stepC !== 0 && Math.abs(dr) !== Math.abs(dc)) {
            return [];
        }
        if (stepR === 0 && stepC === 0) {
            return [start];
        }

        const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
        const path = [];
        for (let i = 0; i < length; i++) {
            path.push({
                row: start.row + i * stepR,
                col: start.col + i * stepC
            });
        }
        return path;
    }

    function checkWord() {
        const selectedWord = currentSelectionPath.map(cell => grid[cell.row][cell.col]).join('');
        if (currentWords.includes(selectedWord) && !foundWords.has(selectedWord)) {
            foundWords.add(selectedWord);
            if(soundCorrect) soundCorrect.play();
            displayWordList();
            drawGrid();
            if (foundWords.size === currentWords.length) {
                onVictory();
            }
        }
    }

    function onVictory() {
        clearInterval(timerInterval);
        victoryMessage.style.display = 'block';
        restartButton.style.display = 'none';
        victoryRestartButton.style.display = 'inline-block';
        if(soundVictory) soundVictory.play();
        createConfetti();
    }

    function createConfetti() {
        const colors = ['#e74c3c', '#27ae60', '#f1c40f', '#3498db', '#9b59b6'];
        const confettiCount = 120;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = Math.random() * window.innerWidth + 'px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = 3000 + Math.random() * 2000 + 'ms';
            confetti.style.animationDelay = (i * 10) + 'ms';
            confetti.style.width = confetti.style.height = (Math.random() * 7 + 3) + 'px';
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 6000);
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const seconds = (secondsElapsed % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `Tempo: ${minutes}:${seconds}`;
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
    }

    // Eventos do mouse e touch
    canvas.addEventListener('mousedown', e => {
        const cell = getCellFromCoords(e.clientX, e.clientY);
        if (cell) {
            isSelecting = true;
            startCellCoords = cell;
            currentSelectionPath = [cell];
            drawGrid();
        }
    });

    canvas.addEventListener('mousemove', e => {
        if (isSelecting) {
            const cell = getCellFromCoords(e.clientX, e.clientY);
            if (cell && (cell.row !== endCellCoords.row || cell.col !== endCellCoords.col)) {
                endCellCoords = cell;
                currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
                drawGrid();
            }
        }
    });

    canvas.addEventListener('mouseup', e => {
        if (isSelecting) {
            checkWord();
            isSelecting = false;
            currentSelectionPath = [];
            drawGrid();
        }
    });

    // Touch Events
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const cell = getCellFromCoords(touch.clientX, touch.clientY);
        if (cell) {
            isSelecting = true;
            startCellCoords = cell;
            currentSelectionPath = [cell];
            drawGrid();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (isSelecting) {
            const touch = e.touches[0];
            const cell = getCellFromCoords(touch.clientX, touch.clientY);
            if (cell && (cell.row !== endCellCoords.row || cell.col !== endCellCoords.col)) {
                endCellCoords = cell;
                currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
                drawGrid();
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        if (isSelecting) {
            checkWord();
            isSelecting = false;
            currentSelectionPath = [];
            drawGrid();
        }
    }, { passive: false });

    restartButton.addEventListener('click', () => {
        initializeGame();
    });

    victoryRestartButton.addEventListener('click', () => {
        initializeGame();
    });

    initializeGame();
});
