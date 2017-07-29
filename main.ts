type Nothing = {
  "ctor": "Nothing",
}
type Just<A> = {
  "ctor": "Just",
  "value": A,
}
type Maybe<A> = Nothing | Just<A>;

const Nothing: Nothing = {"ctor": "Nothing"};
function Just<A>(value: A): Just<A> {
  return {"ctor": "Just", value: value};
}


type Pos = {"x": number, "y": number};

const dirN = {"x":  0, "y": -1};
const dirE = {"x":  1, "y":  0};
const dirW = {"x": -1, "y":  0};
const dirS = {"x":  0, "y":  1};

function add(pos1: Pos, pos2: Pos) {
  return {"x": pos1.x + pos2.x, "y": pos1.y+pos2.y};
}


type Cell = string;
type Level = Cell[][];

function levelRow(s: String): Cell[] {
  let row: Cell[] = [];

  for (let x = 0; x<s.length; ++x) {
    row.push(s[x]);
  }

  return row;
}


window.onload = function() {
  const width = 6;
  const height = 6;

  const initialLevel = [
    "#O##o#",
    ".R....",
    "......",
    "#o#...",
    "....B.",
    "......",
  ];


  function copyLevel() {
    let copiedLevel: Level = [];

    for (let y = 0; y<height; ++y) {
      let copiedRow: Cell[] = [];

      for (let x = 0; x<width; ++x) {
        copiedRow.push(initialLevel[y][x]);
      }

      copiedLevel.push(copiedRow);
    }

    return copiedLevel;
  }

  let level = copyLevel();


  const fadeTo = document.getElementById("fadeTo");

  function gameOver() {
    fadeTo.removeEventListener("transitionend", gameOver);
    fadeTo.classList.remove("black");
    fadeTo.classList.remove("normal");
    reset();
  }


  type Images = HTMLElement[][];

  function createTable() {
    let table = document.createElement("TABLE");
    let images: Images = [];

    for (let y = 0; y<height; ++y) {
      let tr = document.createElement("TR");
      let image_row: HTMLElement[] = [];

      for (let x = 0; x<width; ++x) {
        let td = document.createElement("TD");
        let img = document.createElement("IMG");

        td.appendChild(img);
        tr.appendChild(td);
        image_row.push(img);
      }

      table.appendChild(tr);
      images.push(image_row)
    }

    document.body.appendChild(table);
    return images;
  }

  const images = createTable();


  function cellAt(pos: Pos) {
    if (pos.x < 0) return "#";
    if (pos.y < 0) return "#";
    if (pos.x >= width) return "#";
    if (pos.y >= height) return "#";

    return level[pos.y][pos.x];
  }

  function isSolid(cell: Cell) {
    return (cell === "#" || cell === "o" || cell === "O");
  }


  function srcForCell(cell: Cell) {
    if (cell === "B") return "images/battery.png";
    if (cell === ".") return "images/floor.png";
    if (cell === "O") return "images/plugged-outlet.png";
    if (cell === "R") return "images/plugged-robot.png";
    if (cell === "S") return "images/solar.png";
    if (cell === "o") return "images/unplugged-outlet.png";
    if (cell === "r") return "images/unplugged-robot.png";
    if (cell === "#") return "images/wall.png";

    return "";
  }

  function writeCell(pos: Pos, cell: Cell) {
    level[pos.y][pos.x] = cell;
    images[pos.y][pos.x].setAttribute("src", srcForCell(cell));
  }

  function loadLevel() {
    let player: Maybe<Pos> = Nothing;

    for (let y = 0; y<height; ++y) {
      for (let x = 0; x<width; ++x) {
        const pos = {"x": x, "y": y};
        const cell = initialLevel[pos.y][pos.x];

        if (cell === "R" || cell === "r") player = Just({"x": x, "y": y});
        writeCell(pos, cell);
      }
    }

    return player;
  }


  let maybePlayer = loadLevel();

  let player: Pos;
  if (maybePlayer.ctor === "Nothing") {
    console.error("level has no start position");
    return;
  } else {
    player = maybePlayer.value;
  }


  const initialMaxEnergy = 6;
  const initialEnergy = 6;
  let maxEnergy = initialMaxEnergy;
  let energy = initialEnergy;

  function movePlayer(dir: Pos) {
    const pos = add(player, dir);
    if (isSolid(cellAt(pos))) return;

    if (energy === 0) return;
    --energy;

    writeCell(player, ".");
    {
      const above = add(player, dirN);
      if (cellAt(above) === "O") {
        writeCell(above, "o");
      }
    }

    player = pos;

    {
      const above = add(player, dirN);
      if (cellAt(above) === "o") {
        writeCell(above, "O");
        writeCell(player, "R");

        energy = maxEnergy;
        fadeTo.classList.remove("dark");
        fadeTo.classList.remove("darkish");
        fadeTo.classList.add("normal");
      } else {
        writeCell(player, "r");
        if (energy > 3) {
          fadeTo.classList.remove("normal");
          fadeTo.classList.add("darkish");
        } else if (energy > 0) {
          fadeTo.classList.remove("normal");
          fadeTo.classList.remove("darkish");
          fadeTo.classList.add("dark");
        } else {
          fadeTo.classList.remove("normal");
          fadeTo.classList.remove("darkish");
          fadeTo.classList.remove("dark");
          fadeTo.classList.add("black");
          fadeTo.addEventListener("transitionend", gameOver);
        }
      }
    }
  };

  document.onkeydown = function(e) {
    if      (e.code === "ArrowUp"   ) movePlayer(dirN);
    else if (e.code === "ArrowRight") movePlayer(dirE);
    else if (e.code === "ArrowLeft" ) movePlayer(dirW);
    else if (e.code === "ArrowDown" ) movePlayer(dirS);
  }

  function reset() {
    maxEnergy = initialMaxEnergy;
    energy = initialEnergy;

    const maybePlayer = loadLevel();
    if (maybePlayer.ctor === "Nothing") {
      console.error("we already checked this on startup, should never happen");
      return;
    } else {
      player = maybePlayer.value;
    }
  }
};
