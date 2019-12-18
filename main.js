var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var arr = []; var n = true; var d = false; var e = undefined;
    try {
      for (var i = arr[Symbol.iterator](), s; !(n = (s = i.next()).done); n = true) {
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
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

// Vector

var Vector = function Vector() {
  var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

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
  var sum = this.add(v);
  if (sum.x === 0 && sum.y === 0) {
    return true;
  }
  return false;
};

Vector.random = function (max, size) {
  return new Vector(Math.floor(Math.random() * (max.x / size.x)) * size.x, Math.floor(Math.random() * (max.y / size.y)) * size.y);
};

// Drawing

var canvas = document.getElementById('snake');
var ctx = canvas.getContext('2d');

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
  var scoreValue = document.querySelector('.score-value');
  scoreValue.innerText = score;
}

function drawBoard(fillColor, strokeColor) {
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;

  ctx.fillRect(0, 0, canvas.height, canvas.width);

  ctx.beginPath();
  for (var x = 0.5; x < canvas.width; x += config.cellSize.x) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }

  for (var y = 0.5; y < canvas.height; y += config.cellSize.y) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }

  ctx.stroke();
  ctx.closePath();
}

function drawTitle() {
  ctx.fillStyle = '#fafafa';
  ctx.textAlign = 'center';
  ctx.font = '900 48px titillium web';
  ctx.fillText('snake', canvas.width / 2, canvas.height / 3 - 24);
}

function drawSubTitle() {
  ctx.fillStyle = '#fafafa';
  ctx.textAlign = 'center';
  ctx.font = '16px titillium web';
  ctx.fillText('an adventure in learning reactive js', canvas.width / 2, canvas.height / 3);
}

function drawAuthor() {
  ctx.fillStyle = '#fafafa';
  ctx.textAlign = 'center';
  ctx.font = '16px titillium web';
  ctx.fillText('by fielding johnston', canvas.width / 2, canvas.height / 3 + 24);
}

function drawInstructions() {
  ctx.fillStyle = '#fafafa';
  ctx.textAlign = 'center';
  ctx.font = '16px titillium web';
  ctx.fillText('press any arrow key to start', canvas.width / 2, canvas.height / 1.5);
}

// Game

function init() {
  canvas.setAttribute('tabindex', 1);
  canvas.style.outline = 'none';
  canvas.focus();

  drawBoard(config.boardColor, config.boardLineColor);
  drawTitle();
  drawSubTitle();
  drawAuthor();
  drawInstructions();
}

function update(state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBoard(config.boardColor, config.boardLineColor);
  drawSnake(state.snake);
  drawFood(state.food);
  drawScore(state.score);
}

var move = R.curry(function (direction, snake) {
  if (direction.additiveInverseOf(snake.dir)) {
    direction = snake.dir;
  }
  return { pos: snake.pos.add(direction.multiplyScalar(20)).mod(config.boardSize), dir: direction };
});

var keyMap = {
  37: move(new Vector(-1, 0)),
  38: move(new Vector(0, -1)),
  39: move(new Vector(1, 0)),
  40: move(new Vector(0, 1))

  // Config

}; var config = {
  tickerInterval: 50,
  snakeSpeed: 1,
  cellSize: new Vector(20, 20),
  boardSize: new Vector(canvas.height, canvas.width),
  boardColor: '#1b1b1b',
  boardLineColor: '#222222',
  snakeColor: '#ffffff',
  foodColor: '#f9165d'
};

config.initial = {
  food: Vector.random(config.boardSize, config.cellSize),
  snake: { pos: new Vector(0, 0), dir: new Vector(0, 1) }

  // Streams

}; var ticker$ = Rx.Observable.interval(config.tickerInterval, Rx.Scheduler.requestAnimationFrame).map(function () {
  return { time: Date.now(), delta: null };
}).scan(function (previous, current) {
  return {
    time: current.time,
    delta: (current.time - previous.time) / 1000
  };
});

var input$ = Rx.Observable.fromEvent(document, 'keydown').flatMap(function (event) {
  return R.contains(event.keyCode, Object.keys(keyMap).map(function (n) {
    return parseInt(n);
  })) ? [keyMap[event.keyCode]] : [];
});

var snakeHead$ = ticker$.withLatestFrom(input$).scan(function (snake, ref) {
  var ref2 = slicedToArray(ref, 2),
    ticker = ref2[0],
    dir = ref2[1];

  return dir(snake);
}, config.initial.snake);

var food$ = snakeHead$.distinctUntilChanged().scan(function (food, snakeHead) {
  return food.equals(snakeHead.pos) ? Vector.random(config.boardSize, config.cellSize) : food;
}, config.initial.food).distinctUntilChanged().share();

var length$ = food$.scan(function (prevLength, apple) {
  return prevLength + 1;
}, 1);

var score$ = length$.map(function (n) {
  return (n - 2) * 10;
});

var snake$ = snakeHead$.withLatestFrom(length$).scan(function (prevSnake, ref3) {
  var ref4 = slicedToArray(ref3, 2),
    head = ref4[0],
    length = ref4[1];

  var snakeHistory = R.union(prevSnake, [head]);
  var snake = R.takeLast(length - 1, snakeHistory);
  return snake;
}, []);

var game$ = Rx.Observable.combineLatest(food$, score$, snake$, ticker$, function (food, score, snake, ticker) {
  return {
    food: food,
    score: score,
    snake: snake,
    ticker: ticker
  };
});

// Do it to it

init();
game$.subscribe(function (state) {
  return update(state);
});