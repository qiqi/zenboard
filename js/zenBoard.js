//. This file is part of ZenSlides, the web tool for preparing a ZenBoard presentation.
//. Copyright (C) 2014 Qiqi Wang
//. 
//. This program is free software: you can redistribute it and/or modify
//. it under the terms of the GNU Affero General Public License as published by
//. the Free Software Foundation, either version 3 of the License, or
//. (at your option) any later version.
//. 
//. This program is distributed in the hope that it will be useful,
//. but WITHOUT ANY WARRANTY; without even the implied warranty of
//. MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//. GNU Affero General Public License for more details.
//. 
//. You should have received a copy of the GNU Affero General Public License
//. along with this program.  If not, see <http://www.gnu.org/licenses/>.

function GUID() {
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-"
          + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

var TEMPLATE = ' \
<div id="note"><md ng-model="note" id="md-note"></md></div> \
<textarea ng-model="note" id="editor"> \
</textarea> \
';

Firebase.INTERNAL.forceWebSockets();
firebaseRoot = new Firebase("https://zenboard.firebaseio.com/");

angular.module('zenBoard', ['yaru22.md']).
directive('zenNote', function () {
    return {
        restrict: 'E',
        template: TEMPLATE,
        scope: {
            noteId: '=',
            uid: '=',
            showPage: '='
        }, controller: function($scope) {
            $scope.note = '';
            $scope.$watch('noteId', function () {
                console.log($scope.uid, $scope.noteId);
                if ($scope.uid && $scope.noteId) {
                    var userRef = firebaseRoot.child('private').child($scope.uid);
                    $scope.noteRef = userRef.child('notes').child($scope.noteId);
                    $scope.noteRef.once('value', function(snap) {
                        $scope.note = snap.val();
                    });
                }
            });
        }, link: function(scope, element) {
            element.trigger('create');
            var textArea = element.find('textarea');
            var mdNote = element.find('md');
            var textChanged = false;
            textArea.keyup(function() {
                textChanged = true;
                [50, 200].forEach(function (dt) {
                    setTimeout(function () {
                        MathJax.Hub.Queue(["Typeset", MathJax.Hub, mdNote[0]]);
                    }, dt);
                });
            });
            function updateFirebase() {
                if (textChanged) {
                    textChanged = false;
                    console.log(scope.noteRef);
                    scope.noteRef.set(textArea.val());
                }
            }
            setInterval(updateFirebase, 5000);
            textArea.blur(updateFirebase);
        }
    };
}).
controller('loginCtrl', function ($scope, $location) {
    $scope.showPage = 'login';
    $scope.isLoggedIn = function () {
        return $scope.showPage == 'chooser' || $scope.showPage == 'editor';
    }

    loginIfAuthenticated();
    var authInterval = setInterval(loginIfAuthenticated, 1000);
    function loginIfAuthenticated() {
        var auth = firebaseRoot.getAuth();
        if (auth) {
            if (!auth.facebook) {
                firebaseRoot.unauth();
                $scope.uidd = null;
                return;
            }
            if (authInterval) {
                clearInterval(authInterval);
            }
            $scope.uid = auth.uid;

            if (!$scope.isLoggedIn()) {
                $scope.showPage = 'chooser';
            }
        }
    }

    $scope.$watch('showPage', function() {
        var noteRef = firebaseRoot.child('private').child($scope.uid).child('notes');
        noteRef.once('value', function (snap) {
            $scope.notes = snap.val();
            if (!$scope.notes) {
                $scope.notes = {};
            }
            $scope.$apply();
        });
    });

    $scope.facebookLogin = function () {
        firebaseRoot.authWithOAuthPopup("facebook", function(err, auth) {
            if (err) {
                console.log(err);
                console.log(err.code);
            }
        });
    };

    $scope.firebaseLogout = function () {
        firebaseRoot.unauth();
        $scope.uid = null;
        $scope.showPage = 'login';
    }

    $scope.searchText = '';

    $scope.$watch('showPage', function () {
        [100, 500, 2000, 10000, 300000].forEach(function (dt) {
            setTimeout(function () {
                MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
            }, dt);
        });
    });

    $scope.openNote = function (id) {
        $scope.noteId = id;
        console.log(id);
        $location.hash(id);
    };
    $scope.newNote = function () {
        $scope.openNote(GUID());
    };

    $scope.$watch(function () {
        return $location.hash();
    }, function (hash) {
        if (hash) {
            $scope.showPage = 'editor';
        } else if ($scope.uid) {
            $scope.showPage = 'chooser';
        } else {
            $scope.showPage = 'login';
        }
    })
}).
filter('notesContains', function() {
    return function(notes, text) {
        if (text) {
            var filteredNotes = {};
            for (var id in notes) {
                var note = notes[id];
                if (note && note.indexOf && note.indexOf(text) >= 0) {
                    filteredNotes[id] = note;
                }
            }
            return filteredNotes;
        } else {
            return notes;
        }
    };
});
