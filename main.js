let slicedToArray = function () {
  function sliceIterator(arr, i) {
    let n = true; let d = false; let e = undefined;
    try {
      for (let i = arr[Symbol.iterator](), s; !(n = (s = i.next()).done); n = true) {
        arr.push(s.value);
        if (i && arr.length === i) break;
      }
    } catch (err) {
      d = true; e = err;
    }
    finally {
      try {
        if (!n && i["return"]) i["return"]();
      } finally { if (d) throw e; }
    } return arr;
  }
  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Error: invalid attempt");
    }
  };
}();

// Vector
let Vector = function Vector() {
  let x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  let y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  this.x = x;
  this.y = y;
};

Vector.prototype.add = function (v) {
  return new Vector(this.x + v.x, this.y + v.y);
};

Vector.prototype.equals = function (v) {
  return this.x === v.x && this.y === v.y;
};

Vector.prototype.mod = function (max) {
  return new Vector((this.x + max.x) % max.x, (this.y + max.y) % max.y);
};

Vector.prototype.multiplyScalar = function (scalar) {
  return new Vector(this.x * scalar, this.y * scalar);
};

Vector.prototype.multiply = function (v) {
  return new Vector(this.x * v.x, this.y * v.y);
};

Vector.prototype.additiveInverseOf = function (v) {
  let sum = this.add(v);
  if (sum.x === 0 && sum.y === 0) {
    return true;
  }
  return false;
};

Vector.random = function (max, size) {
  return new Vector(Math.floor(Math.random() * (max.x / size.x)) * size.x,
    Math.floor(Math.random() * (max.y / size.y)) * size.y);
};

// Drawing
let canvas = document.getElementById('snake');
let ctx = canvas.getContext('2d');

function drawFood(position) {
  ctx.fillStyle = config.foodColor;
  ctx.fillRect(position.x, position.y, config.cellSize.x, config.cellSize.x);
}

function drawSnake(snake) {
  ctx.fillStyle = config.snakeColor;
  snake.forEach(function (segment) {
    return ctx.fillRect(segment.pos.x, segment.pos.y, config.cellSize.x, config.cellSize.x);
  });
}

function drawScore(score) {
  let scoreValue = document.querySelector('.score-value');
  scoreValue.innerText = score;
}

function drawBoard(fillColor, strokeColor) {
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.fillRect(0, 0, canvas.height, canvas.width);
  ctx.beginPath();

  for (let x = 0.5; x < canvas.width; x += config.cellSize.x) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0.5; y < canvas.height; y += config.cellSize.y) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
  ctx.closePath();
}

function drawInstructions() {
  ctx.fillStyle = '#fafafa';
  ctx.textAlign = 'center';
  ctx.font = '20px Courier Prime';
  ctx.fillText('press any arrow key to start', canvas.width / 2, canvas.height / 1.2);
}

// Game
function init() {
  canvas.setAttribute('tabindex', 1);
  canvas.style.outline = 'none';
  canvas.focus();

  drawBoard(config.boardColor);
  drawInstructions();
}

function update(state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard(config.boardColor);
  drawSnake(state.snake);
  drawFood(state.food);
  drawScore(state.score);
}

let move = R.curry(function (direction, snake) {
  if (direction.additiveInverseOf(snake.dir)) {
    direction = snake.dir;
  }
  return { pos: snake.pos.add(direction.multiplyScalar(20)).mod(config.boardSize), dir: direction };
});

let keyMap = {
  37: move(new Vector(-1, 0)),
  38: move(new Vector(0, -1)),
  39: move(new Vector(1, 0)),
  40: move(new Vector(0, 1))
};

// Config
let config = {
  tickerInterval: 100,
  snakeSpeed: 1,
  cellSize: new Vector(20, 20),
  boardSize: new Vector(canvas.height, canvas.width),
  boardColor: 'black',
  snakeColor: 'blue',
  foodColor: '#f9165d'
};

config.initial = {
  food: Vector.random(config.boardSize, config.cellSize),
  snake: { pos: new Vector(0, 0), dir: new Vector(0, 1) }
};

// Streams

let ticker$ = Rx.Observable.interval(config.tickerInterval, Rx.Scheduler.requestAnimationFrame).map(function () {
  return { time: Date.now(), delta: null };
}).scan(function (previous, current) {
  return {
    time: current.time,
    delta: (current.time - previous.time) / 1000
  };
});

let input$ = Rx.Observable.fromEvent(document, 'keydown').flatMap(function (event) {
  return R.contains(event.keyCode, Object.keys(keyMap).map(function (n) {
    return parseInt(n);
  })) ? [keyMap[event.keyCode]] : [];
});

let snakeHead$ = ticker$.withLatestFrom(input$).scan(function (snake, ref) {
  let ref2 = slicedToArray(ref, 2),
    ticker = ref2[0],
    dir = ref2[1];
  return dir(snake);
}, config.initial.snake);

let food$ = snakeHead$.distinctUntilChanged().scan(function (food, snakeHead) {
  return food.equals(snakeHead.pos) ? Vector.random(config.boardSize, config.cellSize) : food;
}, config.initial.food).distinctUntilChanged().share();

let length$ = food$.scan(function (prevLength, apple) {
  return prevLength + 1;
}, 1);

let score$ = length$.map(function (n) {
  return (n - 2) * 10;
});

let snake$ = snakeHead$.withLatestFrom(length$).scan(function (prevSnake, ref3) {
  let ref4 = slicedToArray(ref3, 2),
    head = ref4[0],
    length = ref4[1];
  let snakeHistory = R.union(prevSnake, [head]);
  let snake = R.takeLast(length - 1, snakeHistory);
  return snake;
}, []);

let game$ = Rx.Observable.combineLatest(food$, score$, snake$, ticker$, function (food, score, snake, ticker) {
  return {
    food: food,
    score: score,
    snake: snake,
    ticker: ticker
  };
});

init();
game$.subscribe(function (state) {
  return update(state);
});