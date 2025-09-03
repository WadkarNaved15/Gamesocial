let score = 0;
const box = document.getElementById('gameBox');
const scoreDisplay = document.getElementById('score');

function moveBox() {
  const x = Math.random() * (window.innerWidth - 60);
  const y = Math.random() * (window.innerHeight - 60);
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
}

box.addEventListener('click', () => {
  score++;
  scoreDisplay.textContent = score;
  moveBox();
});

moveBox();
