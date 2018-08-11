// from https://benjaminhorn.io/code/pixel-accurate-collision-detection-with-javascript-and-canvas/
//      https://gist.github.com/beije/43bfdc4a2420e0bae453

function collisionDetection() {

	/*
	 * private function initialize()
	 *
	 * Initializes the object
	 *
	 */
	this.initialize = function() {}

	/*
	 * public function hitTest()
	 *
	 * Checks if two objects collide. First with box-model detection
	 * and then on a per-pixel detection.
	 *
	 * Both source and target objects are expected to look like this:
	 *
	 * {
	 *    x: (Number) current x position,
	 *    y: (Number) current y position,
	 *    width: (Number) object height,
	 *    height: (Number) object width,
	 *    pixelmap: (Object) pixel map object generated from buildPixelMap()
	 * }
	 *
	 * @param source (Object) The source object
	 * @param target (Object) The target object
	 *
	 * @return boolean, true on collision
	 *
	 */
	this.hitTest = function( source, target ) {
		var hit = false;
		//var start = new Date().getTime();

		if( this.boxHitTest( source, target ) ) {
			if( this.pixelHitTest( source, target ) ) {
				hit = true;
			}
		}

		//var end = new Date().getTime();

		//if( hit == true ){
		//	console.log( 'detection took: ' + (end - start) + 'ms' );
		//}

		return hit;
	}

	/*
	 * private function boxHitTest()
	 *
	 * Checks if two objects collide with box-model detection.
	 *
	 * Both source and target objects are expected to look like this:
	 *
	 * {
	 *    x: (Number) current x position,
	 *    y: (Number) current y position,
	 *    width: (Number) object height,
	 *    height: (Number) object width
	 * }
	 *
	 * @param source (Object) The source object
	 * @param target (Object) The target object
	 *
	 * @return boolean, true on collision
	 *
	 */
	this.boxHitTest = function( source, target ) {
		return !(
			( ( source.y + source.height ) < ( target.y ) ) ||
			( source.y > ( target.y + target.height ) ) ||
			( ( source.x + source.width ) < target.x ) ||
			( source.x > ( target.x + target.width ) )
		);
	}

	/*
	 * private function pixelHitTest()
	 *
	 * Checks if two objects collide on a per-pixel detection.
	 *
	 * Both source and target objects are expected to look like this:
	 *
	 * {
	 *    x: (Number) current x position,
	 *    y: (Number) current y position,
	 *    width: (Number) object height,
	 *    height: (Number) object width,
	 *    height: (Number) object width,
	 *    pixelMap: (Object) pixel map object generated from buildPixelMap()
	 * }
	 *
	 * @param source (Object) The source object
	 * @param target (Object) The target object
	 *
	 * @return boolean, true on collision
	 *
	 */
	this.pixelHitTest = function( source, target ) {

            var top = parseInt( Math.max( source.y, target.y ) );
            var bottom = parseInt( Math.min(source.y+source.height, target.y+target.height) );
            var left = parseInt( Math.max(source.x, target.x) );
            var right = parseInt( Math.min(source.x+source.width, target.x+target.width) );

            for (var y = top; y < bottom; y++)
            {
                for (var x = left; x < right; x++)
                {

                    var sourceX = x - source.x;
                    var sourceY = y - source.y;
                    var targetX = x - target.x;
                    var targetY = y - target.y;

                    if (sourceX < 0 || sourceX >= source.width || sourceY < 0 || sourceY >= source.height) continue;
                    if (targetX < 0 || targetX >= target.width || targetY < 0 || targetY >= target.height) continue;

                    var sourcePixel = source.pixelMap[ sourceY * source.width * 4 + sourceX * 4 + 3 ];
                    var targetPixel = target.pixelMap[ targetY * target.width * 4 + targetX * 4 + 3 ];

                    if (sourcePixel == 255 && targetPixel == 255)
                    {
                        return true;
                    }
                }
            }

            return false;
	}

	/*
	 * public function buildPixelMap()
	 *
	 * Creates a pixel map on a canvas image. Everything
	 * with a opacity above 0 is treated as a collision point.
	 *
	 * @param source (Object) The canvas object
	 *
	 * @return the pixelMap (a Uint8ClampedArray with 4 bytes per pixels)
	 *
	 */
	this.buildPixelMap = function( source ) {
		var ctx = source.getContext("2d");
                return ctx.getImageData(0,0,source.width,source.height).data;
	}

	// Initialize the collider
	this.initialize();

	// Return our outward facing interface.
	return {
		hitTest: this.hitTest.bind( this ),
		buildPixelMap: this.buildPixelMap.bind( this )
	};
};
