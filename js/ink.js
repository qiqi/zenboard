(function () {
    // UI object references.
    console.log('sdfdsfsadf');
    var inkCanvas;
    var inkContext;
    strokes = {};
    var ref = firebaseRef.child('test-pres').child('ink');

    // Initial pointer values.
    var pointerId = -1;
    var pointerDeviceType = null;

    // Initial stroke property values.
    var strokeColor;
    var strokeWidth;

    //
    // End global variables
    //

    // Obtain reference to the specified element.
    function get(elementId) {
        return document.getElementById(elementId);
    }

    $(document).ready(function() {
        // Set up the UI.
        inkCanvas = get("inkCanvas");
        inkContext = inkCanvas.getContext("2d");

        inkContext.lineCap = "round";
        inkContext.lineJoin = "round";

        inkCanvas.width = window.innerWidth;
        inkCanvas.height = window.innerWidth;

        ref.on('value', function(snapshot) {
            inkContext.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
            var strokes = snapshot.val();
            console.log(strokes);
            for (id in strokes) {
                renderSerializedStroke(strokes[id]);
            }
        });
    });

    function deserializeStrokeData(data) {
        // function serializePixel(x) {
        //     return Math.round(x / inkCanvas.width * 40000).toString(36);
        // }
        function deserializePixel(x) {
            return Number.parseInt(x, 36) / 40000 * inkCanvas.width;
        }
        function deserializeSegment(seg) {
            seg = seg.split(':');
            return {
                pressure: deserializePixel(seg[0]),
                points: seg[1].split(',').map(deserializePoint)
            };
        }
        function deserializePoint(point) {
            var pos = point.split('_');
            return {
                x: deserializePixel(pos[0]),
                y: deserializePixel(pos[1]),
            };
        }
        segments = data.split(';').slice(0, -1);
        return segments.map(deserializeSegment);
    }

    function renderSerializedStroke(stroke) {
        inkContext.beginPath();
        // Enumerate through each line segment of the stroke.
        var first = true;
        inkContext.strokeStyle = stroke.color;
        deserializeStrokeData(stroke.data).forEach(
            function (segment) {
                // Move to the starting screen location of the stroke.
                inkContext.lineWidth = segment.pressure * 3;
                if (first) {
                    inkContext.moveTo(segment.points[0].x, segment.points[0].y);
                    first = false;
                }
                    // Calculate the bezier curve for the segment.
                else {
                    inkContext.bezierCurveTo(segment.points[0].x,
                                             segment.points[0].y,
                                             segment.points[1].x,
                                             segment.points[1].y,
                                             segment.points[2].x,
                                             segment.points[2].y);
                    inkContext.stroke();
                    inkContext.closePath();
                    inkContext.beginPath();
                    inkContext.moveTo(segment.points[2].x, segment.points[2].y);
                }
            }
        );
    }
})();
