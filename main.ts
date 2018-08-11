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


//////////
// main //
//////////

window.onload = function() {
};
