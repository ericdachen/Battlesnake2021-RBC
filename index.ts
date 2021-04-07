import bodyParser from "body-parser";
import express, { Request, Response } from "express";

import { SnakeInfo, Move, Direction, GameRequest } from "./types";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());

app.get("/", handleIndex);
app.post("/start", handleStart);
app.post("/move", handleMove);
app.post("/end", handleEnd);

app.listen(PORT, () =>
  console.log(
    `TypeScript Battlesnake Server listening at http://127.0.0.1:${PORT}`
  )
);

// {
//   game: {
//     id: '588a132b-9ce0-4d48-b93e-f404ea3c6a0d',
//     ruleset: { name: 'solo', version: 'v1.0.17' },
//     timeout: 500
//   },
//   turn: 3,
//   board: {
//     height: 11,
//     width: 11,
//     snakes: [ [Object] ],
//     food: [ [Object] ],
//     hazards: []
//   },
//   you: {
//     id: 'gs_PSgmQDjgXwbb9hTwmwkgkJk7',
//     name: 'RBC',
//     latency: '67',
//     health: 99,
//     body: [ [Object], [Object], [Object], [Object] ],
//     head: { x: 10, y: 9 },
//     length: 4,
//     shout: 'Can I have a hug? :3'
//   }
// }

function handleIndex(request: Request, response: Response<SnakeInfo>) {
  const battlesnakeInfo: SnakeInfo = {
    apiversion: "1",
    author: "",
    color: "#006AC3",
    head: "default",
    tail: "default",
  };
  response.status(200).json(battlesnakeInfo);
}

function handleStart(request: GameRequest, response: Response) {
  const gameData = request.body;

  console.log("START");
  response.status(200).send("ok");
}

interface Coordinates {
  x: number;
  y: number;
}

function handleMove(request: GameRequest, response: Response<Move>) {
  const gameData = request.body;
  const allMoves: Direction[] = ["up", "down", "left", "right"];
  const possibleMoves: Direction[] = [];

  const allSnakeCoordinates: Coordinates[] = [];

  for (let i in gameData.board.snakes) {
    for (let j in gameData.board.snakes[i].body) {
      allSnakeCoordinates.push(gameData.board.snakes[i].body[j]);
    }
  }

  for (let i in allMoves) {
    if (!immediateDanger(request, allMoves[i], allSnakeCoordinates)) {
      possibleMoves.push(allMoves[i]);
    }
  }

  const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

  console.log("MOVE: " + move);
  response.status(200).send({
    move: move,
    shout: "Can I have a hug? :3",
  });
}

function immediateDanger(
  request: GameRequest,
  moveDirection: Direction,
  snakeCoords: Coordinates[]
) {
  const gameData = request.body;

  const height = gameData.board.height;
  const width = gameData.board.width;
  //var translation: number[] = [0,0];
  let translation: number[] = calculateMove(moveDirection);

  const curHead = {
    x: gameData.you.head.x,
    y: gameData.you.head.y,
  };

  let newMove = {
    x: curHead.x + translation[0],
    y: curHead.y + translation[1],
  };

  //don't bump into walls
  if (
    newMove.y > height - 1 ||
    newMove.y < 0 ||
    newMove.x < 0 ||
    newMove.x > width - 1
  ) {
    return true;
  }

  //don't bump into ourselves/other snakes
  // for (let i in snakeCoords) {
  //   console.log(snakeCoords[i].x);
  // }

  for (let i in snakeCoords) {
    if (newMove.x == snakeCoords[i].x && newMove.y == snakeCoords[i].y) {
      return true;
    }
  }

  return false;
}

// function spin() {
//   //Spins on the spot until it reaches certain amount of HP
// }

// function getFood() {
//   //calculates shortest distance to food
//   // Also calculates which food is furthest from other snakes
// }

//Doesn't bump into any snakes (accounts for +2 tiles away in case both go to the same empty tile)

function calculateMove(dir: Direction) {
  if (dir == "up") {
    return [0, 1];
  } else if (dir == "down") {
    return [0, -1];
  } else if (dir == "left") {
    return [-1, 0];
  } else if (dir == "right") {
    return [1, 0];
  }

  return [0, 0];
}

function handleEnd(request: GameRequest, response: Response) {
  const gameData = request.body;

  console.log("END");
  response.status(200).send("ok");
}
