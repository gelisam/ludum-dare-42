///////////
// error //
///////////

function error<A>(msg: string): A {
  throw new Error(msg);
}


///////////
// Image //
///////////

function loadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.addEventListener("load", () => resolve());
    img.addEventListener("error", () => {
      reject(new Error("Failed to load image " + src));
    });

    img.src = src;
  });
}

// must be one of the images loaded by <div id="preloader"> or loadImage
function makeImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}


///////////////////////
// CollisionDetector //
///////////////////////

// type definitions for class.collisionDetection.js

enum PixelMap {};

type Sprite = {
  x: number,
  y: number,
  width: number,
  height: number,
  image: HTMLImageElement,
  pixelMap: PixelMap
};

type CollisionDetector = {
  hitTest: (source: Sprite, target: Sprite) => boolean,
  buildPixelMap: (source: HTMLCanvasElement) => PixelMap
};

declare function collisionDetection(): CollisionDetector;

const collisionDetector = collisionDetection();


////////////
// levels //
////////////

// type definitions for levels.js

type Level = {
  backgroundFile: string,
  spriteFiles: string[]
}

declare const levels: [Level];


////////////////
// GameScreen //
////////////////

type GameScreen = {
  load: () => void,
  draw: () => void,
  unload: () => void
};

var currentGameScreen: GameScreen | null = null;

function loadGameScreen(gameScreen: GameScreen) {
  if (currentGameScreen) currentGameScreen.unload();

  currentGameScreen = gameScreen;
  currentGameScreen.load();
  currentGameScreen.draw();
}

function updateGameScreen() {
  if (currentGameScreen) currentGameScreen.draw();
}


window.onload = function() {
  /////////////
  // globals //
  /////////////

  const hiddenCanvas = <HTMLCanvasElement>document.getElementById('hiddenCanvas');
  const hiddenGraphicsContext = hiddenCanvas.getContext("2d")
                             || <CanvasRenderingContext2D>error("hiddenCanvas has no 2D context");

  const gameCanvas = <HTMLCanvasElement>document.getElementById('gameCanvas');
  const g = gameCanvas.getContext("2d")
         || <CanvasRenderingContext2D>error("gameCanvas has no 2D context");


  ////////////
  // Sprite //
  ////////////

  // must be one of the images loaded by <div id="preloader"> or makeLoadingScreen
  function loadSprite(src: string): Sprite {
    const img = makeImage(src);

    hiddenCanvas.width  = img.width;
    hiddenCanvas.height = img.height;
    hiddenGraphicsContext.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    hiddenGraphicsContext.drawImage(img, 0, 0);

    return {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
      image: img,
      pixelMap: collisionDetector.buildPixelMap(hiddenCanvas)
    };
  }

  function drawSprite(sprite: Sprite) {
    g.drawImage(sprite.image, sprite.x, sprite.y);
  }

  function spritesCollide(sprite1: Sprite, sprite2: Sprite): boolean {
    return collisionDetector.hitTest(sprite1, sprite2);
  }




  ////////////////////
  // loading screen //
  ////////////////////

  function makeLoadingScreen(imageFiles: string[], makeNextScreen: () => GameScreen): GameScreen {
    return {
      load: () => {
        Promise.all(imageFiles.map(loadImage)).then(() => {
          loadGameScreen(makeNextScreen());
        });
      },
      unload: () => {},
      draw: () => {
        g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        g.font = "30px Arial";
        g.fillText("Loading...", gameCanvas.width / 2 - 50, gameCanvas.height / 2);
      }
    };
  }


  //////////////////
  // level screen //
  //////////////////

  // the first level has number 1
  var currentLevelNumber: number | null = null;

  function loadNextLevel() {
    currentLevelNumber = (currentLevelNumber || 0) + 1;

    // the first level is at index 0
    const level: Level | null = levels[currentLevelNumber-1];

    if (level) {
      loadGameScreen(makeLevelScreen(level));
    } else {
      loadGameScreen(endScreen);
    }
  }

  function makeLevelScreen(level: Level): GameScreen {
    return makeLoadingScreen(
      [level.backgroundFile].concat(level.spriteFiles),
      () => {
        const mouse = loadSprite("images/1px.png");
        const background = makeImage(level.backgroundFile);
        const sprites = level.spriteFiles.map(loadSprite);

        var currentSpriteNumber = 0;
        var loadedSpriteCount = 0;
        var picked: {
          sprite: Sprite,
          mouseX: number,
          mouseY: number,
          spriteX: number,
          spriteY: number
        } | null = null;

        function nextSprite(): Sprite | null {
          return sprites[loadedSpriteCount];
        }

        function loadNextSprite() {
          const sprite = nextSprite();

          if (sprite) {
            loadedSpriteCount++;
            currentSpriteNumber = loadedSpriteCount - 1;

            sprite.x = 390 - Math.round(sprite.width  / 2);
            sprite.y = 373 - Math.round(sprite.height / 2);
          } else {
            loadNextLevel();
          }
        }

        function pickSprite(event: MouseEvent) {
          mouse.x = event.offsetX;
          mouse.y = event.offsetY;

          for(var i=0; i<loadedSpriteCount; i++) {
            const sprite = sprites[i];
            if (spritesCollide(mouse, sprite)) {
              currentSpriteNumber = i;
              picked = {
                sprite: sprite,
                mouseX: mouse.x,
                mouseY: mouse.y,
                spriteX: sprite.x,
                spriteY: sprite.y
              };
            }
          }
        }

        function dragSprite(event: MouseEvent) {
          if (picked) {
            mouse.x = event.offsetX;
            mouse.y = event.offsetY;

            picked.sprite.x = mouse.x - picked.mouseX + picked.spriteX;
            picked.sprite.y = mouse.y - picked.mouseY + picked.spriteY;

            updateGameScreen();
          }
        }

        function moveSprite(event: KeyboardEvent) {
          const sprite = sprites[currentSpriteNumber];

          if      (event.key === "ArrowUp"    || event.key.toLowerCase() === "w") sprite.y -= event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowLeft"  || event.key.toLowerCase() === "a") sprite.x -= event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowDown"  || event.key.toLowerCase() === "s") sprite.y += event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") sprite.x += event.shiftKey ? 8 : 1;
          else if (event.key === "Enter" && !anySpritesCollide()) loadNextSprite();
          //else console.log(event.key);

          updateGameScreen();
        }

        function releaseSprite(event: MouseEvent) {
          picked = null;
        }

        function anySpritesCollide(): boolean {
          for(var i=0; i<loadedSpriteCount; i++) {
            for(var j=i+1; j<loadedSpriteCount; j++) {
              if (spritesCollide(sprites[i], sprites[j])) {
                return true;
              }
            }
          }

          return false;
        }

        return {
          load: () => {
            gameCanvas.addEventListener("mousedown", pickSprite);
            gameCanvas.addEventListener("mousemove", dragSprite);
            gameCanvas.addEventListener("mouseup", releaseSprite);
            window.addEventListener("keydown", moveSprite);

            loadNextSprite();
          },
          unload: () => {
            gameCanvas.removeEventListener("mousedown", pickSprite);
            gameCanvas.removeEventListener("mousemove", dragSprite);
            gameCanvas.removeEventListener("mouseup", releaseSprite);
            window.removeEventListener("keydown", moveSprite);
          },
          draw: () => {
            g.drawImage(background, 0, 0);

            if (anySpritesCollide()) {
              g.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
            }

            for(var i=0; i<loadedSpriteCount; i++) {
              const sprite = sprites[i];
              drawSprite(sprite);
            }
          }
        };
      }
    );
  }


  //////////////////
  // title screen //
  //////////////////

  const titleScreen: GameScreen = makeLoadingScreen(
    ["images/title.png"],
    () => {
      const titleImage = makeImage("images/title.png");

      return {
        load: () => {
          gameCanvas.addEventListener("mouseup", loadNextLevel);
          window.addEventListener("keyup", loadNextLevel);
        },
        unload: () => {
          gameCanvas.removeEventListener("mouseup", loadNextLevel);
          window.removeEventListener("keyup", loadNextLevel);
        },
        draw: () => {
          g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
          g.drawImage(titleImage, 0, 0);
        }
      };
    }
  );


  ////////////////
  // end screen //
  ////////////////

  const endScreen: GameScreen = makeLoadingScreen(
    ["images/the-end.png"],
    () => {
      const endImage = makeImage("images/the-end.png");

      return {
        load: () => {},
        unload: () => {},
        draw: () => {
          g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
          g.drawImage(endImage, 0, 0);
        }
      };
    }
  );


  //////////
  // main //
  //////////

  loadGameScreen(titleScreen);
};
