// http://localhost:8000/?fbid=10205725052744611&
//
(function () {
    var firebaseRef = new Firebase("https://zenboard.firebaseio.com/public");
    firebaseRef = firebaseRef.child('facebook:' + getParameterByName('fbid'));

    // UI object references.
    var inkCanvas;
    var inkContext;
    var strokes = {};

    // End global variables

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    $(document).ready(function() {
        // Set up the UI.
        inkCanvas = document.getElementById("inkCanvas");
        inkContext = inkCanvas.getContext("2d");

        inkContext.lineCap = "round";
        inkContext.lineJoin = "round";

        inkCanvas.width = window.innerWidth;
        inkCanvas.height = window.innerWidth;

        if (getParameterByName('board')) {
            setupUpdates(firebaseRef.child(getParameterByName('board')));
        } else {
            firebaseRef.child('currentPres').once('value', function(snap) {
                console.log(snap.val());
                setupUpdates(firebaseRef.child(snap.val()));
            });
        }
    });

    $(window).resize(function(){
        var height = inkCanvas.height / inkCanvas.width;
        inkCanvas.width = window.innerWidth;
        inkCanvas.height = inkCanvas.width * height;
        $(inkCanvas).width(inkCanvas.width);
        $(inkCanvas).height(inkCanvas.height);
        updateStrokes();
    });

    function setupUpdates(ref) {
        ref.child('strokes').on('value', function(snap) {
            strokes = snap.val();
            console.log(strokes);
            updateStrokes();
        });
        ref.child('height').on('value', function(snap) {
            inkCanvas.height = inkCanvas.width * snap.val();
            $(inkCanvas).height(inkCanvas.height);
            updateStrokes();
        });
        ref.child('scroll').on('value', function(snap) {
            var s = snap.val();
            $('html, body').animate({
                scrollTop: window.innerWidth * s - window.innerHeight
            }, 1000);
        });
    }

    function updateStrokes() {
        inkContext.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
        for (id in strokes) {
            renderSerializedStroke(strokes[id]);
        }
    }

    function deserializeStrokeData(data) {
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
