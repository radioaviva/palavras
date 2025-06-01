document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('word-search-grid');
    const wordListElement = document.getElementById('words-to-find');
    const gridSize = 10;
    let grid = [];
    let currentSelection = []; // Células atualmente selecionadas (temporário)
    let startCell = null;
    let endCell = null;
    let isSelecting = false;

    let permanentlyMarkedCells = new Set(); // Armazena strings 'row-col' de células permanentemente marcadas

    const allBibleNames = [
        "ABRAAO", "ISRAEL", "MOISES", "DAVI", "NOE", "EVA", "ADAO", "SARA", "REBECA",
        "ISAQUE", "JACO", "JOSE", "BENJAMIM", "LEVI", "JUDAS", "CALEBE", "JOSUE",
        "DEBORA", "RAQUEL", "ESTER", "JOAO", "PEDRO", "PAULO", "MATEUS", "MARCOS",
        "LUCAS", "MARIA", "MARTA", "LAZARO", "SIMAO", "TIAGO", "ANDRE", "FILIPE",
        "TOME", "NATANAEL", "NICODEMOS",
        "ZACARIAS", "ISAIAS", "JEREMIAS", "EZEQUIEL", "DANIEL", "OSEIAS", "JOEL",
        "AMOS", "OBADIAS", "JONAS", "MIQUEIAS", "NAUM", "HABACUQUE", "SOFONIAS",
        "AGEU", "MALAQUIAS", "GEDEAO", "SAMUEL", "SAUL",
        "SALOMAO", "ELIAS", "ELISEU", "EZEQUIAS", "JOSIAS", "NEEMIAS",
        "ESDRAS", "RUTE", "ANA", "ELI", "ESTER", "TOBIAS", "GALILEIA", "JERUSALEM",
        "APOCALIPSE", "GENESIS", "EXODO", "LEVITICO", "NUMEROS", "DEUTERONOMIO", "PROVERBIOS", "SALMOS"
    ];

    let words = [];
    let foundWords = [];

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function selectRandomWords() {
        const shuffledNames = shuffleArray([...allBibleNames]);
        const validWords = shuffledNames.filter(word => word.length <= gridSize);
        words = validWords.slice(0, 10);
        if (words.length < 10) {
            console.warn(`Atenção: Apenas ${words.length} palavras válidas foram selecionadas para o jogo. Certifique-se de ter palavras suficientes (e com <= ${gridSize} letras) na sua lista.`);
        }
    }

    function createGrid() {
        gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        gridContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
        gridContainer.innerHTML = '';
        grid = [];
        for (let r = 0; r < gridSize; r++) {
            grid[r] = [];
            for (let c = 0; c < gridSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                gridContainer.appendChild(cell);
                grid[r][c] = { char: '', element: cell, occupied: false };
            }
        }
    }

    function fillEmptyCells() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        grid.forEach(row => {
            row.forEach(cell => {
                if (cell.char === '') {
                    cell.char = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
                }
                cell.element.textContent = cell.char;
            });
        });
    }

    function displayWordList() {
        wordListElement.innerHTML = '';
        words.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            li.dataset.word = word;
            wordListElement.appendChild(li);
        });
    }

    const directions = [
        { dr: 0, dc: 1, name: "horizontal" },       // Direita (E->D)
        { dr: 1, dc: 0, name: "vertical" },         // Baixo (C->B)
        { dr: 1, dc: 1, name: "diagonal-se" },      // Diagonal Sudeste (TL->BR)
        { dr: 1, dc: -1, name: "diagonal-sw" }       // Diagonal Sudoeste (TR->BL)
    ];

    function placeWords() {
        const sortedWords = [...words].sort((a, b) => b.length - a.length);
        sortedWords.forEach(word => {
            let placed = false;
            let attempts = 0;
            const maxAttempts = 5000;

            const possiblePlacements = [];
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    for (const dir of directions) {
                        possiblePlacements.push({ r, c, dir });
                    }
                }
            }
            shuffleArray(possiblePlacements);

            for (const placement of possiblePlacements) {
                if (placed) break;
                attempts++;
                if (attempts > maxAttempts) {
                    console.warn(`NÃO FOI POSSÍVEL POSICIONAR A PALAVRA: "${word}" após ${maxAttempts} tentativas. Considere ajustar o grid, o número/tamanho das palavras.`);
                    break;
                }

                let currentRow = placement.r;
                let currentCol = placement.c;
                let cellsToOccupy = [];
                let canPlace = true;

                for (let i = 0; i < word.length; i++) {
                    if (currentRow < 0 || currentRow >= gridSize || currentCol < 0 || currentCol >= gridSize) {
                        canPlace = false;
                        break;
                    }
                    const targetCell = grid[currentRow][currentCol];
                    if (targetCell.occupied && targetCell.char !== word[i]) {
                        canPlace = false;
                        break;
                    }
                    cellsToOccupy.push({ row: currentRow, col: currentCol, char: word[i] });
                    currentRow += placement.dir.dr;
                    currentCol += placement.dir.dc;
                }

                if (canPlace && cellsToOccupy.length === word.length) {
                    cellsToOccupy.forEach(cellInfo => {
                        grid[cellInfo.row][cellInfo.col].char = cellInfo.char;
                        grid[cellInfo.row][cellInfo.col].occupied = true;
                    });
                    placed = true;
                }
            }
        });
    }

    function getTargetCellFromEvent(event) {
        let targetElement = null;
        if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        } else {
            targetElement = event.target;
        }
        return targetElement && targetElement.classList.contains('grid-cell') ? targetElement : null;
    }

    function getCellsInLine(startRow, startCol, endRow, endCol) {
        const cells = [];
        const dr = endRow - startRow;
        const dc = endCol - startCol;

        if (dr === 0 && dc === 0) {
            cells.push({ row: startRow, col: startCol });
            return { cells: cells, direction: null, startCoords: {row: startRow, col: startCol}, endCoords: {row: endRow, col: endCol} };
        }

        const gcd = (a, b) => {
            if (b === 0) return a;
            return gcd(b, a % b);
        };
        const commonDivisor = gcd(Math.abs(dr), Math.abs(dc));

        let stepR = dr === 0 ? 0 : dr / commonDivisor;
        let stepC = dc === 0 ? 0 : dc / commonDivisor;

        const isHorizontal = stepR === 0 && Math.abs(stepC) === 1;
        const isVertical = Math.abs(stepR) === 1 && stepC === 0;
        const isDiagonal = Math.abs(stepR) === 1 && Math.abs(stepC) === 1;

        if (!isHorizontal && !isVertical && !isDiagonal) {
            return { cells: [], direction: null, startCoords: null, endCoords: null };
        }

        const numSteps = Math.max(Math.abs(dr), Math.abs(dc)) + 1;

        let currentR = startRow;
        let currentC = startCol;

        for (let i = 0; i < numSteps; i++) {
            if (currentR >= 0 && currentR < gridSize && currentC >= 0 && currentC < gridSize) {
                cells.push({ row: currentR, col: currentC });
            } else {
                return { cells: [], direction: null, startCoords: null, endCoords: null };
            }
            currentR += stepR;
            currentC += stepC;
        }

        // A direção aqui é da SELEÇÃO, não da palavra encontrada.
        // O `checkSelectedWord` vai determinar a direção final da palavra.
        return { cells: cells, direction: null, startCoords: {row: startRow, col: startCol}, endCoords: {row: endRow, col: endCol} };
    }

    function handleSelectionStart(e) {
        const cellElement = getTargetCellFromEvent(e);
        if (cellElement) {
            isSelecting = true;
            clearTemporarySelection();
            startCell = {
                row: parseInt(cellElement.dataset.row),
                col: parseInt(cellElement.dataset.col),
                element: cellElement
            };
            if (e.cancelable) e.preventDefault();
        }
    }

    function handleSelectionMove(e) {
        if (!isSelecting || !startCell) return;

        const cellElement = getTargetCellFromEvent(e);
        if (cellElement) {
            const currentRow = parseInt(cellElement.dataset.row);
            const currentCol = parseInt(cellElement.dataset.col);

            clearTemporarySelection();

            const { cells: newCells } = 
                getCellsInLine(startCell.row, startCell.col, currentRow, currentCol);

            if (newCells.length > 0) {
                newCells.forEach(cellCoords => {
                    const cell = grid[cellCoords.row][cellCoords.col];
                    if (!permanentlyMarkedCells.has(`${cellCoords.row}-${cellCoords.col}`)) {
                        cell.element.classList.add('selected');
                    }
                    currentSelection.push(cellCoords);
                });
                endCell = { row: currentRow, col: currentCol, element: cellElement };
            } else {
                if (!permanentlyMarkedCells.has(`${startCell.row}-${startCell.col}`)) {
                    startCell.element.classList.add('selected');
                }
                currentSelection = [{ row: startCell.row, col: startCell.col }];
                endCell = startCell;
            }
            
            if (e.cancelable) e.preventDefault();
        }
    }

    function handleSelectionEnd() {
        isSelecting = false;
        if (!startCell || !endCell || currentSelection.length < 2) {
            clearTemporarySelection();
            startCell = null;
            endCell = null;
            return;
        }

        let selectedWordText = '';
        currentSelection.forEach(cellCoords => {
            selectedWordText += grid[cellCoords.row][cellCoords.col].char;
        });
        selectedWordText = selectedWordText.toUpperCase();

        checkSelectedWord(selectedWordText);

        startCell = null;
        endCell = null;
    }

    function checkSelectedWord(selectedWordText) {
        if (selectedWordText.length === 0) {
            clearTemporarySelection();
            return;
        }

        let foundMatch = false;
        let finalWord = '';
        let finalCells = [];
        let finalStartCoords = null; // Coordenadas de row/col do início da palavra encontrada
        let finalEndCoords = null;   // Coordenadas de row/col do fim da palavra encontrada

        for (const word of words) {
            const normalizedWord = word.toUpperCase();

            // Verifica a palavra na ordem da seleção
            if (normalizedWord === selectedWordText && !foundWords.includes(word)) {
                foundMatch = true;
                finalWord = word;
                finalCells = currentSelection;
                finalStartCoords = { row: currentSelection[0].row, col: currentSelection[0].col };
                finalEndCoords = { row: currentSelection[currentSelection.length - 1].row, col: currentSelection[currentSelection.length - 1].col };
                break;
            }

            // Verifica a palavra na ordem inversa da seleção
            const reversedSelectedWordText = selectedWordText.split('').reverse().join('');
            if (normalizedWord === reversedSelectedWordText && !foundWords.includes(word)) {
                foundMatch = true;
                finalWord = word;
                finalCells = currentSelection.slice().reverse(); // Inverte as células para corresponder à palavra real
                
                // O start/end para a marcação deve ser o da palavra REAL
                finalStartCoords = { row: finalCells[0].row, col: finalCells[0].col };
                finalEndCoords = { row: finalCells[finalCells.length - 1].row, col: finalCells[finalCells.length - 1].col };
                break;
            }
        }

        if (foundMatch) {
            foundWords.push(finalWord);
            // Passa as coordenadas reais de início e fim da palavra para markWordAsFound
            markWordAsFound(finalWord, finalCells, finalStartCoords, finalEndCoords);
        } else {
            clearTemporarySelection(); // Limpa a seleção se a palavra não foi encontrada
        }

        if (foundWords.length === words.length && words.length > 0) {
            setTimeout(() => {
                alert('Parabéns! Você encontrou todas as palavras!');
            }, 100);
        }
    }

    function clearTemporarySelection() {
        currentSelection.forEach(cellCoords => {
            const cellElement = grid[cellCoords.row][cellCoords.col].element;
            if (cellElement && !permanentlyMarkedCells.has(`${cellCoords.row}-${cellCoords.col}`)) {
                cellElement.classList.remove('selected');
            }
        });
        currentSelection = [];
    }

    function markWordAsFound(word, selectedCells, startCoords, endCoords) {
        const listItem = document.querySelector(`#words-to-find li[data-word="${word}"]`);
        if (listItem) {
            listItem.classList.add('found');
        }

        // Determinar a direção APENAS com base no startCoords e endCoords da PALAVRA REAL
        const dr = endCoords.row - startCoords.row;
        const dc = endCoords.col - startCoords.col;

        let directionClass = '';
        if (dr === 0) { // Horizontal
            directionClass = 'horizontal';
        } else if (dc === 0) { // Vertical
            directionClass = 'vertical';
        } else if (Math.abs(dr) === Math.abs(dc)) { // Diagonal
            if (dr > 0 && dc > 0) { // TL -> BR (diagonal-se)
                directionClass = 'diagonal-se';
            } else if (dr > 0 && dc < 0) { // TR -> BL (diagonal-sw)
                directionClass = 'diagonal-sw';
            } else if (dr < 0 && dc < 0) { // BR -> TL (diagonal-se reversa)
                directionClass = 'diagonal-se';
            } else if (dr < 0 && dc > 0) { // BL -> TR (diagonal-sw reversa)
                directionClass = 'diagonal-sw';
            }
        }
        
        selectedCells.forEach((cellCoords, index) => {
            const cellElement = grid[cellCoords.row][cellCoords.col].element;
            
            // Remove a classe 'selected' e adiciona 'found-permanent'
            cellElement.classList.remove('selected');
            cellElement.classList.add('found-permanent');

            // Adiciona ao set de células permanentemente marcadas
            permanentlyMarkedCells.add(`${cellCoords.row}-${cellCoords.col}`);

            // Adiciona as classes de início/fim para a cápsula
            // Estas classes são aplicadas com base na ORDEM real da palavra, não da seleção.
            // Para diagonais reversas, o 'start' da palavra será a célula que foi o 'end' da seleção.
            if (index === 0) { // Primeira célula da palavra (na ordem real)
                cellElement.classList.add('found-start');
                if (directionClass) {
                    cellElement.classList.add(`${directionClass}-start`);
                }
            } else if (index === selectedCells.length - 1) { // Última célula da palavra (na ordem real)
                cellElement.classList.add('found-end');
                if (directionClass) {
                    cellElement.classList.add(`${directionClass}-end`);
                }
            }
        });
    }

    function initializeGame() {
        selectRandomWords();
        createGrid();
        
        grid.forEach(row => {
            row.forEach(cell => {
                cell.element.classList.remove(
                    'selected', 'found-permanent', 'found-start', 'found-end',
                    'horizontal-start', 'horizontal-end',
                    'vertical-start', 'vertical-end',
                    'diagonal-se-start', 'diagonal-se-end',
                    'diagonal-sw-start', 'diagonal-sw-end'
                );
            });
        });

        permanentlyMarkedCells.clear();
        placeWords();
        fillEmptyCells();
        displayWordList();
        foundWords = [];
        clearTemporarySelection();
    }

    initializeGame();

    gridContainer.addEventListener('mousedown', handleSelectionStart);
    gridContainer.addEventListener('mouseover', handleSelectionMove);
    gridContainer.addEventListener('mouseup', handleSelectionEnd);
    
    document.addEventListener('mouseup', () => {
        if (isSelecting) handleSelectionEnd();
    });

    gridContainer.addEventListener('touchstart', handleSelectionStart, { passive: false });
    gridContainer.addEventListener('touchmove', handleSelectionMove, { passive: false });
    gridContainer.addEventListener('touchend', handleSelectionEnd);
    
    document.addEventListener('touchend', () => {
        if (isSelecting) handleSelectionEnd();
    });
});
