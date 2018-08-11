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
  pixelmap: PixelMap
};

type CollisionDetector = {
  hitTest: (source: Sprite, target: Sprite) => boolean,
  buildPixelMap: (source: HTMLCanvasElement) => PixelMap
};

declare function collisionDetection(): CollisionDetector;

const collisionDetector = collisionDetection();



//////////
// main //
//////////

window.onload = function() {
  const canvas = <HTMLCanvasElement>document.getElementById('canvasId');
  var ctx = canvas.getContext("2d") || <CanvasRenderingContext2D>error("canvas has no 2D context");
  var img = <HTMLImageElement>document.getElementById("L-blob");
  ctx.drawImage(img, 0, 0);
  console.log(collisionDetector.buildPixelMap(canvas));
};
