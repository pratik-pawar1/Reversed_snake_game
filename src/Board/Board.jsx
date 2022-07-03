import React, { useEffect, useState } from "react";
import {
  randomIntFromInterval,
  reverseLinkedList,
  useInterval,
} from "../lib/utils.js";

import "./Board.css";

class LinkedListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor(value) {
    const node = new LinkedListNode(value);
    this.head = node;
    this.tail = node;
  }
}

const Speeds = {
  SuperSoinc: 30,
  Rapid: 80,
  Lazy: 140,
};

const Direction = {
  UP: "UP",
  RIGHT: "RIGHT",
  DOWN: "DOWN",
  LEFT: "LEFT",
};

const BOARD_HEIGHT = 13;
const BOARD_WIDTH = 25;
const PROBABILITY_OF_DIRECTION_REVERSAL_FOOD = 0.3;

const getStartingSnakeLLValue = (board) => {
  const rowSize = board.length;
  const colSize = board[0].length;
  const startingRow = Math.round(rowSize / 3);
  const startingCol = Math.round(colSize / 3);
  const startingCell = board[startingRow][startingCol];
  return {
    row: startingRow,
    col: startingCol,
    cell: startingCell,
  };
};

const Board = () => {
  const [hit, setHit] = useState(false);
  const [hitCells, setHitCells] = useState([]);
  const [move, setMove] = useState(false);
  const [info, setInfo] = useState(false);
  const [speed, setSpeed] = useState(Speeds.Rapid);
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(createBoard(BOARD_HEIGHT, BOARD_WIDTH));
  const [snake, setSnake] = useState(
    new LinkedList(getStartingSnakeLLValue(board))
  );
  const [snakeCells, setSnakeCells] = useState(
    new Set([snake.head.value.cell])
  );
  // Naively set the starting food cell 5 cells away from the starting snake cell.

  const [foodCell, setFoodCell] = useState(snake.head.value.cell + 5);
  const [direction, setDirection] = useState(Direction.RIGHT);
  const [foodShouldReverseDirection, setFoodShouldReverseDirection] =
    useState(false);

  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      handleKeydown(e);
      if (getDirectionFromKey(e.key) === "ENTER" && !move) {
        setMove(true);
      }
    });
  });

  useInterval(() => {
    if (move && !info) {
      moveSnake();
    }
  }, speed);

  const handleKeydown = (e) => {
    const newDirection = getDirectionFromKey(e.key);
    if (newDirection === "ENTER") return;
    const isValidDirection = newDirection !== "";
    if (!isValidDirection) return;
    setDirection(newDirection);
  };

  const moveSnake = () => {
    const currentHeadCoords = {
      row: snake.head.value.row,
      col: snake.head.value.col,
    };

    let nextHeadCoords = getCoordsInDirection(currentHeadCoords, direction);

    if (isOutOfBounds(nextHeadCoords, board)) {
      handleGameOver();
      return;
    }
    //Logic For not allowing to go in opposoite direction and instantly eating yourself
    let nextHeadCell = board[nextHeadCoords.row][nextHeadCoords.col];
    const snakeArray = Array.from(snakeCells);

    try {
      if (snake.tail.value.cell === nextHeadCell && snakeArray.length > 2) {
        handleGameOver();
        return;
      } else if (
        snakeArray.length > 1 &&
        (snakeArray[snakeArray.length - 2] === nextHeadCell ||
          snakeArray[snakeArray.length - 3] === nextHeadCell ||
          snakeArray[0] === nextHeadCell)
      ) {
        setDirection(getOppositeDirection(direction));
        nextHeadCoords = getCoordsInDirection(
          currentHeadCoords,
          getOppositeDirection(direction)
        );
        nextHeadCell = board[nextHeadCoords.row][nextHeadCoords.col];
      } else if (snakeCells.has(nextHeadCell)) {
        handleGameOver();
        return;
      }
    } catch (error) {}

    const newHead = new LinkedListNode({
      row: nextHeadCoords.row,
      col: nextHeadCoords.col,
      cell: nextHeadCell,
    });
    const currentHead = snake.head;
    snake.head = newHead;
    currentHead.next = newHead;

    const newSnakeCells = new Set(snakeCells);
    newSnakeCells.delete(snake.tail.value.cell);
    newSnakeCells.add(nextHeadCell);

    snake.tail = snake.tail.next;
    if (snake.tail === null) snake.tail = snake.head;

    const foodConsumed = nextHeadCell === foodCell;
    if (foodConsumed) {
      // This function mutates newSnakeCells.
      growSnake(newSnakeCells);
      if (foodShouldReverseDirection) reverseSnake();
      HandleFoodConsumption(newSnakeCells);
    }

    setSnakeCells(newSnakeCells);
  };

  // This function mutates newSnakeCells.
  const growSnake = (newSnakeCells) => {
    const growthNodeCoords = getGrowthNodeCoords(snake.tail, direction);
    if (isOutOfBounds(growthNodeCoords, board)) {
      // Snake is positioned such that it can't grow; don't do anything.
      return;
    }
    const newTailCell = board[growthNodeCoords.row][growthNodeCoords.col];
    const newTail = new LinkedListNode({
      row: growthNodeCoords.row,
      col: growthNodeCoords.col,
      cell: newTailCell,
    });
    const currentTail = snake.tail;
    snake.tail = newTail;
    snake.tail.next = currentTail;

    newSnakeCells.add(newTailCell);
  };

  const reverseSnake = () => {
    const tailNextNodeDirection = getNextNodeDirection(snake.tail, direction);
    const newDirection = getOppositeDirection(tailNextNodeDirection);
    setDirection(newDirection);

    // The tail of the snake is really the head of the linked list, which
    // is why we have to pass the snake's tail to `reverseLinkedList`.
    reverseLinkedList(snake.tail);
    const snakeHead = snake.head;
    snake.head = snake.tail;
    snake.tail = snakeHead;
  };

  const HandleFoodConsumption = (newSnakeCells) => {
    const maxPossibleCellValue = BOARD_HEIGHT * BOARD_WIDTH;
    let nextFoodCell;
    // In practice, this will never be a time-consuming operation. Even
    // in the extreme scenario where a snake is so big that it takes up 90%
    // of the board (nearly impossible), there would be a 10% chance of generating
    // a valid new food cell--so an average of 10 operations: trivial.
    while (true) {
      nextFoodCell = randomIntFromInterval(1, maxPossibleCellValue);
      if (newSnakeCells.has(nextFoodCell) || foodCell === nextFoodCell)
        continue;
      break;
    }

    const nextFoodShouldReverseDirection =
      Math.random() < PROBABILITY_OF_DIRECTION_REVERSAL_FOOD;

    setFoodCell(nextFoodCell);
    setFoodShouldReverseDirection(nextFoodShouldReverseDirection);
    /* setScore(score + Math.floor(100000000000000/(BOARD_HEIGHT*BOARD_WIDTH))); */
    setScore(score + 1);
  };

  const handleGameOver = () => {
    setHit(true);
    setMove(false);
    setHitCells(Array.from(snakeCells));

    setTimeout(
      setTimeout(function () {
        setHit(false);
        setHitCells([]);
        setScore(0);
        const snakeLLStartingValue = getStartingSnakeLLValue(board);
        setSnake(new LinkedList(snakeLLStartingValue));
        setFoodCell(snakeLLStartingValue.cell + 5);
        setSnakeCells(new Set([snakeLLStartingValue.cell]));
        setDirection(Direction.RIGHT);
      }, 1500)
    );
  };

  return (
    <>
      <h1>Reversed Snake Game</h1>
      <h4>Your Score: {score}</h4>

      <div className="board">
        {info ? (
          <>
            <div>
              <h2>Instructions</h2>
              <div className="infotext">
                1. Move around using the arrow keys
              </div>
              <div className="infotext">2. Collect All Tokens to score.</div>
              <div className="infotext">
                3. Violet tokens will reverse your direction
              </div>
              <div className="infotext">
                4. Moving into yourself or the walls will kill you
              </div>
              <div className="rectangle back" onClick={() => setInfo(!info)}>
                Back{" "}
              </div>
            </div>
          </>
        ) : (
          <>
            {!move && !hit ? (
              <>
                <div className="start">
                  <div className="speeds">
                    <div
                      className={`rectangle ${
                        speed === Speeds.SuperSoinc ? "active" : ""
                      }`}
                      onClick={() => setSpeed(Speeds.SuperSoinc)}
                    >
                      Super Sonic
                    </div>
                    <div
                      className={`rectangle ${
                        speed === Speeds.Rapid ? "active" : ""
                      }`}
                      onClick={() => setSpeed(Speeds.Rapid)}
                    >
                      Rapid
                    </div>
                    <div
                      className={`rectangle ${
                        speed === Speeds.Lazy ? "active" : ""
                      }`}
                      onClick={() => setSpeed(Speeds.Lazy)}
                    >
                      Lazy
                    </div>
                  </div>

                  <div className="enter">
                    <h2>Press ENTER to start</h2>
                  </div>
                  <div className="info-line">
                    <div className="info" onClick={() => setInfo(!info)}>
                      Info
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {hit && <div className="finito">Game Over</div>}
                {board.map((row, rowIdx) => (
                  <div key={rowIdx} className="row">
                    {row.map((cellValue, cellIdx) => {
                      const className = getCellClassName(
                        cellValue,
                        foodCell,
                        foodShouldReverseDirection,
                        snakeCells,
                        hit,
                        hitCells
                      );
                      return <div key={cellIdx} className={className}></div>;
                    })}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

const createBoard = (BOARD_HEIGHT, BOARD_WIDTH) => {
  let counter = 1;
  const board = [];
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    const currentRow = [];
    for (let col = 0; col < BOARD_WIDTH; col++) {
      currentRow.push(counter++);
    }
    board.push(currentRow);
  }
  return board;
};

const getCoordsInDirection = (coords, direction) => {
  if (direction === Direction.UP) {
    return {
      row: coords.row - 1,
      col: coords.col,
    };
  }
  if (direction === Direction.RIGHT) {
    return {
      row: coords.row,
      col: coords.col + 1,
    };
  }
  if (direction === Direction.DOWN) {
    return {
      row: coords.row + 1,
      col: coords.col,
    };
  }
  if (direction === Direction.LEFT) {
    return {
      row: coords.row,
      col: coords.col - 1,
    };
  }
};

const isOutOfBounds = (coords, board) => {
  const { row, col } = coords;
  if (row < 0 || col < 0) return true;
  if (row >= board.length || col >= board[0].length) return true;
  return false;
};

const getDirectionFromKey = (key) => {
  if (key === "ArrowUp") return Direction.UP;
  if (key === "ArrowRight") return Direction.RIGHT;
  if (key === "ArrowDown") return Direction.DOWN;
  if (key === "ArrowLeft") return Direction.LEFT;
  if (key === "Enter") return "ENTER";
  return "";
};

const getNextNodeDirection = (node, currentDirection) => {
  if (node.next === null) return currentDirection;
  const { row: currentRow, col: currentCol } = node.value;
  const { row: nextRow, col: nextCol } = node.next.value;
  if (nextRow === currentRow && nextCol === currentCol + 1) {
    return Direction.RIGHT;
  }
  if (nextRow === currentRow && nextCol === currentCol - 1) {
    return Direction.LEFT;
  }
  if (nextCol === currentCol && nextRow === currentRow + 1) {
    return Direction.DOWN;
  }
  if (nextCol === currentCol && nextRow === currentRow - 1) {
    return Direction.UP;
  }
  return "";
};

const getGrowthNodeCoords = (snakeTail, currentDirection) => {
  const tailNextNodeDirection = getNextNodeDirection(
    snakeTail,
    currentDirection
  );
  const growthDirection = getOppositeDirection(tailNextNodeDirection);
  const currentTailCoords = {
    row: snakeTail.value.row,
    col: snakeTail.value.col,
  };
  const growthNodeCoords = getCoordsInDirection(
    currentTailCoords,
    growthDirection
  );
  return growthNodeCoords;
};

const getOppositeDirection = (direction) => {
  if (direction === Direction.UP) return Direction.DOWN;
  if (direction === Direction.RIGHT) return Direction.LEFT;
  if (direction === Direction.DOWN) return Direction.UP;
  if (direction === Direction.LEFT) return Direction.RIGHT;
};

const getCellClassName = (
  cellValue,
  foodCell,
  foodShouldReverseDirection,
  snakeCells,
  hit,
  hitCells
) => {
  let className = "cell";
  if (cellValue === foodCell) {
    if (foodShouldReverseDirection) {
      className = "cell cell-purple";
    } else {
      className = "cell cell-red";
    }
  }
  if (hit && hitCells.includes(cellValue)) {
    className = "cell cell-hit-red";
  } else if (hit && snakeCells.has(cellValue)) {
    className = "cell cell-green-background";
  } else if (snakeCells.has(cellValue)) {
    className = "cell cell-green";
  }

  return className;
};

export default Board;
