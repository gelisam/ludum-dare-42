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
    const staticSprite = loadSprite("images/tape.png");
    const movingSprite = loadSprite("images/scissors.png");
    staticSprite.x = 100;
    staticSprite.y = 100;
    movingSprite.x = 100;
    movingSprite.y = 100;

    function moveSprite(event: MouseEvent) {
      movingSprite.x = event.offsetX;
      movingSprite.y = event.offsetY;

      updateGameScreen();
    }

    return {
      load: () => {
        gameCanvas.addEventListener("mousemove", moveSprite);
      },
      unload: () => {
        gameCanvas.removeEventListener("mousemove", moveSprite);
      },
      draw: () => {
        g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        drawSprite(staticSprite);
        if (!spritesCollide(staticSprite, movingSprite)) {
          drawSprite(movingSprite);
        }
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
