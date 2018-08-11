///////////
// error //
///////////

function error<A>(msg: string): A {
  throw new Error(msg);
}


///////////
// Maybe //
///////////

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


  //////////
  // main //
  //////////

  g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  const staticBlob = loadSprite("images/L-blob.png");
  const movingBlob = loadSprite("images/J-blob.png");

  function drawScene() {
    g.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    //for(var i=-100; i<100; ++i) {
    //  for(var j=-100; j<100; ++j) {
    //    movingBlob.x = staticBlob.x + i;
    //    movingBlob.y = staticBlob.y + j;
    //    if (spritesCollide(staticBlob, movingBlob)) {
    //      g.fillRect(staticBlob.x + i, staticBlob.y + j, 1, 1);
    //    }
    //  }
    //}


    drawSprite(staticBlob);
    if (!spritesCollide(staticBlob, movingBlob)) {
      drawSprite(movingBlob);
    }
  }

  gameCanvas.onmousemove = (event: MouseEvent) => {
    movingBlob.x = event.offsetX;
    movingBlob.y = event.offsetY;

    drawScene();
  };

  staticBlob.x = 100;
  staticBlob.y = 100;
  drawScene();
};
