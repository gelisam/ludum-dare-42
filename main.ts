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


function getElementById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw ReferenceError("element with id " + id + " not found");
  return element;
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
    "#Oooo#",
    ".R....",
    "...B..",
    "##o.B.",
    "S....B",
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


  const fadeTo = getElementById("fadeTo");

  function gameOver() {
    fadeTo.removeEventListener("transitionend", gameOver);
    fadeTo.classList.remove("black");
    fadeTo.classList.remove("normal");
    reset();
  }


  let lightOutCount = 0;

  function lightsOut() {
    lightOutCount = 4;
    toggleLightsOut();
  }

  function toggleLightsOut() {
    if (lightOutCount > 0) --lightOutCount;
    areLightsOut = !areLightsOut;
    refreshLevel();

    if (lightOutCount == 0 && areLightsOut) {
      withinCutscene = false;
    } else {
      window.setTimeout(toggleLightsOut, 120);
    }
  }


  let thoughtBox = getElementById("thoughtBox");

  function displayThoughts(thoughts: string) {
    if (thoughts === "") {
      thoughtBox.classList.add("empty");
    } else {
      thoughtBox.textContent = thoughts;
      thoughtBox.classList.remove("empty");
    }
  }


  let thoughtsCount = 0;
  let thoughtsTotal = 0;
  let completeThoughts = "";

  function animateThoughts(thoughts: string) {
    withinCutscene = true;
    thoughtsCount = 0;
    thoughtsTotal = thoughts.length;
    completeThoughts = thoughts;
    advanceThoughts();
  }

  function advanceThoughts() {
    ++thoughtsCount;
    displayThoughts(completeThoughts.slice(0, thoughtsCount));

    if (thoughtsCount >= thoughtsTotal) {
      withinCutscene = false;
    } else {
      window.setTimeout(advanceThoughts, 50);
    }
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

    getElementById("gamegrid").appendChild(table);
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
    if (areLightsOut) {
      if (cell === "B") return "images/dark-battery.png";
      if (cell === ".") return "images/dark-floor.png";
      if (cell === "s") return "images/dark-solar-robot.png";
      if (cell === "o") return "images/dark-outlet.png";
      if (cell === "#") return "images/dark-wall.png";
    } else {
      if (cell === "B") return "images/battery.png";
      if (cell === ".") return "images/floor.png";
      if (cell === "O") return "images/plugged-outlet.png";
      if (cell === "R") return "images/plugged-robot.png";
      if (cell === "S") return "images/solar.png";
      if (cell === "s") return "images/solar-robot.png";
      if (cell === "o") return "images/unplugged-outlet.png";
      if (cell === "r") return "images/unplugged-robot.png";
      if (cell === "#") return "images/wall.png";
    }

    return "";
  }

  function writeCell(pos: Pos, cell: Cell) {
    level[pos.y][pos.x] = cell;
    images[pos.y][pos.x].setAttribute("src", srcForCell(cell));
  }

  function refreshLevel() {
    for (let y = 0; y<height; ++y) {
      for (let x = 0; x<width; ++x) {
        const pos = {"x": x, "y": y};
        writeCell(pos, cellAt(pos));
      }
    }
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


  const initialWithinCutscene = false;
  const initialHasSolarPanel = false;
  const initialAreLightsOut = false;
  const initialMaxEnergy = 0;
  const initialEnergy = 0;
  let withinCutscene = initialWithinCutscene;
  let hasSolarPanel = initialHasSolarPanel;
  let areLightsOut = initialAreLightsOut;
  let maxEnergy = initialMaxEnergy;
  let energy = initialEnergy;

  const batteryBank = getElementById("batteryBank");
  let virtualBatteryBank: number[] = [];

  function displayEnergy() {
    const targetBatteryBank: number[] = [];
    let energyLeft = energy;
    for (let i = 0; i<maxEnergy; i+=2) {
      if (energyLeft >= 2) {
        targetBatteryBank.unshift(2);
        energyLeft -= 2;
      } else if (energyLeft >= 1) {
        targetBatteryBank.unshift(1);
        energyLeft -= 1;
      } else {
        targetBatteryBank.unshift(0);
      }
    }

    let children = batteryBank.children;
    let n = Math.max(...[virtualBatteryBank.length, targetBatteryBank.length, children.length]);
    for (let i = 0; i<n; ++i) {
      let child: Element;
      if (i < children.length) {
        child = children[i];
      } else {
        child = document.createElement("IMG");
        batteryBank.appendChild(child);
      }

      if (i < targetBatteryBank.length) {
        const actual = virtualBatteryBank[i] || -1;
        const target = targetBatteryBank[i];

        if (actual != target) {
          if (target === 0) child.setAttribute("src", "images/empty-battery.png");
          if (target === 1) child.setAttribute("src", "images/half-battery.png");
          if (target === 2) child.setAttribute("src", "images/full-battery.png");
        }
      } else {
        batteryBank.removeChild(child);
      }
    }

    if (energy > 0) {
      batteryBank.classList.remove("empty");
    }

    virtualBatteryBank = targetBatteryBank;
  }

  displayEnergy();
  animateThoughts("I'm a robot without a battery. If I walk even one step away from this power outlet, I'll unplug and die. Unless, of course, I plug into another outlet!");

  function movePlayer(dir: Pos) {
    if (withinCutscene) return;

    const pos = add(player, dir);
    if (isSolid(cellAt(pos))) return;

    writeCell(player, ".");
    {
      const above = add(player, dirN);
      if (cellAt(above) === "O") {
        writeCell(above, "o");
      }
    }

    player = pos;

    if (cellAt(player) === "B") {
      maxEnergy += 2;
      energy = maxEnergy;
    } else if (cellAt(player) === "S") {
      hasSolarPanel = true;
      lightsOut();
      energy = maxEnergy;
    } else {
      --energy;
    }

    {
      const above = add(player, dirN);
      if (cellAt(above) === "o" && !hasSolarPanel) {
        writeCell(above, "O");
        writeCell(player, "R");

        energy = maxEnergy;
        fadeTo.classList.remove("darkest");
        fadeTo.classList.remove("dark");
        fadeTo.classList.remove("darkish");
        fadeTo.classList.add("normal");
      } else {
        writeCell(player, hasSolarPanel ? "s" : "r");
        if (energy > 2) {
          fadeTo.classList.remove("normal");
          fadeTo.classList.add("darkish");
        } else if (energy > 0) {
          fadeTo.classList.remove("normal");
          fadeTo.classList.remove("darkish");
          fadeTo.classList.add("dark");
        } else if (energy === 0) {
          fadeTo.classList.remove("normal");
          fadeTo.classList.remove("darkish");
          fadeTo.classList.remove("dark");
          fadeTo.classList.add("darkest");
        } else {
          withinCutscene = true;
          fadeTo.classList.remove("normal");
          fadeTo.classList.remove("darkish");
          fadeTo.classList.remove("dark");
          fadeTo.classList.remove("darkest");
          fadeTo.classList.add("black");
          fadeTo.addEventListener("transitionend", gameOver);
        }
      }
    }

    displayEnergy();
  };

  document.onkeydown = function(e) {
    if      (e.code === "ArrowUp"   ) movePlayer(dirN);
    else if (e.code === "ArrowRight") movePlayer(dirE);
    else if (e.code === "ArrowLeft" ) movePlayer(dirW);
    else if (e.code === "ArrowDown" ) movePlayer(dirS);
  }

  function reset() {
    withinCutscene = initialWithinCutscene;
    hasSolarPanel = initialHasSolarPanel;
    areLightsOut = initialAreLightsOut;
    maxEnergy = initialMaxEnergy;
    energy = initialEnergy;
    displayEnergy();
    if (energy === 0) batteryBank.classList.add("empty");

    const maybePlayer = loadLevel();
    if (maybePlayer.ctor === "Nothing") {
      console.error("we already checked this on startup, should never happen");
      return;
    } else {
      player = maybePlayer.value;
    }
  }
};
