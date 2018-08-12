///////////
// error //
///////////

function error<A>(msg: string): A {
  throw new Error(msg);
}


////////////
// Canvas //
////////////

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return canvas.getContext("2d") || error("canvas has no 2D context");
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


//////////////
// PixelMap //
//////////////

type PixelMap = (x: number, y: number) => boolean;

function loadPixelMapFromCanvas(canvas: HTMLCanvasElement) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = getCanvasContext(canvas).getImageData(0, 0, width, height).data;
  return (x: number, y: number) => imageData[ y * width * 4 + x * 4 + 3 ] == 255;
}

function pixelMapAt(pixelMap: PixelMap, x: number, y: number): PixelMap {
  return (i, j) => pixelMap(i-x, j-y);
}

function pixelMapContainsPoint(pixelMap: PixelMap, x: number, y: number): boolean {
  return pixelMap(x, y);
}

function pixelMapCollidesWithBounds(pixelMap: PixelMap, left: number, top: number, right: number, bottom: number): boolean {
  for(var x=left; x<right; x++) {
    for(var y=top; y<bottom; y++) {
      if (pixelMap(x, y)) {
        return true;
      }
    }
  }

  return false;
}

function pixelMapsCollideInsideBounds(pixelMap1: PixelMap, pixelMap2: PixelMap, left: number, top: number, right: number, bottom: number): boolean {
  for(var x=left; x<right; x++) {
    for(var y=top; y<bottom; y++) {
      if (pixelMap1(x, y) && pixelMap2(x, y)) {
        return true;
      }
    }
  }

  return false;
}


///////////////////////
// sprite collisions //
///////////////////////

type Sprite = {
  x: number,
  y: number,
  width: number,
  height: number,
  image: HTMLImageElement,
  pixelMap: PixelMap
};

function spritePixelMap(sprite: Sprite): PixelMap {
  return pixelMapAt(sprite.pixelMap, sprite.x, sprite.y);
}

function spriteContainsPoint(sprite: Sprite, x: number, y: number) {
  if (x < sprite.x || x >= sprite.x + sprite.width || y < sprite.y || y >= sprite.y + sprite.height) {
    return false;
  } else {
    return pixelMapContainsPoint(spritePixelMap(sprite), x, y);
  }
}

function spriteCollidesWithBounds(sprite: Sprite, left: number, top: number, right: number, bottom: number): boolean {
  const spriteLeft   = sprite.x;
  const spriteTop    = sprite.y;
  const spriteRight  = sprite.x + sprite.width;
  const spriteBottom = sprite.y + sprite.height;

  if (spriteLeft > right || spriteRight < left || spriteTop > bottom || spriteBottom < top) {
    return false;
  } else {
    return pixelMapCollidesWithBounds(
      spritePixelMap(sprite),
      Math.max(spriteLeft,   left),
      Math.max(spriteTop,    top),
      Math.min(spriteRight,  right),
      Math.min(spriteBottom, bottom)
    );
  }
}

function spritesCollide(sprite1: Sprite, sprite2: Sprite): boolean {
  const sprite1Left   = sprite1.x;
  const sprite1Top    = sprite1.y;
  const sprite1Right  = sprite1.x + sprite1.width;
  const sprite1Bottom = sprite1.y + sprite1.height;

  const sprite2Left   = sprite2.x;
  const sprite2Top    = sprite2.y;
  const sprite2Right  = sprite2.x + sprite2.width;
  const sprite2Bottom = sprite2.y + sprite2.height;


  if (sprite1Left > sprite2Right || sprite1Right < sprite2Left || sprite1Top > sprite2Bottom || sprite1Bottom < sprite2Top) {
    return false;
  } else {
    return pixelMapsCollideInsideBounds(
      spritePixelMap(sprite1),
      spritePixelMap(sprite2),
      Math.max(sprite1Left,   sprite2Left),
      Math.max(sprite1Top,    sprite2Top),
      Math.min(sprite1Right,  sprite2Right),
      Math.min(sprite1Bottom, sprite2Bottom)
    );
  }
}


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


  ////////////////////////////////
  // sprite loading and drawing //
  ////////////////////////////////

  function loadSpriteFromImage(img: HTMLImageElement): Promise<Sprite> {
    return new Promise((resolve, reject) => {
      hiddenCanvas.width  = img.width;
      hiddenCanvas.height = img.height;
      hiddenGraphicsContext.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
      hiddenGraphicsContext.drawImage(img, 0, 0);

      // let the browser draw the image before we attempt to read it back
      setTimeout(() => {
        const pixelMap = loadPixelMapFromCanvas(hiddenCanvas);
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
          loadSprites(level.spriteFiles)
        ]
      ),
      ([background, loadedSprites]) => {
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

        function hoverOverSprite(event: MouseEvent) {
          console.log("hovering");
          const mouseX = event.offsetX;
          const mouseY = event.offsetY;

          for(var i=0; i<visibleSpriteCount; i++) {
            const sprite = sprites[i];
            if (sprite && spriteContainsPoint(sprite, mouseX, mouseY)) {
              gameCanvas.setAttribute("style", "cursor: move; cursor: grab; cursor:-moz-grab; cursor:-webkit-grab;");

              return;
            }
          }

          gameCanvas.setAttribute("style", "cursor: default;");
        }

        function pickSprite(event: MouseEvent) {
          const mouseX = event.offsetX;
          const mouseY = event.offsetY;

          for(var i=0; i<visibleSpriteCount; i++) {
            const sprite = sprites[i];
            if (sprite && spriteContainsPoint(sprite, mouseX, mouseY)) {
              gameCanvas.setAttribute("style", "cursor: move; cursor: grabbing; cursor:-moz-grabbing; cursor:-webkit-grabbing;");
              currentSpriteNumber = i;
              picked = {
                sprite: sprite,
                mouseX: mouseX,
                mouseY: mouseY,
                spriteX: sprite.x,
                spriteY: sprite.y
              };

              return;
            }
          }
        }

        function dragSprite(event: MouseEvent) {
          if (picked) {
            const mouseX = event.offsetX;
            const mouseY = event.offsetY;

            picked.sprite.x = mouseX - picked.mouseX + picked.spriteX;
            picked.sprite.y = mouseY - picked.mouseY + picked.spriteY;

            updateGameScreen();
          } else {
            hoverOverSprite(event);
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
          if (picked) {
            gameCanvas.setAttribute("style", "cursor: move; cursor: grab; cursor:-moz-grab; cursor:-webkit-grab;");
            picked = null;
          }
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
        loadSprites(["images/playButton.png", "images/storyButton.png"])
      ]
    ),
    ([bg, [playButton, storyButton]]) => {
      playButton.x = 30;
      playButton.y = 512;
      storyButton.x = 30;
      storyButton.y = 640;

      function displayStory() {
        attachGameScreen(storyScreen);
      }

      function hoverOverButton(event: MouseEvent) {
        const mouseX = event.offsetX;
        const mouseY = event.offsetY;

        if (spriteContainsPoint(playButton, mouseX, mouseY) || spriteContainsPoint(storyButton, mouseX, mouseY)) {
          gameCanvas.setAttribute("style", "cursor: pointer;");
        } else {
          gameCanvas.setAttribute("style", "cursor: default;");
        }
      }

      function clickButton(event: MouseEvent) {
        const mouseX = event.offsetX;
        const mouseY = event.offsetY;

        if (spriteContainsPoint(playButton,  mouseX, mouseY)) {
          gameCanvas.setAttribute("style", "cursor: default;");
          attachNextLevel();
        } else if (spriteContainsPoint(storyButton, mouseX, mouseY)) {
          gameCanvas.setAttribute("style", "cursor: default;");
          displayStory();
        }
      }

      function typeButton(event: KeyboardEvent) {
        if (event.key === "Enter") attachNextLevel();
      }

      return {
        attach: () => {
          gameCanvas.addEventListener("mousemove", hoverOverButton);
          gameCanvas.addEventListener("mouseup", clickButton);
          window.addEventListener("keyup", typeButton);
        },
        detach: () => {
          gameCanvas.removeEventListener("mousemove", hoverOverButton);
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


  //////////////////
  // story screen //
  //////////////////

  const storyScreen: GameScreen = makeLoadingScreen(
    () => loadImage("images/story.png"),
    bg => {
      function returnToTitleScreen() {
        attachGameScreen(titleScreen);
      }

      return {
        attach: () => {
          gameCanvas.addEventListener("mouseup", returnToTitleScreen);
          window.addEventListener("keyup", returnToTitleScreen);
        },
        detach: () => {
          gameCanvas.removeEventListener("mouseup", returnToTitleScreen);
          window.removeEventListener("keyup", returnToTitleScreen);
        },
        draw: () => {
          g.drawImage(bg, 0, 0);
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
