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
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  pixelmap: PixelMap
};

type CollisionDetector = {
  hitTest: (source: Sprite, target: Sprite) => Boolean,
  buildPixelMap: (source: HTMLCanvasElement) => PixelMap
};

declare function collisionDetection(): CollisionDetector;



//////////
// main //
//////////

window.onload = function() {
};
