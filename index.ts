import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { AStarFinder } from "astar-typescript";

import { SnakeInfo, Move, Direction, GameRequest, Coordinates } from "./types";

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
    color: "#FFC72C",
    head: "evil",
    tail: "bolt",
  };
  response.status(200).json(battlesnakeInfo);
}



function initGrid(request: GameRequest, snakeCoords: Coordinates[]) {
  const gameData = request.body;
  const height = gameData.board.height;
  const width = gameData.board.width;
  const bodyCoords = gameData.you.body;
  const tail = bodyCoords[bodyCoords.length-1];
  const head = gameData.you.head;
  
  //creating the grid
  let myGrid: number[][] = [];
 
  //intializing the templateRow
  for (let i = 0; i < height; i++) { //the row we are appending
    var templateRow: number[] = [];
    for (let j = 0; j < width; j++) {
      templateRow[j]=0;
    }
    for (let j of snakeCoords) { //the columns values we are appending
      if (j.y === i) {
        templateRow[j.x] = 1;
      }
    }
    if (head.y === i) {
      templateRow[head.x] = 0;
    }
    if (tail.y === i) {
      templateRow[tail.x] = 0;
    }
    myGrid.push(templateRow);
  }

  return myGrid;
  
} 

function handleStart(request: GameRequest, response: Response) {
  const gameData = request.body;

  console.log("START");
  response.status(200).send("ok");
}

function handleMove(request: GameRequest, response: Response<Move>) {
  const gameData = request.body;
  const allMoves: Direction[] = ["up", "down", "left", "right"];
  const possibleMoves: Direction[] = [];

  const allSnakeCoordinates: Coordinates[] = [];

  // Puts all the snake body coordinates into allSnakeCoordinates
  for (let i in gameData.board.snakes) {
    for (let j in gameData.board.snakes[i].body) {
      allSnakeCoordinates.push(gameData.board.snakes[i].body[j]);
    }
  }

  let updatedGrid: number[][] = initGrid(request, allSnakeCoordinates
  );
  let aStarInstance: AStarFinder;

  aStarInstance = new AStarFinder({
    grid: {
      matrix: updatedGrid,
    },
    diagonalAllowed: false,
    includeStartNode: false,
    includeEndNode: true,
  });

  //console.log(aStarInstance);
  //console.log(updatedGrid);
  

  for (let i in allMoves) {
    if (!immediateDanger(request, allMoves[i], allSnakeCoordinates)) {
      possibleMoves.push(allMoves[i]);
    }
  }

  // for (let i in possibleMoves) {
  //   let movesAfterNewMov = 4;
  //   if (immediateDanger(request, possibleMoves[i], allSnakeCoordinates)) {
  //     movesAfterNewMov -= 1;
  //   }
  // }

  var move: Direction = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

  //only spin if health is over 25
  if (gameData.you.health > 25) {
    chaseTail(request, possibleMoves, aStarInstance);  
  } else {
    getFood(request, possibleMoves, aStarInstance);
  }

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
  for (let i in snakeCoords) {
    if (newMove.x == snakeCoords[i].x && newMove.y == snakeCoords[i].y) {
      return true;
    }
  }
  const allMoves: Direction[] = ["up", "down", "left", "right"];
  let count = 4;
  for (let i = 0; i < allMoves.length; i++) {
    if (isDeadDirection(request, newMove, snakeCoords, allMoves[i])) {
      count -= 1;
    }
  }
  if (count == 0) {
    return true;
  }
  // if (isDeadEnd(request, newMove, snakeCoords)) {
  //   return true;
  // }

return false;
}

function isDeadDirection( request: GameRequest,
  newMove: Coordinates,
  snakeCoords: Coordinates[],
  direction: Direction) {

  const gameData = request.body;

  const height = gameData.board.height;
  const width = gameData.board.width;

  let translation: number[] = calculateMove(direction);

    let newerMove = {
    x: newMove.x + translation[0],
    y: newMove.y + translation[1],
  };

    if (newMove.y > height - 1 ||
    newMove.y < 0 ||
    newMove.x < 0 ||
    newMove.x > width - 1) {
      return true;
  }
    for (let i in snakeCoords) {
    if (newMove.x == snakeCoords[i].x && newMove.y == snakeCoords[i].y) {
      return true;
    }
  }
}


function chaseTail(request:GameRequest, possibleMoves:Direction[], aStarInstance: AStarFinder) {
  //Spins on the spot until it reaches certain amount of HP
  //spins by chasing its own tail
  //try to cover as much area as possible

  const gameData = request.body;
  const bodyCoords: Coordinates[] = gameData.you.body;
  var move:Direction;

  let startPos = gameData.you.head;
  let goalPos = bodyCoords[bodyCoords.length-1];
  
  console.log("Tail: " + goalPos.x + " " + goalPos.y);

  let myPathway = aStarInstance.findPath(startPos, goalPos);

  return move;
}

function spinSquare(request:GameRequest, possibleMoves:Direction[]) {
  //Spins on the spot until it reaches certain amount of HP
  //spins in a square (only called when length%4=0)
  // const gameData = request.body;
  // var move:Direction

  
  
  // return move
}

function getFood(request:GameRequest, possibleMoves:Direction[], aStarInstance: AStarFinder) {
  //calculates shortest distance to food
  // Also calculates which food is furthest from other snakes
}

//use A-star on every 

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
