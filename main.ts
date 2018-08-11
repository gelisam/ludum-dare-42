///////////
// error //
///////////

function error<A>(msg: string): A {
  throw new Error(msg);
}


///////////
// Image //
///////////

// must be one of the preloaded images in <div id="preloader">!
function image(src: string): HTMLImageElement {
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

  // must be one of the preloaded images in <div id="preloader">!
  function loadSprite(src: string): Sprite {
    const img = image(src);

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


  //////////////////
  // level screen //
  //////////////////

  const levelScreen: GameScreen = (() => {
    const mouse = loadSprite("images/1px.png");
    const sprites = [loadSprite("images/tape.png"), loadSprite("images/scissors.png")];

    var picked: {
      sprite: Sprite,
      mouseX: number,
      mouseY: number,
      spriteX: number,
      spriteY: number
    } | null = null;

    function pickSprite(event: MouseEvent) {
      mouse.x = event.offsetX;
      mouse.y = event.offsetY;

      sprites.forEach(sprite => {
        if (spritesCollide(mouse, sprite)) {
          picked = {
            sprite: sprite,
            mouseX: mouse.x,
            mouseY: mouse.y,
            spriteX: sprite.x,
            spriteY: sprite.y
          };
        }
        return;
      });
    }

    function moveSprite(event: MouseEvent) {
      if (picked) {
        mouse.x = event.offsetX;
        mouse.y = event.offsetY;

        picked.sprite.x = mouse.x - picked.mouseX + picked.spriteX;
        picked.sprite.y = mouse.y - picked.mouseY + picked.spriteY;

        updateGameScreen();
      }
    }

    function releaseSprite(event: MouseEvent) {
      picked = null;
    }

    return {
      load: () => {
        gameCanvas.addEventListener("mousedown", pickSprite);
        gameCanvas.addEventListener("mousemove", moveSprite);
        gameCanvas.addEventListener("mouseup", releaseSprite);
      },
      unload: () => {
        gameCanvas.removeEventListener("mousedown", pickSprite);
        gameCanvas.removeEventListener("mousemove", moveSprite);
        gameCanvas.removeEventListener("mouseup", releaseSprite);
      },
      draw: () => {
        g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        for(var i=0; i<sprites.length; i++) {
          for(var j=i+1; j<sprites.length; j++) {
            if (spritesCollide(sprites[i], sprites[j])) {
              g.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
            }
          }
        }

        sprites.forEach(sprite => {
          drawSprite(sprite);
        });
      }
    };
  })();


  //////////////////
  // title screen //
  //////////////////

  const titleScreen: GameScreen = (() => {
    const titleSprite = loadSprite("images/title.png");

    function nextScreen() {
      loadGameScreen(levelScreen);
    }

    return {
      load: () => {
        gameCanvas.addEventListener("mouseup", nextScreen);
      },
      unload: () => {
        gameCanvas.removeEventListener("mouseup", nextScreen);
      },
      draw: () => {
        g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        drawSprite(titleSprite);
      }
    };
  })();


  //////////
  // main //
  //////////

  loadGameScreen(titleScreen);
};
