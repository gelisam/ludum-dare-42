type Images = HTMLElement[][];

function createTable(width: number, height: number) {
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


type Cell = string;
type Level = string[];

function srcForCell(cell: Cell) {
  if (cell == "B") return "images/battery.png";
  if (cell == ".") return "images/floor.png";
  if (cell == "O") return "images/plugged-outlet.png";
  if (cell == "R") return "images/plugged-robot.png";
  if (cell == "S") return "images/solar.png";
  if (cell == "o") return "images/unplugged-outlet.png";
  if (cell == "r") return "images/unplugged-robot.png";
  if (cell == "#") return "images/wall.png";
  return "";
}

function loadLevel(width: number, height: number, images: Images, level: Level) {
  for (let y = 0; y<height; ++y) {
    for (let x = 0; x<width; ++x) {
      images[y][x].setAttribute("src", srcForCell(level[y][x]));
    }
  }
}

window.onload = function() {
  const width = 6;
  const height = 3;
  loadLevel(width, height, createTable(width, height), [
    "#O##o#",
    ".R....",
    "......",
  ]);
};
