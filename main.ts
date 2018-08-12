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


//////////////
// tweening //
//////////////

// the normal range for the input and the output is between 0.0 and 1.0
type Tween = (t: number) => number;

const linear: Tween = (t: number) => t;

const smoothStart: Tween = (t: number) => t*t;

const arch: Tween = (t: number) => t*(1-t)*4;

function falling(tween: Tween): Tween {
  return (t: number) => 1 - tween(t);
}

function scaled(s: number, tween: Tween): Tween {
  return (t: number) => s * tween(t);
}

function piecewise(pieces: [number, Tween][]): Tween {
  return (t: number) => {
    for(var i=0; i<pieces.length; i++) {
      const [duration, tween] = pieces[i];
      if (i == pieces.length - 1 || t <= duration) {
        return tween(t / duration);
      } else {
        t -= duration;
      }
    }

    return error("unreachable");
  };
}

const fallDownBouncing: Tween = piecewise([
  [0.7, falling(smoothStart)],
  [0.2, scaled(0.05, arch)],
  [0.1, scaled(0.01, arch)]
]);


////////////
// Canvas //
////////////

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return canvas.getContext("2d") || error("canvas has no 2D context");
}


//////////////
// Promises //
//////////////

function delay(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

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

function drawScaledCenteredImage(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, width: number, height: number) {
  g.drawImage(img, x - width/2, y - height/2, width, height);
}

function drawCenteredImage(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number) {
  drawScaledCenteredImage(g, img, x, y, img.width, img.height);
}

function drawImageInsideBox(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const centerX = x + width/2;
  const centerY = y + height/2;

  if (img.width <= width && img.height <= height) {
    // unscaled, centered
    drawScaledCenteredImage(g, img, centerX, centerY, img.width, img.height);
  } else if (img.width / img.height >= width / height) {
    // scale width to fit
    drawScaledCenteredImage(g, img, centerX, centerY, width, img.height * width / img.width);
  } else {
    // scale height to fit
    drawScaledCenteredImage(g, img, centerX, centerY, img.width * height / img.height, height);
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
    imageData[ y * width * 4 + x * 4 + 3 ] > 128
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


  //////////////////////
  // fading-in effect //
  //////////////////////

  function fadeInto(gameScreen: GameScreen): GameScreen {
    var fadeAmount = 1.0;
    var animationRequest: number | null = null;

    return {
      attach: () => {
        fadeAmount = 1.0;
        gameScreen.attach();
      },
      detach: () => {
        gameScreen.detach();
        if (animationRequest !== null) window.cancelAnimationFrame(animationRequest);
      },
      draw: () => {
        gameScreen.draw();

        if (fadeAmount > 0) {
          g.fillStyle = "rgba(255, 255, 255, " + fadeAmount + ")";
          g.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

          fadeAmount -= 0.04;
          animationRequest = window.requestAnimationFrame(updateGameScreen);
        } else {
          animationRequest = null;
        }
      }
    };
  }


  ////////////////////
  // loading screen //
  ////////////////////

  function makeLoadingScreen<A>(makePromise: () => Promise<A>, makeNextScreen: (result: A) => GameScreen): GameScreen {
    var fadingOut = true;
    var animationRequest: number | null = null;

    return {
      attach: () => {
        fadingOut = true;
        Promise.all(
          [
            delay(500).then(() => {
              fadingOut = false;
            }),
            makePromise()
          ]
        ).then(([_, result]) => {
          attachGameScreen(fadeInto(makeNextScreen(result)));
        });
      },
      detach: () => {
        if (animationRequest !== null) window.cancelAnimationFrame(animationRequest);
      },
      draw: () => {
        if (fadingOut) {
          g.fillStyle = "#FFFFFF20";
          g.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
          animationRequest = window.requestAnimationFrame(updateGameScreen);
        } else {
          g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
          g.font = "30px Arial";
          g.textAlign = "center";
          g.fillStyle = "#000000";
          g.fillText("Loading...", gameCanvas.width / 2, gameCanvas.height / 2);
          animationRequest = null;
        }
      }
    };
  }


  //////////////////
  // level screen //
  //////////////////

  // the first level has number 1
  function attachLevel(levelNumber: number, spacebarsUsed: number) {
    // the first level is at index 0
    const level: Level | null = levels[levelNumber-1] || null;

    if (level) {
      attachGameScreen(makeLevelScreen(levelNumber, level, spacebarsUsed));
    } else if (spacebarsUsed === 3) {
      attachGameScreen(badEndingScreen);
    } else {
      attachGameScreen(goodEndingScreen);
    }
  }

  function makeLevelScreen(levelNumber: number, level: Level, initialSpacebarsUsed: number): GameScreen {
    return makeLoadingScreen(
      () => Promise.all<HTMLImageElement, Sprite[]>(
        [
          loadImage(level.backgroundFile),
          loadSprites(level.spriteFiles)
        ]
      ),
      ([background, loadedSprites]) => {
        const rabbitImages   = [1,2,3,4].map(i => getPreloadedImage(`images/rabbit${i}.png`));
        const responseImages = [1,2,3,4].map(i => getPreloadedImage(`images/give${i}.png`));
        const controlsImage = getPreloadedImage("images/controls.png");
        const movingOnImage = getPreloadedImage("images/controlsNext.png");
        const enterDisabledImage = getPreloadedImage("images/enterDisabled.png");
        const spaceDisabledImage = getPreloadedImage("images/spaceDisabled.png");

        var t: number = 0;
        var animationRequest: number | null = null;

        var items: (RSprite | null)[] = loadedSprites.map(makeRSpriteFromSprite);
        var spacebarsUsed = initialSpacebarsUsed;

        var currentResponseImage: HTMLImageElement | null = null;
        var responseRequest: number | null = null;

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
        var lastCollisions: Point[] = [];
        var collisionRequest: number | null = null;

        var pressingQ = false;
        var pressingW = false;
        var pressingE = false;
        var pressingA = false;
        var pressingS = false;
        var pressingD = false;

        function restartLevel() {
          attachLevel(levelNumber, initialSpacebarsUsed);
        }

        function resetCollisions() {
          collisions = null;

          if (collisionRequest !== null) clearTimeout(collisionRequest);
          collisionRequest = setTimeout(findCollisions);
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

          function displayCollisionPoints() {
            collisions = collisionPoints;
            lastCollisions = collisionPoints;
            collisionRequest = null;
            updateGameScreen();
          }

          function addCollisionPoint(x: number, y: number) {
            collisionPoints.push({x,y});
          }

          function outerLoop(i: number) {
            if (i < visibleItemCount) {
              const itemI = items[i];
              if (itemI) {
                rspriteIntersectsOutsideBounds(itemI, 54, 54, 725, 725, addCollisionPoint);
                collisionRequest = setTimeout(() => innerLoop(i, itemI, i+1));
                return;
              } else {
                collisionRequest = setTimeout(() => outerLoop(i+1));
                return;
              }
            }

            displayCollisionPoints();
          }

          function innerLoop(i: number, itemI: RSprite, j: number) {
            if (j < visibleItemCount) {
              const itemJ = items[j];
              if (itemJ) rspritesIntersect(itemI, itemJ, addCollisionPoint);
              collisionRequest = setTimeout(() => innerLoop(i, itemI, j+1));
              return;
            }

            collisionRequest = setTimeout(() => outerLoop(i+1));
          }

          for(var i=0; i<visibleItemCount; i++) {
            const itemI = items[i];
            if (itemI && (itemI.localSprite.width > 670 || itemI.localSprite.height > 670)) {
              // this is a joke item, no need to display the collisions
              collisionPoints.push({x: -1, y: -1});
              displayCollisionPoints();
              return;
            }
          }

          collisionRequest = setTimeout(() => outerLoop(0));
        }

        function giveItemAway() {
          currentResponseImage = responseImages[spacebarsUsed];

          if (responseRequest !== null) clearTimeout(responseRequest);
          responseRequest = setTimeout(
            () => {
              currentResponseImage = null;
              responseRequest = null;

              updateGameScreen();
            }, 2000
          );

          if (spacebarsUsed < rabbitImages.length-1) {
            spacebarsUsed++;
            items[currentItemNumber] = null;
            selectAnotherItem();
          }
        }

        function selectAnotherItem() {
          for(var i=currentItemNumber+1; i<visibleItemCount; i++) {
            if (items[i]) {
              currentItemNumber = i;
              return;
            }
          }
          for(var i=0; i<currentItemNumber; i++) {
            if (items[i]) {
              currentItemNumber = i;
              return;
            }
          }
        }

        function findNextItem(): RSprite | null {
          return items[visibleItemCount] || null;
        }

        function addNextItem() {
          gameCanvas.setAttribute("style", "cursor: default;");

          const item = findNextItem();
          if (item) {
            visibleItemCount++;
            currentItemNumber = visibleItemCount - 1;

            item.x = 390;
            item.y = -item.localSprite.height;

            lastCollisions = [];

            t = 0;
            animationRequest = window.requestAnimationFrame(animateFallingItem);
          } else {
            attachLevel(levelNumber+1, spacebarsUsed);
          }
        }

        function animateFallingItem() {
          const item = items[currentItemNumber];
          if (item) {
            if (t < 1) {
              item.y = 373 - fallDownBouncing(t) * (373 + item.localSprite.height);
              t += 0.02;

              updateGameScreen();
              animationRequest = window.requestAnimationFrame(animateFallingItem);
            } else {
              item.y = 373;
              resetCollisions();

              updateGameScreen();
              animationRequest = null;
            }
          } else {
            animationRequest = null;
          }
        }

        function hoverOverItem(event: MouseEvent) {
          if (animationRequest !== null) return;

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
          if (animationRequest !== null) return;

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

              event.stopPropagation();
              event.preventDefault();
              return;
            }
          }
        }

        function dragItem(event: MouseEvent) {
          if (animationRequest !== null) return;

          if (picked) {
            const mouseX = event.offsetX;
            const mouseY = event.offsetY;

            picked.item.x = mouseX - picked.mouseX + picked.itemX;
            picked.item.y = mouseY - picked.mouseY + picked.itemY;

            event.stopPropagation();
            event.preventDefault();
            resetCollisions();
            updateGameScreen();
          } else {
            hoverOverItem(event);
          }
        }

        function keyDown(event: KeyboardEvent) {
          if (animationRequest !== null) return;

          const item = items[currentItemNumber];
          if (!item) return;

          var handled = true;

          if      (event.key === "PageUp"     || event.key.toLowerCase() === "q") pressingQ = true;
          else if (event.key === "ArrowUp"    || event.key.toLowerCase() === "w") pressingW = true;
          else if (event.key === "PageDown"   || event.key.toLowerCase() === "e") pressingE = true;
          else if (event.key === "ArrowLeft"  || event.key.toLowerCase() === "a") pressingA = true;
          else if (event.key === "ArrowDown"  || event.key.toLowerCase() === "s") pressingS = true;
          else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") pressingD = true;
          else if (event.key === "Tab") selectAnotherItem();
          else {
            handled = false;
            //console.log(event.key);
          }

          if (handled) {
            if (pressingW) item.y -= event.shiftKey ? 15 : 1;
            if (pressingA) item.x -= event.shiftKey ? 15 : 1;
            if (pressingS) item.y += event.shiftKey ? 15 : 1;
            if (pressingD) item.x += event.shiftKey ? 15 : 1;
            if (pressingQ) item.rotation -= event.shiftKey ? 10 : 1;
            if (pressingE) item.rotation += event.shiftKey ? 10 : 1;

            event.stopPropagation();
            event.preventDefault();
            resetCollisions();
            updateGameScreen();
          }
        }

        function keyUp(event: KeyboardEvent) {
          if (animationRequest !== null) return;

          var handled = true;

          if      (event.key === "PageUp"     || event.key.toLowerCase() === "q") pressingQ = false;
          else if (event.key === "ArrowUp"    || event.key.toLowerCase() === "w") pressingW = false;
          else if (event.key === "PageDown"   || event.key.toLowerCase() === "e") pressingE = false;
          else if (event.key === "ArrowLeft"  || event.key.toLowerCase() === "a") pressingA = false;
          else if (event.key === "ArrowDown"  || event.key.toLowerCase() === "s") pressingS = false;
          else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") pressingD = false;
          else if (event.key === "Enter" && collisions && collisions.length === 0) addNextItem();
          else if (event.key === " ") giveItemAway();
          else if (event.key === "r") restartLevel();
          else if (event.key === "R") attachGameScreen(titleScreen);
          else if (event.key === "C") spacebarsUsed = 0; // cheat!
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
            window.addEventListener("keydown", keyDown);
            window.addEventListener("keyup", keyUp);

            addNextItem();
          },
          detach: () => {
            gameCanvas.removeEventListener("mousedown", pickItem);
            gameCanvas.removeEventListener("mousemove", dragItem);
            gameCanvas.removeEventListener("mouseup", releaseItem);
            window.removeEventListener("keydown", keyDown);
            window.removeEventListener("keyup", keyUp);

            if (collisionRequest !== null) clearTimeout(collisionRequest);
            if (responseRequest  !== null) clearTimeout(responseRequest);
          },
          draw: () => {
            g.drawImage(background, 0, 0);

            const nextItem: RSprite | null = findNextItem();
            if (nextItem) {
              drawImageInsideBox(g, nextItem.localSprite.image, 778, 202, 240, 155);
            }

            const rabbitImage = rabbitImages[spacebarsUsed];
            g.drawImage(rabbitImage, 1050, 143);

            if (currentResponseImage) {
              drawCenteredImage(g, currentResponseImage, 1178, 377);
            }

            const helpImage = (lastCollisions.length == 0 && findNextItem() === null) ? movingOnImage : controlsImage;
            g.drawImage(helpImage, 768, 390);

            if (spacebarsUsed == rabbitImages.length - 1) {
              g.drawImage(spaceDisabledImage, 1034, 628);
            }
            if (lastCollisions.length !== 0) {
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

            g.fillStyle = "#FF0000C0";
            lastCollisions.forEach(({x,y}) => {
              g.fillRect(x, y, 1, 1);
            });
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

      function play() {
        attachLevel(1, 0);
      }

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

        if (spriteContainsPoint(playButton, mouseX, mouseY)) {
          gameCanvas.setAttribute("style", "cursor: default;");
          play();
        } else if (spriteContainsPoint(storyButton, mouseX, mouseY)) {
          gameCanvas.setAttribute("style", "cursor: default;");
          displayStory();
        }
      }

      function typeButton(event: KeyboardEvent) {
        if (event.key === "Enter") play();
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


  ////////////////////
  // credits screen //
  ////////////////////

  function makeCreditsScreen(previousScreen: GameScreen): GameScreen {
    return makeLoadingScreen(
      () => loadImage("images/credits.png"),
      bg => {
        function returnToPreviousScreen() {
          attachGameScreen(previousScreen);
        }

        return {
          attach: () => {
            gameCanvas.addEventListener("mouseup", returnToPreviousScreen);
            window.addEventListener("keyup", returnToPreviousScreen);
          },
          detach: () => {
            gameCanvas.removeEventListener("mouseup", returnToPreviousScreen);
            window.removeEventListener("keyup", returnToPreviousScreen);
          },
          draw: () => {
            g.drawImage(bg, 0, 0);
          }
        };
      }
    );
  }


  ////////////////
  // bad ending //
  ////////////////

  const badEndingScreen: GameScreen = makeLoadingScreen(
    () => Promise.all<HTMLImageElement, Sprite[]>(
      [
        loadImage("images/ending1.png"),
        loadSprites(["images/playAgainButton.png", "images/creditsButton.png"])
      ]
    ),
    ([bg, [playAgainButton, creditsButton]]) => {
      playAgainButton.x = 50;
      playAgainButton.y = 620;
      creditsButton.x = 570;
      creditsButton.y = 620;

      function playAgain() {
        attachGameScreen(titleScreen);
      }

      function displayCredits() {
        attachGameScreen(makeCreditsScreen(badEndingScreen));
      }

      function hoverOverButton(event: MouseEvent) {
        const mouseX = event.offsetX;
        const mouseY = event.offsetY;

        if (spriteContainsPoint(playAgainButton, mouseX, mouseY) || spriteContainsPoint(creditsButton, mouseX, mouseY)) {
          gameCanvas.setAttribute("style", "cursor: pointer;");
        } else {
          gameCanvas.setAttribute("style", "cursor: default;");
        }
      }

      function clickButton(event: MouseEvent) {
        const mouseX = event.offsetX;
        const mouseY = event.offsetY;

        if (spriteContainsPoint(playAgainButton, mouseX, mouseY)) {
          gameCanvas.setAttribute("style", "cursor: default;");
          playAgain();
        } else if (spriteContainsPoint(creditsButton, mouseX, mouseY)) {
          gameCanvas.setAttribute("style", "cursor: default;");
          displayCredits();
        }
      }

      function typeButton(event: KeyboardEvent) {
        if (event.key === "Enter") playAgain();
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
          drawSprite(playAgainButton);
          drawSprite(creditsButton);
        }
      };
    }
  );


  /////////////////
  // good ending //
  /////////////////

  const goodEndingScreen: GameScreen = makeLoadingScreen(
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
