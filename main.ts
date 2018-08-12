///////////
// error //
///////////

function error<A>(msg: string): A {
  throw new Error(msg);
}


//////////////
// infinity //
//////////////

const positiveInfinity = 1.0 / 0.0;
const negativeInfinity = -positiveInfinity;


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

type Point = {x: number, y: number};
type PixelMap = (x: number, y: number) => boolean;

function makePixelMapFromCanvas(canvas: HTMLCanvasElement) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = getCanvasContext(canvas).getImageData(0, 0, width, height).data;
  return (x: number, y: number) => (
    x >= 0 &&
    x < width &&
    y >= 0 &&
    y < height &&
    imageData[ y * width * 4 + x * 4 + 3 ] == 255
  );
}

function pixelMapContainsPoint(pixelMap: PixelMap, x: number, y: number): boolean {
  return pixelMap(x, y);
}

function pixelMapIntersectsWithBounds(pixelMap: PixelMap, left: number, top: number, right: number, bottom: number, callback: (x: number, y: number) => void) {
  for(var x=left; x<right; x++) {
    for(var y=top; y<bottom; y++) {
      if (pixelMap(x, y)) {
        callback(x, y);
      }
    }
  }
}

function pixelMapsIntersectInsideBounds(pixelMap1: PixelMap, pixelMap2: PixelMap, left: number, top: number, right: number, bottom: number, callback: (x: number, y: number) => void) {
  for(var x=left; x<right; x++) {
    for(var y=top; y<bottom; y++) {
      if (pixelMap1(x, y) && pixelMap2(x, y)) {
        callback(x, y);
      }
    }
  }
}


///////////////////////
// sprite collisions //
///////////////////////

type Sprite = {
  x: number, // top-left
  y: number,
  width: number,
  height: number,
  image: HTMLImageElement,
  localPixelMap: PixelMap  // doesn't change when sprite.x and sprite.y do
};

function spritePixelMap(sprite: Sprite): PixelMap {
  return (x: number, y: number) => sprite.localPixelMap(x - sprite.x, y - sprite.y);
}

function spriteContainsPoint(sprite: Sprite, x: number, y: number): boolean {
  if (x < sprite.x || x >= sprite.x + sprite.width || y < sprite.y || y >= sprite.y + sprite.height) {
    return false;
  } else {
    return pixelMapContainsPoint(spritePixelMap(sprite), x, y);
  }
}

function spriteIntersectsWithBounds(sprite: Sprite, left: number, top: number, right: number, bottom: number, callback: (x: number, y: number) => void) {
  const spriteLeft   = sprite.x;
  const spriteTop    = sprite.y;
  const spriteRight  = sprite.x + sprite.width;
  const spriteBottom = sprite.y + sprite.height;

  if (spriteLeft > right || spriteRight < left || spriteTop > bottom || spriteBottom < top) {
    return;
  } else {
    return pixelMapIntersectsWithBounds(
      spritePixelMap(sprite),
      Math.max(spriteLeft,   left),
      Math.max(spriteTop,    top),
      Math.min(spriteRight,  right),
      Math.min(spriteBottom, bottom),
      callback
    );
  }
}

function spriteIntersectsOutsideBounds(sprite: Sprite, left: number, top: number, right: number, bottom: number, callback: (x: number, y: number) => void) {
  const spriteLeft   = sprite.x;
  const spriteTop    = sprite.y;
  const spriteRight  = sprite.x + sprite.width;
  const spriteBottom = sprite.y + sprite.height;

  if (spriteLeft > left && spriteTop > top && spriteLeft < left && spriteBottom < bottom) {
    return;
  } else {
    spriteIntersectsWithBounds(sprite, negativeInfinity, negativeInfinity, left, positiveInfinity, callback);
    spriteIntersectsWithBounds(sprite, negativeInfinity, negativeInfinity, positiveInfinity, top, callback);
    spriteIntersectsWithBounds(sprite, right, negativeInfinity, positiveInfinity, positiveInfinity, callback);
    spriteIntersectsWithBounds(sprite, negativeInfinity, bottom, positiveInfinity, positiveInfinity, callback);
  }
}

function spritesIntersect(sprite1: Sprite, sprite2: Sprite, callback: (x: number, y: number) => void) {
  const sprite1Left   = sprite1.x;
  const sprite1Top    = sprite1.y;
  const sprite1Right  = sprite1.x + sprite1.width;
  const sprite1Bottom = sprite1.y + sprite1.height;

  const sprite2Left   = sprite2.x;
  const sprite2Top    = sprite2.y;
  const sprite2Right  = sprite2.x + sprite2.width;
  const sprite2Bottom = sprite2.y + sprite2.height;


  if (sprite1Left > sprite2Right || sprite1Right < sprite2Left || sprite1Top > sprite2Bottom || sprite1Bottom < sprite2Top) {
    return;
  } else {
    pixelMapsIntersectInsideBounds(
      spritePixelMap(sprite1),
      spritePixelMap(sprite2),
      Math.max(sprite1Left,   sprite2Left),
      Math.max(sprite1Top,    sprite2Top),
      Math.min(sprite1Right,  sprite2Right),
      Math.min(sprite1Bottom, sprite2Bottom),
      callback
    );
  }
}


/////////////////////////////////
// rotatable sprite collisions //
/////////////////////////////////

type RSprite = {
  x: number, // center
  y: number,
  radius: number,
  rotation: number, // degrees, clockwise
  localSprite: Sprite, // doesn't change when rsprite.x, rsprite.y, and rsprite.rotation do
};

function makeRSpriteFromSprite(sprite: Sprite): RSprite {
  return {
    x: sprite.x + Math.round(sprite.width / 2),
    y: sprite.y + Math.round(sprite.height / 2),
    radius: Math.sqrt(sprite.width*sprite.width + sprite.height*sprite.height) / 2,
    rotation: 0,
    localSprite: sprite
  };
}

function rspriteSprite(rsprite: RSprite): Sprite {
  return {
    x: Math.round(rsprite.x - rsprite.radius),
    y: Math.round(rsprite.y - rsprite.radius),
    width:  Math.round(rsprite.radius * 2),
    height: Math.round(rsprite.radius * 2),
    image: rsprite.localSprite.image,
    localPixelMap: (x: number, y: number) => {
      const relX = x - rsprite.radius;
      const relY = rsprite.radius - y; // +Y up

      const rad = rsprite.rotation * Math.PI / 180;
      const rotX = Math.cos(rad) * relX - Math.sin(rad) * relY;
      const rotY = Math.sin(rad) * relX + Math.cos(rad) * relY;

      const absX = Math.round(rsprite.localSprite.width / 2 + rotX);
      const absY = Math.round(rsprite.localSprite.height / 2 - rotY);  // +Y down

      return rsprite.localSprite.localPixelMap(absX, absY);
    }
  };
}

function rspriteContainsPoint(rsprite: RSprite, x: number, y: number) {
  const dx = x - rsprite.x;
  const dy = y - rsprite.y;
  const r = rsprite.radius;

  if (dx*dx + dy*dy > r*r) {
    return false;
  } else {
    return spriteContainsPoint(rspriteSprite(rsprite), x, y);
  }
}

function rspriteIntersectsWithBounds(rsprite: RSprite, left: number, top: number, right: number, bottom: number, callback: (x: number, y: number) => void) {
  spriteIntersectsWithBounds(rspriteSprite(rsprite), left, top, right, bottom, callback);
}

function rspriteIntersectsOutsideBounds(rsprite: RSprite, left: number, top: number, right: number, bottom: number, callback: (x: number, y: number) => void) {
  spriteIntersectsOutsideBounds(rspriteSprite(rsprite), left, top, right, bottom, callback);
}

function rspritesIntersect(rsprite1: RSprite, rsprite2: RSprite, callback: (x: number, y: number) => void) {
  const dx = rsprite2.x - rsprite1.x;
  const dy = rsprite2.y - rsprite1.y;
  const r = rsprite1.radius + rsprite2.radius;

  if (dx*dx + dy*dy > r*r) {
    return;
  } else {
    spritesIntersect(
      rspriteSprite(rsprite1),
      rspriteSprite(rsprite2),
      callback
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
};

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
        const pixelMap = makePixelMapFromCanvas(hiddenCanvas);
        resolve({
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
          image: img,
          localPixelMap: pixelMap
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

  function drawRSprite(rsprite: RSprite) {
    g.save();
    g.translate(rsprite.x, rsprite.y);
    g.rotate(rsprite.rotation * Math.PI / 180);
    g.drawImage(rsprite.localSprite.image, -rsprite.localSprite.width / 2, -rsprite.localSprite.height / 2);
    g.restore();
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
        g.fillStyle="#000000";
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
        const controlsImage = getPreloadedImage("images/controls.png");
        const movingOnImage = getPreloadedImage("images/controlsNext.png");
        const enterDisabledImage = getPreloadedImage("images/enterDisabled.png");
        const spaceDisabledImage = getPreloadedImage("images/spaceDisabled.png");

        var items: (RSprite | null)[] = loadedSprites.map(makeRSpriteFromSprite);
        var spacebarsUsed = 0;
        var currentItemNumber = 0;
        var visibleItemCount = 0;
        var picked: {
          item: RSprite,
          mouseX: number,
          mouseY: number,
          itemX: number,
          itemY: number
        } | null = null;
        var collisions: Point[] | null = null;
        var collisionFinder: number | null = null;

        function clearCollisions() {
          if (collisionFinder != null) clearTimeout(collisionFinder);
        }

        function resetCollisions() {
          collisions = null;

          clearCollisions();
          collisionFinder = setTimeout(findCollisions);
        }

        //function anyItemsCollide(): boolean {
        //  for(var i=0; i<visibleItemCount; i++) {
        //    const itemI = items[i];
        //    if (itemI) {
        //      if (!rspriteFitsInsideBounds(itemI, 54, 54, 725, 725)) {
        //        return true;
        //      }
        //
        //      for(var j=i+1; j<visibleItemCount; j++) {
        //        const itemJ = items[j];
        //        if (itemJ) {
        //          if (rspritesCollide(itemI, itemJ)) {
        //            return true;
        //          }
        //        }
        //      }
        //    }
        //  }
        //
        //  return false;
        //}

        // a version of anyItemsCollide which repeatedly calls setTimeout so we
        // don't block the UI, and also finds all the collision points, not just
        // whether there is a collision.
        function findCollisions() {
          var collisionPoints: Point[] = [];

          function addCollisionPoint(x: number, y: number) {
            collisionPoints.push({x,y});
          }

          function outerLoop(i: number) {
            if (i < visibleItemCount) {
              const itemI = items[i];
              if (itemI) {
                rspriteIntersectsOutsideBounds(itemI, 54, 54, 725, 725, addCollisionPoint);
                collisionFinder = setTimeout(() => innerLoop(i, itemI, i+1));
                return;
              }
            }

            collisions = collisionPoints;
            collisionFinder = null;
            updateGameScreen();
          }

          function innerLoop(i: number, itemI: RSprite, j: number) {
            if (j < visibleItemCount) {
              const itemJ = items[j];
              if (itemJ) {
                rspritesIntersect(itemI, itemJ, addCollisionPoint);
                collisionFinder = setTimeout(() => innerLoop(i, itemI, j+1));
                return;
              }
            }

            collisionFinder = setTimeout(() => outerLoop(i+1));
          }

          collisionFinder = setTimeout(() => outerLoop(0));
        }

        function giveItemAway() {
          if (spacebarsUsed < rabbitImages.length-1) {
            spacebarsUsed++;
            items[currentItemNumber] = null;
            addNextItem();
          }
        }

        function selectAnotherItem() {
          if (currentItemNumber == visibleItemCount - 1) {
            currentItemNumber = 0;
          } else {
            currentItemNumber++;
          }

          if (!items[currentItemNumber]) {
            selectAnotherItem();
          }
        }

        function findNextItem(): RSprite | null {
          return items[visibleItemCount];
        }

        function addNextItem() {
          gameCanvas.setAttribute("style", "cursor: default;");

          const item = findNextItem();
          if (item) {
            visibleItemCount++;
            currentItemNumber = visibleItemCount - 1;

            item.x = 390;
            item.y = 373;

            resetCollisions();
          } else {
            attachNextLevel();
          }
        }

        function hoverOverItem(event: MouseEvent) {
          const mouseX = event.offsetX;
          const mouseY = event.offsetY;

          for(var i=0; i<visibleItemCount; i++) {
            const item = items[i];
            if (item && rspriteContainsPoint(item, mouseX, mouseY)) {
              gameCanvas.setAttribute("style", "cursor: move; cursor: grab; cursor:-moz-grab; cursor:-webkit-grab;");

              return;
            }
          }

          gameCanvas.setAttribute("style", "cursor: default;");
        }

        function pickItem(event: MouseEvent) {
          const mouseX = event.offsetX;
          const mouseY = event.offsetY;

          for(var i=0; i<visibleItemCount; i++) {
            const item = items[i];
            if (item && rspriteContainsPoint(item, mouseX, mouseY)) {
              gameCanvas.setAttribute("style", "cursor: move; cursor: grabbing; cursor:-moz-grabbing; cursor:-webkit-grabbing;");
              currentItemNumber = i;
              picked = {
                item: item,
                mouseX: mouseX,
                mouseY: mouseY,
                itemX: item.x,
                itemY: item.y
              };

              return;
            }
          }
        }

        function dragItem(event: MouseEvent) {
          if (picked) {
            const mouseX = event.offsetX;
            const mouseY = event.offsetY;

            picked.item.x = mouseX - picked.mouseX + picked.itemX;
            picked.item.y = mouseY - picked.mouseY + picked.itemY;

            resetCollisions();
            updateGameScreen();
          } else {
            hoverOverItem(event);
          }
        }

        function moveItem(event: KeyboardEvent) {
          const item = items[currentItemNumber];
          if (!item) return;

          var handled = true;

          if      (event.key === "ArrowUp"    || event.key.toLowerCase() === "w") item.y -= event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowLeft"  || event.key.toLowerCase() === "a") item.x -= event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowDown"  || event.key.toLowerCase() === "s") item.y += event.shiftKey ? 8 : 1;
          else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") item.x += event.shiftKey ? 8 : 1;
          else if (event.key === "PageUp"     || event.key.toLowerCase() === "q") item.rotation -= event.shiftKey ? 40 : 1;
          else if (event.key === "PageDown"   || event.key.toLowerCase() === "e") item.rotation += event.shiftKey ? 40 : 1;
          else if (event.key === "Enter" && collisions && collisions.length === 0) addNextItem();
          else if (event.key === " ") giveItemAway();
          else if (event.key === "Tab") {
            selectAnotherItem();
          }
          else {
            handled = false;
            //console.log(event.key);
          }

          if (handled) {
            event.stopPropagation();
            event.preventDefault();
            resetCollisions();
            updateGameScreen();
          }
        }

        function releaseItem(event: MouseEvent) {
          if (picked) {
            gameCanvas.setAttribute("style", "cursor: move; cursor: grab; cursor:-moz-grab; cursor:-webkit-grab;");
            picked = null;
          }
        }

        return {
          attach: () => {
            gameCanvas.addEventListener("mousedown", pickItem);
            gameCanvas.addEventListener("mousemove", dragItem);
            gameCanvas.addEventListener("mouseup", releaseItem);
            window.addEventListener("keydown", moveItem);

            addNextItem();
            addNextItem();
          },
          detach: () => {
            gameCanvas.removeEventListener("mousedown", pickItem);
            gameCanvas.removeEventListener("mousemove", dragItem);
            gameCanvas.removeEventListener("mouseup", releaseItem);
            window.removeEventListener("keydown", moveItem);
            clearCollisions();
          },
          draw: () => {
            g.drawImage(background, 0, 0);

            const nextItem: RSprite | null = findNextItem();
            if (nextItem) {
              drawImageInsideBox(g, nextItem.localSprite.image, 778, 202, 240, 155);
            }

            const rabbitImage = rabbitImages[spacebarsUsed];
            g.drawImage(rabbitImage, 1050, 143);

            const helpImage = (collisions && collisions.length === 0 && findNextItem() === null) ? movingOnImage : controlsImage;
            g.drawImage(helpImage, 768, 390);

            if (spacebarsUsed == rabbitImages.length - 1) {
              g.drawImage(spaceDisabledImage, 1034, 628);
            }
            if (collisions === null || collisions.length !== 0) {
              g.drawImage(enterDisabledImage, 1169, 475);
            }

            for(var i=0; i<visibleItemCount; i++) {
              if (i != currentItemNumber) {
                const item = items[i];
                if (item) drawRSprite(item);
              }
            }

            const item = items[currentItemNumber];
            if (item) drawRSprite(item);

            if (collisions !== null) {
              g.fillStyle="#FF0000C0";
              collisions.forEach(({x,y}) => {
                g.fillRect(x, y, 1, 1);
              });
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

  const preloadingScreen = document.getElementById("preloadingScreen");
  if (preloadingScreen) {
    const parentNode = preloadingScreen.parentNode;
    if (parentNode) {
      parentNode.removeChild(preloadingScreen);
    }
  }

  attachGameScreen(titleScreen);
};
