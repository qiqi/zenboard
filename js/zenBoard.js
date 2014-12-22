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

Firebase.INTERNAL.forceWebSockets();
firebaseRoot = new Firebase("https://zenboard.firebaseio.com/");

angular.module('zenBoard', ['yaru22.md']).
controller('loginCtrl', function ($scope) {
    $scope.showPage = 'login';
    $scope.isLoggedIn = function () {
        return $scope.showPage == 'chooser' || $scope.showPage == 'editor';
    }

    loginIfAuthenticated();
    var authInterval = setInterval(loginIfAuthenticated, 1000);
    function loginIfAuthenticated() {
        var auth = firebaseRoot.getAuth();
        console.log(auth);
        if (auth) {
            if (!auth.facebook) {
                firebaseRoot.unauth();
                return;
            }
            if (authInterval) {
                clearInterval(authInterval);
            }
            $scope.uid = auth.uid;
            var privateRef = firebaseRoot.child('private').child(auth.uid);
            privateRef.child('authData').set(auth);

            var username = auth.facebook.displayName;
            if (username) {
                firebaseRoot.child('users').child(username).set(auth.uid);
            }

            var noteRef = privateRef.child('notes');
            noteRef.once('value', function (snap) {
                $scope.notes = snap.val();
                if (!$scope.notes) {
                    $scope.notes = {};
                }
                if (!$scope.isLoggedIn()) {
                    $scope.showPage = 'chooser';
                    $scope.$apply();
                }
            });
        }
    }

    $scope.facebookLogin = function () {
        firebaseRoot.authWithOAuthPopup("facebook", function(err, auth) {
            if (err) {
                console.log(err);
                console.log(err.code);
            }
            console.log(auth);
        });
    };

    $scope.twitterLogin = function () {
        function getTwitterRequestToken(callbackURL, clientID, clientSecret) {

            function sendPostRequest(url, authzheader) {
                try {
                    var request = new XMLHttpRequest();
                    request.open("POST", url, false);
                    request.setRequestHeader("Authorization", authzheader);
                    request.send(null);
                    return request.responseText;
                } catch (err) {
                    WinJS.log("Error sending request: " + err, "Web Authentication SDK Sample", "error");
                }
            }

            function getSignature(sigBaseString, keyText) {
                var keyMaterial = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(keyText, Windows.Security.Cryptography.BinaryStringEncoding.Utf8);
                var macAlgorithmProvider = Windows.Security.Cryptography.Core.MacAlgorithmProvider.openAlgorithm("HMAC_SHA1");
                var key = macAlgorithmProvider.createKey(keyMaterial);
                var tbs = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(sigBaseString, Windows.Security.Cryptography.BinaryStringEncoding.Utf8);
                var signatureBuffer = Windows.Security.Cryptography.Core.CryptographicEngine.sign(key, tbs);
                var signature = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(signatureBuffer);

                return signature;
            }

            var twitterURL = "https://api.twitter.com/oauth/request_token";
            var timestamp = Math.round(new Date().getTime() / 1000.0);
            var nonce = Math.floor(Math.random() * 1000000000);;

            // Compute base signature string and sign it.
            //    This is a common operation that is required for all requests even after the token is obtained.
            //    Parameters need to be sorted in alphabetical order
            //    Keys and values should be URL Encoded.
            var sigBaseStringParams = "oauth_callback=" + encodeURIComponent(callbackURL);
            sigBaseStringParams += "&" + "oauth_consumer_key=" + clientID;
            sigBaseStringParams += "&" + "oauth_nonce=" + nonce;
            sigBaseStringParams += "&" + "oauth_signature_method=HMAC-SHA1";
            sigBaseStringParams += "&" + "oauth_timestamp=" + timestamp;
            sigBaseStringParams += "&" + "oauth_version=1.0";
            var sigBaseString = "POST&";
            sigBaseString += encodeURIComponent(twitterURL) + "&" + encodeURIComponent(sigBaseStringParams);

            var keyText = clientSecret + "&";
            var signature = getSignature(sigBaseString, keyText);
            var dataToPost = "OAuth oauth_callback=\"" + encodeURIComponent(callbackURL) + "\", oauth_consumer_key=\"" + clientID + "\", oauth_nonce=\"" + nonce + "\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"" + timestamp + "\", oauth_version=\"1.0\", oauth_signature=\"" + encodeURIComponent(signature) + "\"";
            var response = sendPostRequest(twitterURL, dataToPost);
            var oauth_token;
            var oauth_token_secret;
            var keyValPairs = response.split("&");

            for (var i = 0; i < keyValPairs.length; i++) {
                var splits = keyValPairs[i].split("=");
                switch (splits[0]) {
                    case "oauth_token":
                        oauth_token = splits[1];
                        break;
                    case "oauth_token_secret":
                        oauth_token_secret = splits[1];
                        break;
                }
            }
            return oauth_token;
        }

        var callbackURL = "http://twitter.com";
        var clientID = '742896585779513';
        var clientSecret = 'LkO6iTMfJZfmnoXaYEE73Xs81qbCicgoPyF6QhrqmwWKOy2xIy';
        var oauth_token = getTwitterRequestToken(callbackURL, clientID, clientSecret);

        // Send the user to authorization
        twitterURL = "https://api.twitter.com/oauth/authorize?oauth_token=" + oauth_token;

        var startURI = new Windows.Foundation.Uri(twitterURL);
        var endURI = new Windows.Foundation.Uri(callbackURL);

        Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
            Windows.Security.Authentication.Web.WebAuthenticationOptions.none, startURI, endURI)
        .done(function (result) {
           switch (result.responseStatus) {
               case Windows.Security.Authentication.Web.WebAuthenticationStatus.success:
                   var fragment = Windows.Foundation.Uri(result.responseData).fragment;
                   if (fragment.indexOf("#access_token=") != -1) {
                       var token = fragment.substring(
                           new String("#access_token=").length,
                           fragment.indexOf("&expires_in="));
                       // Add API calls here
                       console.log('token', token);
                       firebaseRoot.authWithOAuthToken("twitter", token, function (error, authData) {
                           if (error) {
                               console.log("Login Failed!", error);
                           } else {
                               console.log("Authenticated successfully with payload:", authData);
                               loginIfAuthenticated();
                           }
                       });
                   }
                   break;
               case Windows.Security.Authentication.Web.WebAuthenticationStatus.userCancel:
                   console.log(window.toStaticHTML(result.responseData));
                   break;
               case Windows.Security.Authentication.Web.WebAuthenticationStatus.errorHttp:
                   console.log(window.toStaticHTML(result.responseData));
                   break;
           }
        }, function (err) {
           console.log(err);
        });
    };

    $scope.isSignupValid = function () {
        return $scope.signupForm.email && $scope.signupForm.password
            && $scope.signupForm.password == $scope.signupForm.password2
            && $scope.signupForm.password.length >= 6
            && $scope.signupForm.$valid;
    };
    $scope.firebaseSignup = function () {
        firebaseRoot.createUser({
            email: $scope.signupForm.email,
            password: $scope.signupForm.password
        }, function (error) {
            if (error === null) {
                $scope.loginForm.message = 'New user created; you can log in now.';
                $scope.showPage = 'loginForm';
            } else {
                $scope.signupForm.message = error.message;
                $scope.$apply();
            }
        });
    };
    $scope.isLoginValid = function () {
        return $scope.loginForm.email && $scope.loginForm.password
            && $scope.loginForm.$valid;
    };
    $scope.firebaseLogin = function () {
        firebaseRoot.authWithPassword({
            email: $scope.loginForm.email,
            password: $scope.loginForm.password
        }, function (error, authData) {
            if (error === null) {
                loginIfAuthenticated();
            } else {
                $scope.loginForm.message = error.message;
                $scope.$apply();
            }
        });
    };
    $scope.firebaseLogout = function () {
        firebaseRoot.unauth();
        $scope.showPage = 'login';
    }

    $scope.searchText = '';
    $scope.note = '';

    $scope.$watch('showPage', function () {
        [100, 500, 2000, 10000, 300000].forEach(function (dt) {
            setTimeout(function () {
                MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
            }, dt);
        });
    });

    $scope.startWithNote = function (id) {
        $scope.note = $scope.notes[id];
        $scope.presId = GUID();
        $scope.showPage = 'editor';
    };

    $scope.startWithoutNote = function () {
        $scope.note = 'This is note';
        $scope.presId = GUID();
        $scope.showPage = 'editor';
    };
});
