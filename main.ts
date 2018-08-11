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

// must be one of the images in the <div id="preloader">
function getPreloadedImage(imageFile: string): HTMLImageElement {
  const img = new Image();
  img.src = imageFile;
  return img;
}

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

function drawCenteredImage(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, width: number, height: number) {
  g.drawImage(img, x - width/2, y - height/2, width, height);
}

function drawImageInsideBox(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const centerX = x + width/2;
  const centerY = y + height/2;

  if (img.width <= width && img.height <= height) {
    // unscaled, centered
    drawCenteredImage(g, img, centerX, centerY, img.width, img.height);
  } else if (img.width / img.height >= width / height) {
    // scale width to fit
    drawCenteredImage(g, img, centerX, centerY, width, img.height * width / img.width);
  } else {
    // scale height to fit
    drawCenteredImage(g, img, centerX, centerY, img.width * height / img.height, height);
  }
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
        g.textAlign = "center";
        g.fillText("Loading...", gameCanvas.width / 2, gameCanvas.height / 2);
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
      ([background, [mouse, ...loadedSprites]]) => {
        const rabbitImages = [1,2,3,4].map(i => getPreloadedImage(`images/rabbit${i}.png`));
        const conflictImage = getPreloadedImage("images/controls.png");
        const movingOnImage = getPreloadedImage("images/controlsNext.png");

        var sprites: (Sprite | null)[] = loadedSprites;
        var spacebarsUsed = 0;
        var currentSpriteNumber = 0;
        var visibleSpriteCount = 0;
        var picked: {
          sprite: Sprite,
          mouseX: number,
          mouseY: number,
          spriteX: number,
          spriteY: number
        } | null = null;

        function giveSpriteAway() {
          if (spacebarsUsed < rabbitImages.length-1) {
            spacebarsUsed++;
            sprites[currentSpriteNumber] = null;
            addNextSprite();
          }
        }

        function selectAnotherSprite() {
          if (currentSpriteNumber == visibleSpriteCount - 1) {
            currentSpriteNumber = 0;
          } else {
            currentSpriteNumber++;
          }

          if (!sprites[currentSpriteNumber]) {
            selectAnotherSprite();
          } else {
            console.log(currentSpriteNumber);
          }
        }

        function findNextSprite(): Sprite | null {
          return sprites[visibleSpriteCount];
        }

        function addNextSprite() {
          const sprite = findNextSprite();

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
            if (sprite && spritesCollide(mouse, sprite)) {
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
          if (!sprite) return;

          var handled = true;

          if      (event.key === "ArrowUp"    || event.key.toLowerCase() === "w") sprite.y -= event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowLeft"  || event.key.toLowerCase() === "a") sprite.x -= event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowDown"  || event.key.toLowerCase() === "s") sprite.y += event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") sprite.x += event.shiftKey ? 8 : 1;
          else if (event.key === "Enter" && !anySpritesCollide()) addNextSprite();
          else if (event.key === " ") giveSpriteAway();
          else if (event.key === "Tab") {
            console.log("handling tab");
            selectAnotherSprite();
          }
          else {
            handled = false;
            //console.log(event.key);
          }

          if (handled) {
            event.stopPropagation();
            event.preventDefault();
          }

          updateGameScreen();
        }

        function releaseSprite(event: MouseEvent) {
          picked = null;
        }

        function anySpritesCollide(): boolean {
          for(var i=0; i<visibleSpriteCount; i++) {
            const spriteI = sprites[i];
            if (spriteI) {
              for(var j=i+1; j<visibleSpriteCount; j++) {
                const spriteJ = sprites[j];
                if (spriteJ) {
                  if (spritesCollide(spriteI, spriteJ)) {
                    return true;
                  }
                }
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

            for(var i=0; i<visibleSpriteCount; i++) {
              const sprite = sprites[i];
              if (sprite) {
                drawSprite(sprite);
              }
            }

            const nextSprite: Sprite | null = findNextSprite();
            if (nextSprite) {
              drawImageInsideBox(g, nextSprite.image, 778, 202, 240, 155);
            }

            const rabbitImage = rabbitImages[spacebarsUsed];
            g.drawImage(rabbitImage, 1050, 143);

            const collision = anySpritesCollide();
            const controlImage = collision ? conflictImage : movingOnImage;
            g.drawImage(controlImage, 768, 390);
          }
        };
      }
    );
  }


  //////////////////
  // title screen //
  //////////////////

  const titleScreen: GameScreen = makeLoadingScreen(
    () => Promise.all<HTMLImageElement, Sprite[]>(
      [
        loadImage("images/title.png"),
        loadSprites(["images/1px.png", "images/playButton.png", "images/storyButton.png"])
      ]
    ),
    ([bg, [mouse, playButton, storyButton]]) => {
      playButton.x = 30;
      playButton.y = 512;
      storyButton.x = 30;
      storyButton.y = 640;

      function displayStory() {
        alert("You're a hoarder");
      }

      function clickButton(event: MouseEvent) {
        mouse.x = event.offsetX;
        mouse.y = event.offsetY;

        if      (spritesCollide(mouse, playButton)) attachNextLevel();
        else if (spritesCollide(mouse, storyButton)) displayStory();
      }

      function typeButton(event: KeyboardEvent) {
        if (event.key === "Enter") attachNextLevel();
      }

      return {
        attach: () => {
          gameCanvas.addEventListener("mouseup", clickButton);
          window.addEventListener("keyup", typeButton);
        },
        detach: () => {
          gameCanvas.removeEventListener("mouseup", clickButton);
          window.removeEventListener("keyup", typeButton);
        },
        draw: () => {
          g.drawImage(bg, 0, 0);
          drawSprite(playButton);
          drawSprite(storyButton);
        }
      };
    }
  );


  ////////////////
  // end screen //
  ////////////////

  const endScreen: GameScreen = makeLoadingScreen(
    () => loadImage("images/the-end.png"),
    bg => {
      return {
        attach: () => {},
        detach: () => {},
        draw: () => {
          g.drawImage(bg, 0, 0);
        }
      };
    }
  );


  //////////
  // main //
  //////////

  attachGameScreen(titleScreen);
};
