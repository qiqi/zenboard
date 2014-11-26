Firebase.INTERNAL.forceWebSockets();
var firebaseRef = new Firebase("https://infinite-walls.firebaseio.com/pres");

angular.module('zenBoard', ['firebase']).controller('boardCtrl', function ($scope, $sce, $firebase) {
    $scope.Math = window.Math;
    $scope.$sce = $sce;

    $scope.pres = {};
    $scope.slide = {};
    $firebase(firebaseRef.child('test-pres')).$asObject().$bindTo($scope, 'pres');

    $scope.$watch(function () {
        return $scope.pres && $scope.pres.slides && $scope.pres.selectedSlideId
            && $scope.pres.slides[$scope.pres.selectedSlideId];
    }, function (slide) {
        if (slide) {
            $scope.slide = slide;
        }
    })

    $scope.$watch(function () {
        return $scope.slide.url;
    }, function (url) {
        console.log(url);
        if (url && url.indexOf('http://') != 0 && url.indexOf('https://') != 0) {
            url = 'http://' + url;
        }
        try {
            $('#webview').attr('src', url);
        } catch (err) {
            $('#webview').attr('src', 'about:blank');
        }
    });

    $scope.selectSlide = function (slideId) {
        $scope.pres.selectedSlideId = slideId;
    }
});
