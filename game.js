const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const scoreOutput = document.querySelector("#score");
const bestOutput = document.querySelector("#best");
const levelOutput = document.querySelector("#level");
const goalOutput = document.querySelector("#goal");
const statusText = document.querySelector("#status");
const message = document.querySelector("#board-message");
const messageTitle = document.querySelector("#message-title");
const messageCopy = document.querySelector("#message-copy");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");

const cellSize = 20;
const cellCount = canvas.width / cellSize;
const speedByLevel = [185, 135, 95];
const levelGoals = [100, 300, 500];
const directions = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

let snake;
let direction;
let queuedDirection;
let food;
let score;
let level = 1;
let best = readBest();
let state = "ready";
let lastFrame = 0;
let elapsed = 0;

function readBest() {
  try {
    return Number(localStorage.getItem("snake-best-score")) || 0;
  } catch {
    return 0;
  }
}

function setScore(value) {
  const increased = Number.isFinite(score) && value > score;
  score = value;
  scoreOutput.value = String(score).padStart(3, "0");
  if (increased && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scoreOutput.animate(
      [
        { transform: "scale(1)", color: "#1978c9" },
        { transform: "scale(1.2)", color: "#eb5365", offset: 0.55 },
        { transform: "scale(1)", color: "#1978c9" },
      ],
      { duration: 260, easing: "ease-out" },
    );
  }
}

function updateBest() {
  if (score <= best) return;
  best = score;
  bestOutput.value = String(best).padStart(3, "0");
  try {
    localStorage.setItem("snake-best-score", String(best));
  } catch {
    // The current run still works when browser storage is unavailable.
  }
}

function resetGame() {
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  direction = directions.right;
  queuedDirection = direction;
  setScore(0);
  level = 1;
  levelOutput.value = String(level);
  goalOutput.value = String(levelGoals[0]);
  food = placeFood();
  elapsed = 0;
  state = "ready";
  pauseButton.textContent = "Pause";
  pauseButton.setAttribute("aria-pressed", "false");
  showMessage("Ready?", "Catch the fruit. The walls wrap around, but your tail doesn't!", "Start game");
  statusText.textContent = "Level 1 target: 100 points.";
  draw();
}

function placeFood() {
  const emptyCells = [];
  for (let y = 0; y < cellCount; y += 1) {
    for (let x = 0; x < cellCount; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        emptyCells.push({ x, y });
      }
    }
  }
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function showMessage(title, copy, buttonText) {
  messageTitle.textContent = title;
  messageTitle.classList.toggle("is-winner", title === "You win!");
  messageCopy.textContent = copy;
  startButton.textContent = buttonText;
  message.hidden = false;
}

function startGame() {
  if (state === "over") resetGame();
  state = "playing";
  message.hidden = true;
  pauseButton.textContent = "Pause";
  pauseButton.setAttribute("aria-pressed", "false");
  statusText.textContent = "Run in progress.";
}

function togglePause() {
  if (state === "playing") {
    state = "paused";
    showMessage("Paused", "Take a breath. Your run is waiting.", "Resume");
    pauseButton.textContent = "Resume";
    pauseButton.setAttribute("aria-pressed", "true");
    statusText.textContent = "Game paused.";
  } else if (state === "paused") {
    startGame();
  }
}

function turn(next) {
  if (state !== "playing" && state !== "ready") return;
  if (queuedDirection !== direction) return;
  if (next.x === -direction.x && next.y === -direction.y) return;
  queuedDirection = next;
  if (state === "ready") startGame();
}

function finishGame() {
  state = "over";
  updateBest();
  showMessage("Game over", `Final score: ${score}. Ready for another run?`, "Play again");
  pauseButton.textContent = "Pause";
  pauseButton.setAttribute("aria-pressed", "false");
  statusText.textContent = "Run ended. Press Enter or play again.";
}

function step() {
  direction = queuedDirection;
  const head = {
    x: (snake[0].x + direction.x + cellCount) % cellCount,
    y: (snake[0].y + direction.y + cellCount) % cellCount,
  };
  const eatsFood = head.x === food.x && head.y === food.y;
  const bodyToCheck = eatsFood ? snake : snake.slice(0, -1);
  const hitsSelf = bodyToCheck.some((segment) => segment.x === head.x && segment.y === head.y);

  if (hitsSelf) {
    finishGame();
    return;
  }

  snake.unshift(head);
  if (eatsFood) {
    setScore(score + 10);
    updateBest();
    const nextLevel = score >= levelGoals[1] ? 3 : score >= levelGoals[0] ? 2 : 1;
    if (score >= levelGoals[2]) {
      level = 3;
      levelOutput.value = String(level);
      goalOutput.value = "WIN";
      state = "over";
      showMessage("You win!", "500 points. You cleared all three levels!", "Play again");
      statusText.textContent = "Winner! All three levels completed.";
      pauseButton.textContent = "Pause";
      pauseButton.setAttribute("aria-pressed", "false");
    } else if (nextLevel > level) {
      const completedLevel = level;
      level = nextLevel;
      levelOutput.value = String(level);
      goalOutput.value = String(levelGoals[level - 1]);
      state = "levelComplete";
      showMessage(
        `Congratulations!`,
        `Level ${completedLevel} completed! Please continue to Level ${level}.`,
        `Continue to Level ${level}`,
      );
      statusText.textContent = `Level ${completedLevel} complete. Continue when you're ready.`;
    } else {
      statusText.textContent = `${levelGoals[level - 1] - score} points to finish Level ${level}.`;
    }
    food = placeFood();
    if (!food) {
      state = "over";
      showMessage("Board cleared", `Perfect run: ${score} points.`, "Play again");
    }
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  context.fillStyle = "#f4faff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(18, 59, 93, .09)";
  context.lineWidth = 1;
  for (let line = 1; line < cellCount; line += 1) {
    const position = line * cellSize + 0.5;
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, canvas.height);
    context.stroke();
    context.beginPath();
    context.moveTo(0, position);
    context.lineTo(canvas.width, position);
    context.stroke();
  }

  if (food) drawFood();
  snake.forEach((segment, index) => drawSegment(segment, index === 0));
}

function drawFood() {
  const centerX = food.x * cellSize + cellSize / 2;
  const centerY = food.y * cellSize + cellSize / 2;
  context.fillStyle = "#eb5365";
  context.beginPath();
  context.arc(centerX, centerY + 1, 7, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#123b5d";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(centerX, centerY - 6);
  context.lineTo(centerX + 3, centerY - 10);
  context.stroke();
}

function drawSegment(segment, isHead) {
  const inset = isHead ? 2 : 3;
  const x = segment.x * cellSize + inset;
  const y = segment.y * cellSize + inset;
  const size = cellSize - inset * 2;
  context.fillStyle = isHead ? "#123b5d" : "#278be0";
  context.fillRect(x, y, size, size);

  if (!isHead) return;
  context.fillStyle = "#f4faff";
  const eyeOffset = 5;
  if (direction.x !== 0) {
    const eyeX = direction.x > 0 ? x + size - 4 : x + 2;
    context.fillRect(eyeX, y + eyeOffset - 2, 2, 2);
    context.fillRect(eyeX, y + size - eyeOffset, 2, 2);
  } else {
    const eyeY = direction.y > 0 ? y + size - 4 : y + 2;
    context.fillRect(x + eyeOffset - 2, eyeY, 2, 2);
    context.fillRect(x + size - eyeOffset, eyeY, 2, 2);
  }
}

function frame(timestamp) {
  if (state === "playing") {
    elapsed += Math.min(timestamp - lastFrame, 100);
    const speed = speedByLevel[level - 1];
    while (elapsed >= speed && state === "playing") {
      step();
      elapsed -= speed;
    }
  }
  lastFrame = timestamp;
  requestAnimationFrame(frame);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const keyDirections = {
    arrowup: directions.up,
    w: directions.up,
    arrowright: directions.right,
    d: directions.right,
    arrowdown: directions.down,
    s: directions.down,
    arrowleft: directions.left,
    a: directions.left,
  };

  if (keyDirections[key]) {
    event.preventDefault();
    turn(keyDirections[key]);
  } else if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  } else if (event.key === "Enter" && (state === "ready" || state === "over")) {
    startGame();
  }
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => turn(directions[button.dataset.direction]));
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", resetGame);

bestOutput.value = String(best).padStart(3, "0");
resetGame();
requestAnimationFrame(frame);