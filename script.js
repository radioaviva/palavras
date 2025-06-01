document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('word-search-grid');
    const wordListElement = document.getElementById('words-to-find');
    const gridSize = 10; // Definido o tamanho do grid como 10x10
    let grid = [];
    let currentSelection = []; // Armazenará as células {row, col} da seleção atual
    let startCell = null; // Célula de início da seleção
    let endCell = null;   // Célula de fim da seleção (arrastada)
    let isSelecting = false;

    // --- SUA LISTA GRANDE DE NOMES DA BÍBLIA AQUI ---
    // Coloque todos os nomes em MAIÚSCULAS para evitar problemas de case.
    // Para um grid 10x10, nomes com MAIS DE 10 LETRAS NÃO SERÃO POSICIONADOS.
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

    let words = []; // Esta será a lista de 10 palavras para o jogo atual
    let foundWords = []; // Armazena as palavras já encontradas neste jogo

    // --- Funções Auxiliares ---

    // Função para embaralhar um array (Fisher-Yates shuffle)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Seleciona 10 palavras aleatórias da lista completa e filtra por tamanho
    function selectRandomWords() {
        // Embaralha a lista completa de nomes para garantir aleatoriedade
        const shuffledNames = shuffleArray([...allBibleNames]); // Cria uma cópia para não modificar o original

        // Filtra as palavras para garantir que cabem no grid (<= gridSize)
        const validWords = shuffledNames.filter(word => word.length <= gridSize);

        // Pega as primeiras 10 palavras válidas
        words = validWords.slice(0, 10);

        // Aviso se não houver palavras suficientes para preencher o jogo
        if (words.length < 10) {
            console.warn(`Atenção: Apenas ${words.length} palavras válidas foram selecionadas para o jogo. Certifique-se de ter palavras suficientes (e com <= ${gridSize} letras) na sua lista.`);
        }
    }

    // --- Funções de Criação e Preenchimento do Grid ---

    function createGrid() {
        gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        gridContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        // Limpa o grid antes de recriar para um novo jogo
        gridContainer.innerHTML = '';
        grid = []; // Reseta o array de dados do grid

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
        wordListElement.innerHTML = ''; // Limpa a lista anterior
        words.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            li.dataset.word = word;
            wordListElement.appendChild(li);
        });
    }

    // --- Lógica de Posicionamento das Palavras no Grid ---
    const directions = [
        { dr: 0, dc: 1 },   // Horizontal (Esquerda para Direita)
        { dr: 1, dc: 0 },   // Vertical (Cima para Baixo)
        { dr: 1, dc: 1 },   // Diagonal (Superior-Esquerda para Inferior-Direita)
        { dr: 1, dc: -1 }   // Diagonal (Superior-Direita para Inferior-Esquerda)
        // Para adicionar direções reversas, adicione:
        // { dr: 0, dc: -1 }, // Horizontal (Direita para Esquerda)
        // { dr: -1, dc: 0 }, // Vertical (Baixo para Cima)
        // { dr: -1, dc: -1 },// Diagonal (Inferior-Direita para Superior-Esquerda)
        // { dr: -1, dc: 1 }  // Diagonal (Inferior-Esquerda para Superior-Direita)
    ];

    function placeWords() {
        // Ordena as palavras por tamanho para tentar encaixar as maiores primeiro
        const sortedWords = [...words].sort((a, b) => b.length - a.length);

        sortedWords.forEach(word => {
            let placed = false;
            let attempts = 0;
            const maxAttempts = 5000; // Aumentei o número de tentativas para melhor chance de posicionamento

            while (!placed && attempts < maxAttempts) {
                attempts++;
                const directionIndex = Math.floor(Math.random() * directions.length);
                const { dr, dc } = directions[directionIndex];

                const startRow = Math.floor(Math.random() * gridSize);
                const startCol = Math.floor(Math.random() * gridSize);

                let currentRow = startRow;
                let currentCol = startCol;
                let cellsToOccupy = [];
                let canPlace = true;

                for (let i = 0; i < word.length; i++) {
                    // Verifica se a posição atual está dentro dos limites do grid
                    if (currentRow < 0 || currentRow >= gridSize || currentCol < 0 || currentCol >= gridSize) {
                        canPlace = false;
                        break;
                    }

                    const targetCell = grid[currentRow][currentCol];
                    // Verifica se a célula está ocupada por outra letra E se a letra é diferente
                    if (targetCell.occupied && targetCell.char !== word[i]) {
                        canPlace = false;
                        break;
                    }

                    cellsToOccupy.push({ row: currentRow, col: currentCol, char: word[i] });
                    currentRow += dr;
                    currentCol += dc;
                }

                // Se puder colocar a palavra e o número de células for igual ao tamanho da palavra
                if (canPlace && cellsToOccupy.length === word.length) {
                    cellsToOccupy.forEach(cellInfo => {
                        grid[cellInfo.row][cellInfo.col].char = cellInfo.char;
                        grid[cellInfo.row][cellInfo.col].occupied = true;
                    });
                    placed = true;
                }
            }

            if (!placed) {
                console.warn(`NÃO FOI POSSÍVEL POSICIONAR A PALAVRA: "${word}". Considere ajustar o grid, o número/tamanho das palavras, ou aumentar maxAttempts.`);
            }
        });
    }

    // --- Lógica de Interação do Usuário (Seleção) ---

    // Obtém o elemento da célula a partir de um evento de mouse/toque
    function getTargetCellFromEvent(event) {
        let targetElement = null;
        if (event.touches) {
            const touch = event.touches[0];
            targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        } else {
            targetElement = event.target;
        }
        return targetElement && targetElement.classList.contains('grid-cell') ? targetElement : null;
    }

    // Função para calcular todas as células em uma linha reta entre dois pontos
    function getCellsInLine(startRow, startCol, endRow, endCol) {
        const cells = [];
        const dr = endRow - startRow; // Diferença de linhas
        const dc = endCol - startCol; // Diferença de colunas

        // Determina se a linha é horizontal, vertical ou diagonal
        const isHorizontal = dr === 0;
        const isVertical = dc === 0;
        const isDiagonal = Math.abs(dr) === Math.abs(dc);

        if (!isHorizontal && !isVertical && !isDiagonal) {
            return []; // Não é uma linha reta válida para caça-palavras
        }

        const len = Math.max(Math.abs(dr), Math.abs(dc));
        if (len === 0) { // Apenas uma célula selecionada (clique)
            cells.push({ row: startRow, col: startCol });
            return cells;
        }

        // Direções de passo (incremento de 1, -1 ou 0)
        const stepR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
        const stepC = dc === 0 ? 0 : (dc > 0 ? 1 : -1);

        for (let i = 0; i <= len; i++) {
            const r = startRow + i * stepR;
            const c = startCol + i * stepC;
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                 cells.push({ row: r, col: c });
            } else {
                // Se a linha sair do grid durante o arrasto, invalida a seleção
                return [];
            }
        }
        return cells;
    }

    function handleSelectionStart(e) {
        const cellElement = getTargetCellFromEvent(e);
        if (cellElement) {
            isSelecting = true;
            clearSelection(); // Limpa qualquer seleção anterior visualmente
            startCell = {
                row: parseInt(cellElement.dataset.row),
                col: parseInt(cellElement.dataset.col),
                element: cellElement
            };
            // Adiciona a primeira célula à seleção visual imediatamente
            startCell.element.classList.add('selected');
            currentSelection.push(startCell); // Armazena a primeira célula como parte da seleção
            
            if (e.cancelable) e.preventDefault(); // Evita rolagem em toque
        }
    }

    function handleSelectionMove(e) {
        if (!isSelecting || !startCell) return; // Só processa se a seleção estiver ativa

        const cellElement = getTargetCellFromEvent(e);
        if (cellElement) {
            const currentRow = parseInt(cellElement.dataset.row);
            const currentCol = parseInt(cellElement.dataset.col);

            // Calcula todas as células que formam uma linha reta entre a célula inicial e a atual
            const newCells = getCellsInLine(startCell.row, startCell.col, currentRow, currentCol);
            
            // Limpa a seleção visual anterior (todas as células que estavam selecionadas)
            currentSelection.forEach(cellCoords => {
                grid[cellCoords.row][cellCoords.col].element.classList.remove('selected');
            });
            currentSelection = []; // Reseta o array de células selecionadas

            // Adiciona as novas células selecionadas visualmente
            newCells.forEach(cellCoords => {
                const cell = grid[cellCoords.row][cellCoords.col];
                cell.element.classList.add('selected');
                currentSelection.push(cellCoords); // Armazena apenas as coordenadas para a próxima iteração
            });
            endCell = { row: currentRow, col: currentCol, element: cellElement }; // Atualiza a célula final

            if (e.cancelable) e.preventDefault(); // Evita rolagem em toque
        }
    }

    function handleSelectionEnd() {
        isSelecting = false;
        if (!startCell || !endCell || currentSelection.length === 0) {
            // Se não houve uma seleção válida (ex: apenas clicou e soltou sem arrastar, ou arrasto inválido)
            clearSelection();
            startCell = null;
            endCell = null;
            return;
        }

        // Constrói a palavra a partir das células selecionadas na ordem correta
        let selectedWordText = '';
        currentSelection.forEach(cellCoords => {
            selectedWordText += grid[cellCoords.row][cellCoords.col].char;
        });
        selectedWordText = selectedWordText.toUpperCase(); // Normaliza para maiúsculas

        checkSelectedWord(selectedWordText); // Chama a função de verificação

        startCell = null; // Reseta o início da seleção
        endCell = null;   // Reseta o fim da seleção
    }

    // VERIFICA SE A PALAVRA SELECIONADA É UMA PALAVRA A SER ENCONTRADA
    function checkSelectedWord(selectedWordText) {
        if (selectedWordText.length === 0) {
            clearSelection();
            return;
        }
        
        let foundMatch = false;

        words.forEach(word => {
            const normalizedWord = word.toUpperCase();
            
            // Verifica a palavra no sentido selecionado (da primeira para a última célula)
            if (normalizedWord === selectedWordText && !foundWords.includes(word)) {
                foundMatch = true;
                foundWords.push(word);
                
                // MUDANÇA AQUI: Chamamos markWordAsFound com a seleção atual
                markWordAsFound(word, currentSelection, startCell, endCell); // Passa as células para saber onde marcar
                return;
            }
            
            // Opcional: Verifica a palavra no sentido inverso (se você permitir isso no jogo)
            // const reversedSelectedWordText = selectedWordText.split('').reverse().join('');
            // if (normalizedWord === reversedSelectedWordText && !foundWords.includes(word)) {
            //     foundMatch = true;
            //     foundWords.push(word);
            //     // Para palavras inversas, as células inicial e final seriam invertidas
            //     // Passamos uma cópia invertida de currentSelection
            //     markWordAsFound(word, currentSelection.slice().reverse(), endCell, startCell);
            //     return;
            // }
        });

        // Se a palavra não foi encontrada ou já foi encontrada, limpa a seleção visual
        if (!foundMatch) {
            clearSelection();
        }

        // Verifica se todas as palavras foram encontradas
        if (foundWords.length === words.length && words.length > 0) {
            setTimeout(() => {
                alert('Parabéns! Você encontrou todas as palavras!');
                // Opcional: Iniciar um novo jogo automaticamente ou mostrar um botão
                // if (confirm('Jogar novamente?')) {
                //    initializeGame();
                // }
            }, 100);
        }
    }

    // Limpa a seleção visual e o array `currentSelection`
    function clearSelection() {
        currentSelection.forEach(cellCoords => {
            const cellElement = grid[cellCoords.row][cellCoords.col].element;
            if (cellElement) {
                cellElement.classList.remove('selected');
            }
        });
        currentSelection = [];
    }

    // VERSÃO FINAL E MELHORADA DA FUNÇÃO markWordAsFound
    function markWordAsFound(word, selectedCells, startCellObj, endCellObj) {
        // 1. Marca a palavra como encontrada na lista lateral
        const listItem = document.querySelector(`#words-to-find li[data-word="${word}"]`);
        if (listItem) {
            listItem.classList.add('found');
        }

        // 2. Determina a direção e aplica as classes de extremidade
        let directionClass = '';
        const dr = endCellObj.row - startCellObj.row; // Diferença de linha do início ao fim
        const dc = endCellObj.col - startCellObj.col; // Diferença de coluna do início ao fim

        // Verifica o tipo principal de direção
        if (dr === 0) { // Horizontal (dr é 0, dc é diferente de 0)
            directionClass = 'horizontal';
        } else if (dc === 0) { // Vertical (dc é 0, dr é diferente de 0)
            directionClass = 'vertical';
        } else if (Math.abs(dr) === Math.abs(dc)) { // Diagonal (abs(dr) é igual a abs(dc))
            // Para as diagonais, a direção de 'start' e 'end' depende da sub-direção:
            // dr > 0 (descendo) e dc > 0 (direita) -> diagonal-se (sudeste)
            // dr > 0 (descendo) e dc < 0 (esquerda) -> diagonal-sw (sudoeste)
            // dr < 0 (subindo) e dc < 0 (esquerda) -> diagonal-se (nordeste - espelhado)
            // dr < 0 (subindo) e dc > 0 (direita) -> diagonal-sw (noroeste - espelhado)

            if (dr > 0 && dc > 0) { // De cima-esquerda para baixo-direita
                directionClass = 'diagonal-se';
            } else if (dr > 0 && dc < 0) { // De cima-direita para baixo-esquerda
                directionClass = 'diagonal-sw';
            } else if (dr < 0 && dc < 0) { // De baixo-direita para cima-esquerda (mesma forma da diagonal-se, mas em reverso)
                directionClass = 'diagonal-se';
            } else if (dr < 0 && dc > 0) { // De baixo-esquerda para cima-direita (mesma forma da diagonal-sw, mas em reverso)
                directionClass = 'diagonal-sw';
            }
        }
        
        // Aplica as classes `found-permanent` e as de extremidade às células selecionadas
        selectedCells.forEach((cellCoords, index) => {
            const cellElement = grid[cellCoords.row][cellCoords.col].element;
            
            // Remove classes de seleção temporária e adiciona a permanente
            cellElement.classList.remove('selected');
            cellElement.classList.add('found-permanent');

            // Lógica para aplicar as classes de borda arredondada nas extremidades
            if (index === 0) { // Primeira célula da seleção
                cellElement.classList.add('found-start');
                // Adiciona a classe de direção para a extremidade inicial
                if (directionClass) {
                    cellElement.classList.add(`${directionClass}-start`);
                }
            } else if (index === selectedCells.length - 1) { // Última célula da seleção
                cellElement.classList.add('found-end');
                // Adiciona a classe de direção para a extremidade final
                if (directionClass) {
                    cellElement.classList.add(`${directionClass}-end`);
                }
            }
            // As células intermediárias (não index 0 ou último) só terão 'found-permanent'
        });
    }


    // --- Inicialização Principal do Jogo ---
    function initializeGame() {
        selectRandomWords(); // 1. Seleciona as 10 palavras para este jogo
        createGrid();         // 2. Cria o grid (e o limpa)
        
        // Limpa todas as classes 'found-permanent', 'found-start', 'found-end', e de direção
        // Isso é importante para um novo jogo, caso haja estilos de um jogo anterior
        grid.forEach(row => {
            row.forEach(cell => {
                cell.element.classList.remove(
                    'found-permanent', 'found-start', 'found-end',
                    'horizontal-start', 'horizontal-end',
                    'vertical-start', 'vertical-end',
                    'diagonal-se-start', 'diagonal-se-end',
                    'diagonal-sw-start', 'diagonal-sw-end'
                );
            });
        });

        placeWords();         // 3. Posiciona as palavras selecionadas
        fillEmptyCells();     // 4. Preenche as células vazias com letras aleatórias
        displayWordList();    // 5. Exibe a lista das 10 palavras selecionadas
        foundWords = [];      // 6. Reseta a lista de palavras encontradas para este novo jogo
        clearSelection();     // 7. Garante que nenhuma célula esteja selecionada de um jogo anterior
        
        // Você pode adicionar um botão de "Novo Jogo" no seu HTML e associar initializeGame a ele
        // Exemplo: document.getElementById('new-game-button').addEventListener('click', initializeGame);
    }

    initializeGame(); // Chama a função de inicialização para começar o primeiro jogo

    // --- Adiciona Event Listeners para Interação ---
    // Event listeners para mouse (desktop)
    gridContainer.addEventListener('mousedown', handleSelectionStart);
    gridContainer.addEventListener('mouseover', handleSelectionMove);
    gridContainer.addEventListener('mouseup', handleSelectionEnd);
    // Event listeners para toque (mobile)
    gridContainer.addEventListener('touchstart', handleSelectionStart, { passive: false });
    gridContainer.addEventListener('touchmove', handleSelectionMove, { passive: false });
    gridContainer.addEventListener('touchend', handleSelectionEnd);
});