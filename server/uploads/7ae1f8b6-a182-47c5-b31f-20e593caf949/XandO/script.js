const game = document.getElementById('game');
const statusText = document.getElementById('status');
let currentPlayer = 'X';
let board = Array(9).fill(null);
let gameOver = false;

// Create the grid
function createBoard() {
  game.innerHTML = '';
  board.forEach((cell, index) => {
    const div = document.createElement('div');
    div.classList.add('cell');
    div.dataset.index = index;
    div.textContent = cell;
    div.addEventListener('click', handleMove);
    game.appendChild(div);
  });
}

// Handle player move
function handleMove(e) {
  const index = e.target.dataset.index;

  if (board[index] || gameOver) return;

  board[index] = currentPlayer;
  e.target.textContent = currentPlayer;

  if (checkWinner(currentPlayer)) {
    statusText.textContent = `${currentPlayer} wins! 🎉`;
    gameOver = true;
    return;
  }

  if (!board.includes(null)) {
    statusText.textContent = "It's a draw!";
    gameOver = true;
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  statusText.textContent = `${currentPlayer}'s turn`;
}

// Check for winner
function checkWinner(player) {
  const winPatterns = [
    [0,1,2], [3,4,5], [6,7,8], // Rows
    [0,3,6], [1,4,7], [2,5,8], // Columns
    [0,4,8], [2,4,6]           // Diagonals
  ];

  return winPatterns.some(pattern =>
    pattern.every(i => board[i] === player)
  );
}

// Restart game
function restartGame() {
  board = Array(9).fill(null);
  currentPlayer = 'X';
  gameOver = false;
  statusText.textContent = `${currentPlayer}'s turn`;
  createBoard();
}

// Start the game
restartGame();
