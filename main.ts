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



window.onload = function() {
  const width = 6;
  const height = 3;


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


  type Cell = string;
  type Level = string[];

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

  function loadLevel(level: Level) {
    let player: Maybe<Pos> = Nothing;

    for (let y = 0; y<height; ++y) {
      for (let x = 0; x<width; ++x) {
        const cell = level[y][x];
        if (cell === "R" || cell === "r") player = Just({"x": x, "y": y});
        images[y][x].setAttribute("src", srcForCell(cell));
      }
    }

    return player;
  }


  let player = loadLevel([
    "#O##o#",
    ".R....",
    "......",
  ]);

  console.log(player);
};
