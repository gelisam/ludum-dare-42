type Nothing = {
  ctor: "Nothing",
};
type Just<A> = {
  ctor: "Just",
  value: A,
};
type Maybe<A> = Nothing | Just<A>;

const Nothing: Nothing = {ctor: "Nothing"};
function Just<A>(value: A): Just<A> {
  return {ctor: "Just", value: value};
}


type Done = {
  ctor: "Done",
};
type Run = {
  ctor: "Run",
  cc: () => Cutscene,
};
type PressAnyKey = {
  ctor: "PressAnyKey",
  cc: Cutscene,
};
type Delay = {
  ctor: "Delay",
  millis: number,
  cc: Cutscene,
};
type Transition = {
  ctor: "Transition",
  elem: HTMLElement,
  classToAdd: string,
  cc: Cutscene,
};
type Cutscene = Done | Run | PressAnyKey | Delay | Transition;

const Done: Cutscene = {
  ctor: "Done",
};
function Run(cc: () => Cutscene): Cutscene {
  return {ctor: "Run", cc: cc};
}
function PressAnyKey(cc: Cutscene): Cutscene {
  return {ctor: "PressAnyKey", cc: cc};
}
function Delay(millis: number, cc: Cutscene): Cutscene {
  return {ctor: "Delay", millis: millis, cc: cc};
}
function Transition(elem: HTMLElement, classToAdd: string, cc: Cutscene): Cutscene {
  return {ctor: "Transition", elem: elem, classToAdd: classToAdd, cc: cc};
}

function cutsceneAction(action: () => void): Cutscene {
  return Run(() => {
    action();
    return Done;
  });
}

const pauseCutscene: Cutscene = PressAnyKey(Done);

function hangCutscene(): Cutscene {
  return PressAnyKey(Run(hangCutscene));
}

function delayCutscene(millis: number): Cutscene {
  return Delay(millis, Done);
}

function transitionCutscene(elem: HTMLElement, classToAdd: string): Cutscene {
  return Transition(elem, classToAdd, Done);
}

function sequenceTwoCutscenes(cutscene1: Cutscene, cutscene2: Cutscene): Cutscene {
  switch (cutscene1.ctor) {
    case "Done":
      return cutscene2;
    case "Run":
      return Run(
        () => sequenceTwoCutscenes(cutscene1.cc(), cutscene2)
      );
    case "PressAnyKey":
      return PressAnyKey(
        sequenceTwoCutscenes(cutscene1.cc, cutscene2)
      );
    case "Delay":
      return Delay(
        cutscene1.millis,
        sequenceTwoCutscenes(cutscene1.cc, cutscene2)
      );
    case "Transition":
      return Transition(
        cutscene1.elem,
        cutscene1.classToAdd,
        sequenceTwoCutscenes(cutscene1.cc, cutscene2)
      );
  }
}

function sequenceCutscenes(cutscenes: Cutscene[]): Cutscene {
  let r = Done;

  for (let i = 0; i<cutscenes.length; ++i) {
    r = sequenceTwoCutscenes(r, cutscenes[i]);
  }

  return r;
}

function replicateCutscene(n: number, cutscene: Cutscene): Cutscene {
  let r = Done;

  for (let i = 0; i<n; ++i) {
    r = sequenceTwoCutscenes(r, cutscene);
  }

  return r;
}


function getElementById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw ReferenceError("element with id " + id + " not found");
  return element;
}


type Pos = {x: number, y: number};

const dirN = {x:  0, y: -1};
const dirE = {x:  1, y:  0};
const dirW = {x: -1, y:  0};
const dirS = {x:  0, y:  1};

function add(pos1: Pos, pos2: Pos) {
  return {x: pos1.x + pos2.x, y: pos1.y+pos2.y};
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
    "DOooo#",
    ".R....",
    "...B..",
    "##o.B.",
    "S....B",
    "......",
  ];

  const fadeTo = getElementById("fadeTo");
  const gamegrid = getElementById("gamegrid");
  const loading = getElementById("loading");
  const splashBox = getElementById("splashBox");

  let thoughtBox = getElementById("thoughtBox");
  let skipTextRequested = false;

  let deathCutsceneHasPlayed = false;
  let deathCutsceneWithItemsHasPlayed = false;
  let batteryCutsceneHasPlayed = false;
  let lowBatteryCutsceneHasPlayed = false;
  let solarPanelCutsceneHasPlayed = false;

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

  const batterySound1 = new Audio("audio/battery1.wav");
  const batterySound2 = new Audio("audio/battery2.wav");
  const batterySound3 = new Audio("audio/battery3.wav");
  const solarPanelSound = new Audio("audio/solar-panel.wav");
  const passOutSound = new Audio("audio/pass-out.wav");


  gamegrid.removeChild(loading);


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


  function gameOver() {
    if (maxEnergy === 0) {
      if (!deathCutsceneHasPlayed) {
        deathCutsceneHasPlayed = true;

        playCutscene(sequenceCutscenes([
          transitionCutscene(fadeTo, "black"),
          thoughtsCutscene("Am I dead?"),
          cutsceneAction(reset),
          transitionCutscene(fadeTo, "normal"),
          thoughtsCutscene("No, clearly not. I'm back where I started."),
          thoughtsCutscene("The Professor must have plugged me back."),
        ]));
      } else {
        playCutscene(sequenceCutscenes([
          transitionCutscene(fadeTo, "black"),
          cutsceneAction(reset),
        ]));
      }
    } else {
      if (!deathCutsceneWithItemsHasPlayed) {
        deathCutsceneWithItemsHasPlayed = true;

        if (!deathCutsceneHasPlayed) {
          deathCutsceneHasPlayed = true;

          playCutscene(sequenceCutscenes([
            transitionCutscene(fadeTo, "black"),
            thoughtsCutscene("Am I dead?"),
            cutsceneAction(reset),
            transitionCutscene(fadeTo, "normal"),
            thoughtsCutscene("Okay, good news: I'm not dead. I'm back where I started."),
            thoughtsCutscene("The Professor must have plugged me back."),
            thoughtsCutscene("Bad news: the Professor has also put all the batteries back where they belong, so I have to start over!"),
          ]));
        } else {
          playCutscene(sequenceCutscenes([
            transitionCutscene(fadeTo, "black"),
            cutsceneAction(reset),
            thoughtsCutscene("The Professor has plugged me back, once again."),
            thoughtsCutscene("Oh no; it looks like he also put all the batteries back where they belong, so I have to start over!"),
          ]));
        }
      } else {
        playCutscene(sequenceCutscenes([
          transitionCutscene(fadeTo, "black"),
          cutsceneAction(reset),
        ]));
      }
    }
  }


  const lightsOutCutscene = cutsceneAction(() => {
    areLightsOut = true;
    refreshLevel();
  });
  const lightsOnCutscene = cutsceneAction(() => {
    areLightsOut = false;
    refreshLevel();
  });
  const powerFailureCutscene = sequenceCutscenes([
    lightsOutCutscene,
    delayCutscene(500),
    lightsOnCutscene,
    delayCutscene(500),
    replicateCutscene(3, sequenceCutscenes([
      lightsOutCutscene,
      delayCutscene(120),
      lightsOnCutscene,
      delayCutscene(120),
    ])),
    lightsOutCutscene,
  ]);


  function thoughtsCutscene(thoughts: string): Cutscene {
    let i = 0;
    return sequenceCutscenes([
      cutsceneAction(() => {
        thoughtBox.classList.remove("empty");
        skipTextRequested = false;
      }),
      replicateCutscene(thoughts.length, Run(() => {
        if (skipTextRequested) {
          thoughtBox.textContent = thoughts;
          return Done;
        } else {
          ++i;
          thoughtBox.textContent = thoughts.slice(0,i);
          return delayCutscene(50);
        }
      })),
      pauseCutscene,
      cutsceneAction(() => {
        thoughtBox.classList.add("empty");
      }),
    ]);
  }

  const introCutscene = sequenceCutscenes([
    cutsceneAction(() => {
      splashBox.classList.remove("empty");
      splashBox.classList.add("intro");
    }),
    pauseCutscene,
    cutsceneAction(() => {
      splashBox.classList.remove("outro");
      splashBox.classList.add("empty");
      reset();
    }),
    thoughtsCutscene("I'm a robot without a battery."),
    thoughtsCutscene("If I walk even one step away from this power outlet, I'll unplug and die."),
    thoughtsCutscene("Unless, of course, I plug into another outlet!"),
  ]);

  const outroCutscene = sequenceCutscenes([
    cutsceneAction(() => {
      splashBox.classList.remove("empty");
      splashBox.classList.add("outro");
    }),
    delayCutscene(1000),
    thoughtsCutscene("Hooray, I'm outside!"),
    delayCutscene(2000),
    thoughtsCutscene("By the way, the Professor created me in 48h for Ludum Dare 39. His name is Samuel Gélineau."),
    thoughtsCutscene("The theme was \"Running out of Power\". That's a bit of a cruel theme, if you ask me!"),
    thoughtsCutscene("Thanks for playing!"),
    hangCutscene(),
  ]);


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

    gamegrid.appendChild(table);
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
      if (cell === "D") return "images/dark-door.jpg";
      if (cell === ".") return "images/dark-floor.png";
      if (cell === "s") return "images/dark-solar-robot.png";
      if (cell === "o") return "images/dark-outlet.png";
      if (cell === "#") return "images/dark-wall.png";
    } else {
      if (cell === "B") return "images/battery.png";
      if (cell === "D") return "images/door.jpg";
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
        const pos = {x: x, y: y};
        writeCell(pos, cellAt(pos));
      }
    }
  }

  function loadLevel() {
    let player: Maybe<Pos> = Nothing;

    for (let y = 0; y<height; ++y) {
      for (let x = 0; x<width; ++x) {
        const pos = {x: x, y: y};
        const cell = initialLevel[pos.y][pos.x];

        if (cell === "R" || cell === "r") player = Just({x: x, y: y});
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


  let nextCutscene: Maybe<Cutscene> = Nothing;

  function playNextCutscene() {
    console.log("playNextCutscene");
    if (nextCutscene.ctor === "Just") {
      const cutscene = nextCutscene.value;
      nextCutscene = Nothing;
      playCutscene(cutscene);
    }
  }

  function resumePausedCutscene() {
    if (nextCutscene.ctor === "Just" && nextCutscene.value.ctor === "PressAnyKey") {
      const cutscene = nextCutscene.value.cc;
      nextCutscene = Nothing;
      playCutscene(cutscene);
    }
  }

  function playCutscene(cutscene: Cutscene): void {
    withinCutscene = true;
    switch (cutscene.ctor) {
      case "Done":
        withinCutscene = false;
        return;
      case "Run":
        return playCutscene(cutscene.cc());
      case "PressAnyKey":
        nextCutscene = Just(cutscene);
        return;
      case "Delay":
        nextCutscene = Just(cutscene.cc);
        window.setTimeout(playNextCutscene, cutscene.millis);
        return;
      case "Transition":
        nextCutscene = Just(cutscene.cc);
        cutscene.elem.classList.add(cutscene.classToAdd);
        cutscene.elem.addEventListener("transitionend", playNextCutscene);
        return;
    }
  }


  playCutscene(introCutscene);

  function movePlayer(dir: Pos) {
    const pos = add(player, dir);
    if (isSolid(cellAt(pos))) return;

    if (cellAt(pos) === "D" && !hasSolarPanel) {
      playCutscene(thoughtsCutscene("This door leads outside. Certain death lies over there: there are no outlets on trees."));
      return;
    }

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
      if (maxEnergy == 2) {
        batterySound1.play();
      } else if (maxEnergy == 4) {
        batterySound2.play();
      } else {
        batterySound3.play();
      }
      if (!batteryCutsceneHasPlayed) {
        batteryCutsceneHasPlayed = true;
        playCutscene(sequenceCutscenes([
          thoughtsCutscene("LEAP OF FAITH!!!"),
          thoughtsCutscene("What luck! This battery is just my size."),
        ]));
      }
      energy = maxEnergy;
    } else if (cellAt(player) === "S") {
      solarPanelSound.play();
      hasSolarPanel = true;
      energy = maxEnergy;

      if (!solarPanelCutsceneHasPlayed) {
        solarPanelCutsceneHasPlayed = true;
        playCutscene(sequenceCutscenes([
          thoughtsCutscene("Nice, a solar panel!!!"),
          thoughtsCutscene("I don't need batteries nor power outlets anymore! I am a free robot!"),
          thoughtsCutscene("Green energy, too!"),
          delayCutscene(1000),
          powerFailureCutscene,
          delayCutscene(1000),
          thoughtsCutscene("Unless, of course, a power failure were to cut off the lights."),
          thoughtsCutscene("Looks like it's still sunny out there. Am I brave enough to go... Outside?"),
          delayCutscene(1000),
          thoughtsCutscene("Wait, during a power failure, the power outlets won't work either. That might be problematic."),
        ]));
      } else {
        playCutscene(powerFailureCutscene);
      }
    } else if (cellAt(player) === "D" && hasSolarPanel) {
      playCutscene(outroCutscene);
      return;
    } else {
      --energy;
    }

    {
      const above = add(player, dirN);
      if (cellAt(above) === "o" && !hasSolarPanel) {
        writeCell(above, "O");
        writeCell(player, "R");

        energy = maxEnergy;
      } else {
        writeCell(player, hasSolarPanel ? "s" : "r");
      }

      if (energy === maxEnergy) {
        fadeTo.classList.remove("darkest");
        fadeTo.classList.remove("dark");
        fadeTo.classList.remove("darkish");
        fadeTo.classList.add("normal");
      } else if (energy > 2) {
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

        if (!lowBatteryCutsceneHasPlayed) {
          lowBatteryCutsceneHasPlayed = true;
          playCutscene(sequenceCutscenes([
            thoughtsCutscene("Famous last words:"),
            thoughtsCutscene("\"Wow, these batteries run out fast!\""),
          ]));
        }
      } else {
        fadeTo.classList.remove("normal");
        fadeTo.classList.remove("darkish");
        fadeTo.classList.remove("dark");
        fadeTo.classList.remove("darkest");
        passOutSound.play();
        gameOver();
      }
    }

    displayEnergy();
  };

  document.onkeydown = function(e) {
    if (withinCutscene) {
      skipTextRequested = true;
      resumePausedCutscene();
    } else if (e.code === "ArrowUp") {
      movePlayer(dirN);
    } else if (e.code === "ArrowRight") {
        movePlayer(dirE);
    } else if (e.code === "ArrowLeft") {
      movePlayer(dirW);
    } else if (e.code === "ArrowDown") {
      movePlayer(dirS);
    }
  }

  function reset() {
    fadeTo.classList.remove("black");
    fadeTo.classList.add("normal");

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
