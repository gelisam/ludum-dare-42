///////////
// error //
///////////

function error<A>(msg: string): A {
  throw new Error(msg);
}


//////////////
// Promises //
//////////////

const sequencePromises : <A,B>(loadB: (input: A) => Promise<B>) => (inputs: A[]) => Promise<B[]>
                       = <A,B>(loadB: (input: A) => Promise<B>) => (inputs: A[]) =>
{
  if (inputs.length == 0) {
    return Promise.resolve([]);
  } else {
    return loadB(inputs[0]).then(output => {
      return sequencePromises(loadB)(inputs.slice(1)).then(outputs => {
        return [output].concat(outputs);
      });
    });
  }
}


///////////
// Image //
///////////

function loadImage(imageFile: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.addEventListener("load", () => {
      resolve(img)
    });
    img.addEventListener("error", () => {
      reject(new Error("Failed to load image " + imageFile));
    });

    img.src = imageFile;
  });
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
  attach: () => void,
  draw: () => void,
  detach: () => void
};

var currentGameScreen: GameScreen | null = null;

function attachGameScreen(gameScreen: GameScreen) {
  if (currentGameScreen) currentGameScreen.detach();

  currentGameScreen = gameScreen;
  currentGameScreen.attach();
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

  function loadSpriteFromImage(img: HTMLImageElement): Promise<Sprite> {
    return new Promise((resolve, reject) => {
      hiddenCanvas.width  = img.width;
      hiddenCanvas.height = img.height;
      hiddenGraphicsContext.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
      hiddenGraphicsContext.drawImage(img, 0, 0);

      // let the browser draw the image before we attempt to read it back
      setTimeout(() => {
        const pixelMap = collisionDetector.buildPixelMap(hiddenCanvas);
        resolve({
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
          image: img,
          pixelMap: pixelMap
        });
      });
    });
  }

  function loadSprite(spriteFile: string): Promise<Sprite> {
    return loadImage(spriteFile).then(loadSpriteFromImage);
  }

  // don't use Promise.all(spriteFiles.map(loadSprite)), or all the promises
  // will try to use the hiddenCanvas at the same time.
  function loadSprites(spriteFiles: string[]): Promise<Sprite[]> {
    return Promise.all(spriteFiles.map(loadImage)).then(sequencePromises(loadSpriteFromImage));
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

  function makeLoadingScreen<A>(makePromise: () => Promise<A>, makeNextScreen: (result: A) => GameScreen): GameScreen {
    return {
      attach: () => {
        makePromise().then(result => {
          attachGameScreen(makeNextScreen(result));
        });
      },
      detach: () => {},
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

  function attachNextLevel() {
    currentLevelNumber = (currentLevelNumber || 0) + 1;

    // the first level is at index 0
    const level: Level | null = levels[currentLevelNumber-1];

    if (level) {
      attachGameScreen(makeLevelScreen(level));
    } else {
      attachGameScreen(endScreen);
    }
  }

  function makeLevelScreen(level: Level): GameScreen {
    return makeLoadingScreen(
      () => Promise.all<HTMLImageElement, Sprite[]>(
        [
          loadImage(level.backgroundFile),
          loadSprites(["images/1px.png"].concat(level.spriteFiles))
        ]
      ),
      ([background, [mouse, ...sprites]]) => {
        var currentSpriteNumber = 0;
        var visibleSpriteCount = 0;
        var picked: {
          sprite: Sprite,
          mouseX: number,
          mouseY: number,
          spriteX: number,
          spriteY: number
        } | null = null;

        function nextSprite(): Sprite | null {
          return sprites[visibleSpriteCount];
        }

        function addNextSprite() {
          const sprite = nextSprite();

          if (sprite) {
            visibleSpriteCount++;
            currentSpriteNumber = visibleSpriteCount - 1;

            sprite.x = 390 - Math.round(sprite.width  / 2);
            sprite.y = 373 - Math.round(sprite.height / 2);
          } else {
            attachNextLevel();
          }
        }

        function pickSprite(event: MouseEvent) {
          mouse.x = event.offsetX;
          mouse.y = event.offsetY;

          for(var i=0; i<visibleSpriteCount; i++) {
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
          else if (event.key === "Enter" && !anySpritesCollide()) addNextSprite();
          //else console.log(event.key);

          updateGameScreen();
        }

        function releaseSprite(event: MouseEvent) {
          picked = null;
        }

        function anySpritesCollide(): boolean {
          for(var i=0; i<visibleSpriteCount; i++) {
            for(var j=i+1; j<visibleSpriteCount; j++) {
              if (spritesCollide(sprites[i], sprites[j])) {
                return true;
              }
            }
          }

          return false;
        }

        return {
          attach: () => {
            gameCanvas.addEventListener("mousedown", pickSprite);
            gameCanvas.addEventListener("mousemove", dragSprite);
            gameCanvas.addEventListener("mouseup", releaseSprite);
            window.addEventListener("keydown", moveSprite);

            addNextSprite();
          },
          detach: () => {
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

            for(var i=0; i<visibleSpriteCount; i++) {
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
    () => loadImage("images/title.png"),
    img => {
      return {
        attach: () => {
          gameCanvas.addEventListener("mouseup", attachNextLevel);
          window.addEventListener("keyup", attachNextLevel);
        },
        detach: () => {
          gameCanvas.removeEventListener("mouseup", attachNextLevel);
          window.removeEventListener("keyup", attachNextLevel);
        },
        draw: () => {
          g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
          g.drawImage(img, 0, 0);
        }
      };
    }
  );


  ////////////////
  // end screen //
  ////////////////

  const endScreen: GameScreen = makeLoadingScreen(
    () => loadImage("images/the-end.png"),
    img => {
      return {
        attach: () => {},
        detach: () => {},
        draw: () => {
          g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
          g.drawImage(img, 0, 0);
        }
      };
    }
  );


  //////////
  // main //
  //////////

  attachGameScreen(titleScreen);
};
