// Chess Game Implementation
class ChessGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameOver = false;
        this.capturedPieces = { white: [], black: [] };
        this.scores = { white: 0, black: 0 };
        this.moveHistory = [];
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        // Piece values for scoring
        this.pieceValues = {
            'pawn': 1,
            'knight': 3,
            'bishop': 3,
            'rook': 5,
            'queen': 9,
            'king': 0
        };
        
        // Unicode chess pieces
        this.pieces = {
            white: {
                king: '♔',
                queen: '♕',
                rook: '♖',
                bishop: '♗',
                knight: '♘',
                pawn: '♙'
            },
            black: {
                king: '♚',
                queen: '♛',
                rook: '♜',
                bishop: '♝',
                knight: '♞',
                pawn: '♟'
            }
        };
        
        // Bot configuration
        this.opponent = 'bot';
        this.botDifficulty = 'medium';
        this.botThinking = false;
        
        this.initializeBoard();
        this.setupEventListeners();
        this.renderBoard();
        this.updateUI();
        
        // Set initial difficulty
        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            this.botDifficulty = difficultySelect.value;
        }
    }
    
    initializeBoard() {
        // Initialize empty 8x8 board
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place pieces in starting positions
        const startingPosition = [
            ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
            ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'],
            ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
        ];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (startingPosition[row][col]) {
                    const color = row < 2 ? 'black' : 'white';
                    this.board[row][col] = {
                        type: startingPosition[row][col],
                        color: color,
                        hasMoved: false
                    };
                }
            }
        }
    }
    
    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = 'square';
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Alternate colors
                if ((row + col) % 2 === 0) {
                    square.classList.add('light');
                } else {
                    square.classList.add('dark');
                }
                
                // Add piece if present
                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = 'piece';
                    pieceElement.textContent = this.pieces[piece.color][piece.type];
                    square.appendChild(pieceElement);
                }
                
                boardElement.appendChild(square);
            }
        }
    }
    
    setupEventListeners() {
        document.getElementById('chess-board').addEventListener('click', (e) => {
            if (this.gameOver || this.botThinking) return;
            
            const square = e.target.closest('.square');
            if (!square) return;
            
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            this.handleSquareClick(row, col);
        });
        
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.resetGame();
        });
        
        // Difficulty selector
        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                this.botDifficulty = e.target.value;
            });
        }
        
        // Pawn promotion modal
        document.querySelectorAll('.promotion-piece').forEach(button => {
            button.addEventListener('click', (e) => {
                const pieceType = e.target.dataset.piece;
                this.handlePawnPromotion(pieceType);
            });
        });
    }
    
    handleSquareClick(row, col) {
        const piece = this.board[row][col];
        
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            
            // If clicking the same square, deselect
            if (selectedRow === row && selectedCol === col) {
                this.clearSelection();
                return;
            }
            
            // Try to make a move
            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.clearSelection();
                
                // Check for game end conditions
                if (this.isInCheck(this.currentPlayer)) {
                    if (this.isCheckmate(this.currentPlayer)) {
                        this.endGame(`${this.currentPlayer === 'white' ? 'Black' : 'White'} wins by checkmate!`);
                        return;
                    } else {
                        this.showMessage(`${this.currentPlayer} is in check!`, 'check');
                    }
                } else if (this.isStalemate(this.currentPlayer)) {
                    this.endGame('Game ends in stalemate!');
                    return;
                } else {
                    this.clearMessage();
                }
                
                this.switchPlayer();
            } else {
                // Invalid move, select new piece if it belongs to current player
                if (piece && piece.color === this.currentPlayer) {
                    this.selectSquare(row, col);
                } else {
                    this.clearSelection();
                }
            }
        } else {
            // Select piece if it belongs to current player
            if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(row, col);
            }
        }
    }
    
    selectSquare(row, col) {
        this.selectedSquare = [row, col];
        this.highlightValidMoves(row, col);
        this.renderBoard();
        this.updateSquareHighlights();
    }
    
    clearSelection() {
        this.selectedSquare = null;
        this.renderBoard();
    }
    
    updateSquareHighlights() {
        // Clear all highlights
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'capture-move');
        });
        
        if (this.selectedSquare) {
            const [row, col] = this.selectedSquare;
            const selectedElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            selectedElement.classList.add('selected');
            
            // Highlight valid moves
            const validMoves = this.getValidMoves(row, col);
            validMoves.forEach(([moveRow, moveCol]) => {
                const moveElement = document.querySelector(`[data-row="${moveRow}"][data-col="${moveCol}"]`);
                if (this.board[moveRow][moveCol]) {
                    moveElement.classList.add('capture-move');
                } else {
                    moveElement.classList.add('valid-move');
                }
            });
        }
    }
    
    highlightValidMoves(row, col) {
        // This method is called to prepare valid moves for highlighting
        // The actual highlighting is done in updateSquareHighlights
    }
    
    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.color !== this.currentPlayer) return false;
        
        // Check if move is within board bounds
        if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
        
        // Check if destination has own piece
        const targetPiece = this.board[toRow][toCol];
        if (targetPiece && targetPiece.color === piece.color) return false;
        
        // Check piece-specific movement rules
        if (!this.isPieceMovementValid(piece.type, fromRow, fromCol, toRow, toCol)) return false;
        
        // Check if move would leave king in check
        if (this.wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol)) return false;
        
        return true;
    }
    
    isPieceMovementValid(pieceType, fromRow, fromCol, toRow, toCol) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);
        
        switch (pieceType) {
            case 'pawn':
                return this.isPawnMoveValid(fromRow, fromCol, toRow, toCol);
            case 'rook':
                return this.isRookMoveValid(fromRow, fromCol, toRow, toCol);
            case 'knight':
                return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
            case 'bishop':
                return this.isBishopMoveValid(fromRow, fromCol, toRow, toCol);
            case 'queen':
                return this.isRookMoveValid(fromRow, fromCol, toRow, toCol) || 
                       this.isBishopMoveValid(fromRow, fromCol, toRow, toCol);
            case 'king':
                return this.isKingMoveValid(fromRow, fromCol, toRow, toCol);
            default:
                return false;
        }
    }
    
    isPawnMoveValid(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
        
        // Forward move
        if (colDiff === 0) {
            if (rowDiff === direction && !this.board[toRow][toCol]) {
                return true;
            }
            // Two squares from starting position
            if (fromRow === startRow && rowDiff === 2 * direction && !this.board[toRow][toCol]) {
                return true;
            }
        }
        
        // Diagonal capture
        if (colDiff === 1 && rowDiff === direction) {
            const targetPiece = this.board[toRow][toCol];
            if (targetPiece && targetPiece.color !== piece.color) {
                return true;
            }
            // En passant
            if (this.enPassantTarget && 
                this.enPassantTarget.row === toRow && 
                this.enPassantTarget.col === toCol) {
                return true;
            }
        }
        
        return false;
    }
    
    isRookMoveValid(fromRow, fromCol, toRow, toCol) {
        // Must move in straight line
        if (fromRow !== toRow && fromCol !== toCol) return false;
        
        // Check path is clear
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }
    
    isBishopMoveValid(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        // Must move diagonally
        if (rowDiff !== colDiff) return false;
        
        // Check path is clear
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }
    
    isKingMoveValid(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        // Normal king move (one square in any direction)
        if (rowDiff <= 1 && colDiff <= 1) {
            return true;
        }
        
        // Castling
        if (rowDiff === 0 && colDiff === 2) {
            return this.canCastle(fromRow, fromCol, toRow, toCol);
        }
        
        return false;
    }
    
    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol]) {
                return false;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return true;
    }
    
    canCastle(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (piece.hasMoved) return false;
        
        const isKingside = toCol > fromCol;
        const rookCol = isKingside ? 7 : 0;
        const rook = this.board[fromRow][rookCol];
        
        // Check rook exists and hasn't moved
        if (!rook || rook.type !== 'rook' || rook.hasMoved) return false;
        
        // Check castling rights
        const side = isKingside ? 'kingside' : 'queenside';
        if (!this.castlingRights[piece.color][side]) return false;
        
        // Check path is clear
        const startCol = Math.min(fromCol, rookCol);
        const endCol = Math.max(fromCol, rookCol);
        for (let col = startCol + 1; col < endCol; col++) {
            if (this.board[fromRow][col]) return false;
        }
        
        // Check king is not in check and doesn't pass through check
        if (this.isInCheck(piece.color)) return false;
        
        const step = isKingside ? 1 : -1;
        for (let i = 1; i <= 2; i++) {
            const testCol = fromCol + (i * step);
            if (this.wouldBeInCheck(piece.color, fromRow, testCol)) return false;
        }
        
        return true;
    }
    
    getValidMoves(row, col) {
        const validMoves = [];
        const piece = this.board[row][col];
        if (!piece) return validMoves;
        
        for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
                if (this.isValidMove(row, col, toRow, toCol)) {
                    validMoves.push([toRow, toCol]);
                }
            }
        }
        
        return validMoves;
    }
    
    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        // Handle special moves
        this.handleSpecialMoves(fromRow, fromCol, toRow, toCol);
        
        // Capture piece if present
        if (capturedPiece) {
            this.capturePiece(capturedPiece);
        }
        
        // Move piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        piece.hasMoved = true;
        
        // Update castling rights
        this.updateCastlingRights(piece, fromRow, fromCol);
        
        // Record move
        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece.type,
            captured: capturedPiece,
            enPassantTarget: this.enPassantTarget
        });
        
        // Update en passant target
        this.updateEnPassantTarget(piece, fromRow, fromCol, toRow, toCol);
        
        // Check for pawn promotion
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.showPromotionModal(toRow, toCol);
        }
        
        this.renderBoard();
        this.updateUI();
    }
    
    handleSpecialMoves(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        
        // Castling
        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            const isKingside = toCol > fromCol;
            const rookFromCol = isKingside ? 7 : 0;
            const rookToCol = isKingside ? 5 : 3;
            const rook = this.board[fromRow][rookFromCol];
            
            this.board[fromRow][rookToCol] = rook;
            this.board[fromRow][rookFromCol] = null;
            rook.hasMoved = true;
        }
        
        // En passant
        if (piece.type === 'pawn' && this.enPassantTarget && 
            toRow === this.enPassantTarget.row && toCol === this.enPassantTarget.col) {
            const capturedPawnRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            const capturedPawn = this.board[capturedPawnRow][toCol];
            this.capturePiece(capturedPawn);
            this.board[capturedPawnRow][toCol] = null;
        }
    }
    
    updateEnPassantTarget(piece, fromRow, fromCol, toRow, toCol) {
        this.enPassantTarget = null;
        
        // Set en passant target for pawn double move
        if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = {
                row: (fromRow + toRow) / 2,
                col: toCol
            };
        }
    }
    
    updateCastlingRights(piece, fromRow, fromCol) {
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        } else if (piece.type === 'rook') {
            if (fromCol === 0) {
                this.castlingRights[piece.color].queenside = false;
            } else if (fromCol === 7) {
                this.castlingRights[piece.color].kingside = false;
            }
        }
    }
    
    capturePiece(piece) {
        this.capturedPieces[piece.color === 'white' ? 'black' : 'white'].push(piece);
        this.scores[piece.color === 'white' ? 'black' : 'white'] += this.pieceValues[piece.type];
    }
    
    showPromotionModal(row, col) {
        const modal = document.getElementById('promotion-modal');
        modal.classList.remove('hidden');
        modal.dataset.row = row;
        modal.dataset.col = col;
    }
    
    handlePawnPromotion(pieceType) {
        const modal = document.getElementById('promotion-modal');
        const row = parseInt(modal.dataset.row);
        const col = parseInt(modal.dataset.col);
        
        this.board[row][col].type = pieceType;
        modal.classList.add('hidden');
        
        this.renderBoard();
        this.updateUI();
        
        // After promotion, switch player
        this.switchPlayer();
    }
    
    isInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;
        
        return this.isSquareAttacked(kingPosition[0], kingPosition[1], color === 'white' ? 'black' : 'white');
    }
    
    wouldBeInCheck(color, kingRow, kingCol) {
        // Temporarily place king at new position
        const originalPiece = this.board[kingRow][kingCol];
        this.board[kingRow][kingCol] = { type: 'king', color: color };
        
        const inCheck = this.isSquareAttacked(kingRow, kingCol, color === 'white' ? 'black' : 'white');
        
        // Restore original state
        this.board[kingRow][kingCol] = originalPiece;
        
        return inCheck;
    }
    
    wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol) {
        // Make temporary move
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        const inCheck = this.isInCheck(piece.color);
        
        // Restore board
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = capturedPiece;
        
        return inCheck;
    }
    
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return [row, col];
                }
            }
        }
        return null;
    }
    
    isSquareAttacked(row, col, byColor) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === byColor) {
                    if (this.isPieceMovementValid(piece.type, fromRow, fromCol, row, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        
        // Check if any move can get out of check
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    const validMoves = this.getValidMoves(fromRow, fromCol);
                    if (validMoves.length > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        
        // Check if any legal move exists
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    const validMoves = this.getValidMoves(fromRow, fromCol);
                    if (validMoves.length > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.updateUI();
        
        // If it's bot's turn and opponent is bot, make bot move
        if (this.currentPlayer === 'black' && this.opponent === 'bot' && !this.gameOver) {
            this.botThinking = true;
            document.getElementById('current-player').innerHTML = 
                `Bot's Turn <span class="bot-indicator"></span>`;
                
            // Add delay for bot thinking effect
            setTimeout(() => {
                this.makeBotMove();
            }, this.botDifficulty === 'easy' ? 500 : this.botDifficulty === 'medium' ? 1000 : 1500);
        }
    }
    
    updateUI() {
        // Update current player display
        document.getElementById('current-player').textContent = 
            `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s Turn`;
        
        // Update captured pieces
        this.updateCapturedPieces();
        
        // Update scores
        document.getElementById('white-score').textContent = this.scores.white;
        document.getElementById('black-score').textContent = this.scores.black;
    }
    
    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('white-captured');
        const blackCaptured = document.getElementById('black-captured');
        
        whiteCaptured.innerHTML = '';
        blackCaptured.innerHTML = '';
        
        this.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieces.white[piece.type];
            whiteCaptured.appendChild(pieceElement);
        });
        
        this.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieces.black[piece.type];
            blackCaptured.appendChild(pieceElement);
        });
    }
    
    showMessage(message, type = 'info') {
        const messageElement = document.getElementById('game-message');
        messageElement.textContent = message;
        messageElement.className = type;
    }
    
    clearMessage() {
        const messageElement = document.getElementById('game-message');
        messageElement.textContent = '';
        messageElement.className = '';
    }
    
    endGame(message) {
        this.gameOver = true;
        this.botThinking = false;
        this.showMessage(message, 'checkmate');
        this.clearSelection();
        
        // Update current player display
        document.getElementById('current-player').textContent = 'Game Over';
    }
    
    resetGame() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameOver = false;
        this.botThinking = false;
        this.capturedPieces = { white: [], black: [] };
        this.scores = { white: 0, black: 0 };
        this.moveHistory = [];
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        // Get current difficulty
        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            this.botDifficulty = difficultySelect.value;
        }
        
        this.initializeBoard();
        this.renderBoard();
        this.updateUI();
        this.clearMessage();
        
        // Hide promotion modal if visible
        document.getElementById('promotion-modal').classList.add('hidden');
    }
    
    // Bot implementation
    makeBotMove() {
        if (this.gameOver || this.currentPlayer !== 'black') {
            this.botThinking = false;
            return;
        }
        
        const validMoves = this.getAllValidMoves('black');
        if (validMoves.length === 0) {
            this.botThinking = false;
            return;
        }
        
        let bestMove;
        
        // Bot difficulty logic
        switch (this.botDifficulty) {
            case 'easy':
                bestMove = this.getRandomMove(validMoves);
                break;
            case 'medium':
                bestMove = this.getMediumMove(validMoves);
                break;
            case 'hard':
                bestMove = this.getHardMove(validMoves);
                break;
            default:
                bestMove = this.getRandomMove(validMoves);
        }
        
        if (bestMove) {
            const { from, to } = bestMove;
            this.makeMove(from[0], from[1], to[0], to[1]);
            
            // Check for pawn promotion (always promote to queen for bot)
            const piece = this.board[to[0]][to[1]];
            if (piece && piece.type === 'pawn' && (to[0] === 0 || to[0] === 7)) {
                piece.type = 'queen';
                this.renderBoard();
            }
            
            // Check for game end conditions
            if (this.isInCheck(this.currentPlayer)) {
                if (this.isCheckmate(this.currentPlayer)) {
                    this.endGame(`Bot wins by checkmate!`);
                    this.botThinking = false;
                    return;
                } else {
                    this.showMessage("White is in check!", 'check');
                }
            } else if (this.isStalemate(this.currentPlayer)) {
                this.endGame('Game ends in stalemate!');
                this.botThinking = false;
                return;
            } else {
                this.clearMessage();
            }
            
            this.switchPlayer();
        }
        
        this.botThinking = false;
    }
    
    getAllValidMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const validMoves = this.getValidMoves(row, col);
                    for (const [toRow, toCol] of validMoves) {
                        moves.push({ from: [row, col], to: [toRow, toCol] });
                    }
                }
            }
        }
        return moves;
    }
    
    getRandomMove(moves) {
        // Easy: Random move with slight preference for captures
        const captures = moves.filter(move => {
            const [toRow, toCol] = move.to;
            return this.board[toRow][toCol] !== null;
        });
        
        if (captures.length > 0 && Math.random() > 0.3) {
            return captures[Math.floor(Math.random() * captures.length)];
        }
        
        return moves[Math.floor(Math.random() * moves.length)];
    }
    
    getMediumMove(moves) {
        // Medium: Prefer captures and checks, with some randomness
        const captures = [];
        const checks = [];
        const others = [];
        
        for (const move of moves) {
            const [toRow, toCol] = move.to;
            const capturedPiece = this.board[toRow][toCol];
            
            // Check if capture
            if (capturedPiece) {
                captures.push(move);
                continue;
            }
            
            // Check if check
            const fromRow = move.from[0];
            const fromCol = move.from[1];
            const piece = this.board[fromRow][fromCol];
            
            // Simulate move to check for check
            const originalPiece = this.board[toRow][toCol];
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;
            
            if (this.isInCheck('white')) {
                checks.push(move);
            }
            
            // Restore board
            this.board[fromRow][fromCol] = piece;
            this.board[toRow][toCol] = originalPiece;
        }
        
        // Prioritize captures, then checks, then random
        if (captures.length > 0 && Math.random() > 0.2) {
            // Sort captures by value (highest value captured first)
            captures.sort((a, b) => {
                const capA = this.board[a.to[0]][a.to[1]];
                const capB = this.board[b.to[0]][b.to[1]];
                return this.pieceValues[capB.type] - this.pieceValues[capA.type];
            });
            return captures[0];
        }
        
        if (checks.length > 0 && Math.random() > 0.4) {
            return checks[Math.floor(Math.random() * checks.length)];
        }
        
        return moves[Math.floor(Math.random() * moves.length)];
    }
    
    getHardMove(moves) {
        // Hard: Prefer high-value captures and checks
        const captures = [];
        const checks = [];
        const others = [];
        
        for (const move of moves) {
            const [toRow, toCol] = move.to;
            const capturedPiece = this.board[toRow][toCol];
            
            // Check if capture
            if (capturedPiece) {
                captures.push(move);
                continue;
            }
            
            // Check if check
            const fromRow = move.from[0];
            const fromCol = move.from[1];
            const piece = this.board[fromRow][fromCol];
            
            // Simulate move to check for check
            const originalPiece = this.board[toRow][toCol];
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;
            
            if (this.isInCheck('white')) {
                checks.push(move);
            }
            
            // Restore board
            this.board[fromRow][fromCol] = piece;
            this.board[toRow][toCol] = originalPiece;
        }
        
        // Prioritize high-value captures
        if (captures.length > 0) {
            // Sort captures by value (highest value captured first)
            captures.sort((a, b) => {
                const capA = this.board[a.to[0]][a.to[1]];
                const capB = this.board[b.to[0]][b.to[1]];
                return this.pieceValues[capB.type] - this.pieceValues[capA.type];
            });
            return captures[0];
        }
        
        // Then checks
        if (checks.length > 0) {
            return checks[0];
        }
        
        // Finally random move
        return moves[Math.floor(Math.random() * moves.length)];
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
