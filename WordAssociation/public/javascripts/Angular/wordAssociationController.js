﻿(function() {

    function ChatMessage(message, sender) {
        this.sender = sender || "SERVER";
        this.timestamp = new Date().toLocaleTimeString();
        this.message = message || "";
    };

    function wordAssociationController($scope, $q, $timeout) {
        var vm = this;
        vm.username = null;
        vm.usernameInput = "";
        vm.team = null;
        vm.role = null;
        vm.chatInput = "";
        vm.chatMessages = [];
        vm.seed = 1;
        vm.cards = [];
        vm.players = [];
        vm.cardInfo = ["none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none"];
        vm.cardStatus = ["initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial", "initial"];
        vm.words = ["ball", "bat", "bed", "book", "boy", "bun", "can", "cake", "cap", "car", "cat", "cow", "cub", "cup", "dad", "day", "dog", "doll", "dust", "fan", "feet", "girl", "gun", "hall", "hat", "hen", "jar", "kite", "man", "map", "men", "mom", "pan", "pet", "pie", "pig", "pot", "rat", "son", "sun", "toe", "tub", "van", "apple", "arm", "banana", "bike", "bird", "book", "chin", "clam", "class", "clover", "club", "corn", "crayon", "crow", "crown", "crowd", "crib", "desk", "dime", "dirt", "dress", "fang ", "field", "flag", "flower", "fog", "game", "heat", "hill", "home", "horn", "hose", "joke", "juice", "kite", "lake", "maid", "mask", "mice", "milk", "mint", "meal", "meat", "moon", "mother", "morning", "name", "nest", "nose", "pear", "pen", "pencil", "plant", "rain", "river", "road", "rock", "room", "rose", "seed", "shape", "shoe", "shop", "show", "sink", "snail", "snake", "snow", "soda", "sofa", "star", "step", "stew", "stove", "straw", "string", "summer", "swing", "table", "tank", "team", "tent", "test", "toes", "tree", "vest", "water", "wing", "winter", "woman", "women", "alarm", "animal", "aunt", "bait", "balloon", "bath", "bead", "beam", "bean", "bedroom", "boot", "bread", "brick", "brother", "camp", "chicken", "children", "crook", "deer", "dock", "doctor", "downtown", "drum", "dust", "eye", "family", "father", "fight", "flesh", "food", "frog", "goose", "grade", "grandfather", "grandmother", "grape", "grass", "hook", "horse", "jail", "jam", "kiss", "kitten", "light", "loaf", "lock", "lunch", "lunchroom", "meal", "mother", "notebook", "owl", "pail", "parent", "park", "plot", "rabbit", "rake", "robin", "sack", "sail", "scale", "sea", "sister", "soap", "song", "spark", "space", "spoon", "spot", "spy", "summer", "tiger", "toad", "town", "trail", "tramp", "tray", "trick", "trip", "uncle", "vase", "winter", "water", "week", "wheel", "wish", "wool", "yard", "zebra"];
        vm.redScore = 0;
        vm.blueScore = 0;
        vm.redScoreMax = 8;
        vm.blueScoreMax = 8;
        vm.gameStarted = false;
        vm.readyToPlay = function () { return vm.username && vm.team && vm.role }
        vm.initialized = function () { return vm.username && vm.team && vm.role && vm.gameStarted; }

        vm.rng = function (min, max) {
            var x = Math.sin(vm.seed++) * 10000;
            var rand = x - Math.floor(x);

            return Math.floor((rand * max) + min);
        }

        vm.initCards = function() {
            for (var i = 0; i < 25; i++) {
                var index = -1;
                var found = 1;
                while (found !== -1) {
                    index = vm.rng(0, vm.words.length - 1);
                    found = vm.cards.indexOf(vm.words[index]);
                }
                vm.cards.push(vm.words[index]);
            }
        };

        vm.initCards();

        vm.socket = io();

        vm.socket.on("chat", function (data) {
            var text = data.sender === "SERVER" ? data.message : obfusChat.obfuscate(data.message, vm.seed);
            var message = new ChatMessage(text, data.sender);
            vm.chatMessages.push(message);
            $scope.$apply();
        });

        vm.socket.on("usernameSet", function(data) {
            vm.username = data;
            $scope.$apply();
        });

        vm.socket.on("userJoined", function(data) {
            vm.players.push(data);
            $scope.$apply();
        });

        vm.socket.on("userLeft", function(data) {
            for (var i = 0; i < vm.players.length; i++) {
                if (vm.players[i].username === data) {
                    vm.players.splice(i, 1);
                }
            }
            $scope.$apply();
        });

        vm.socket.on("updateScores", function(data) {
            vm.redScore = data.redScore;
            vm.blueScore = data.blueScore;
            vm.redScoreMax = data.redScoreMax;
            vm.blueScoreMax = data.blueScoreMax;
        });

        vm.setUsername = function() {
            vm.socket.emit("setUsername", vm.usernameInput);
        };

        vm.setTeam = function(team) {
            vm.socket.emit("setTeam", team);
        };

        vm.setRole = function(role) {
            vm.socket.emit("setRole", role);
        };

        vm.socket.on("teamSet", function(data) {
            vm.team = data;
            $scope.$apply();
        });

        vm.socket.on("roleSet", function(data) {
            vm.role = data;
            $scope.$apply();
        });

        vm.socket.on("cardInfo", function(data) {
            vm.cardInfo = data;
            $scope.$apply();
        });

        vm.socket.on("setSeed", function (data) {
            vm.seed = data;
            vm.cards = [];
            vm.initCards();
            $scope.$apply();
        });

        vm.sendChat = function () {
            if (vm.chatInput.length === 0) return;
            var message = new ChatMessage(vm.chatInput, vm.username);
            var text = obfusChat.obfuscate(vm.chatInput, vm.seed);
            vm.socket.emit("chat", text);
            vm.chatInput = "";
            if (vm.username) vm.chatMessages.push(message);
        }

        vm.inputKeyPress = function(event) {
            if (event.which === 13) {
                vm.sendChat();
            }
        }

        vm.usernameKeyPress = function(event) {
            if (event.which === 13) {
                vm.setUsername();
            }
        }

        vm.chatWindowScrollToBottom = function () {
            var chatWindow = $("#chat-window");
            chatWindow.scrollTop(chatWindow[0].scrollHeight);
        };

        //scroll to the bottom of the chat box when a new message is added
        $scope.$watch(function() { return vm.chatMessages.length },
            function () {
                $timeout(function() {
                    vm.chatWindowScrollToBottom();
                }, 0);
        });

        vm.chooseCard = function (index) {
            vm.cardStatus[index] = "chosen";
            vm.socket.emit("cardChosen", index);
        };

        vm.socket.on("gameOver", function() {
            for (var i = 0; i < vm.cardStatus.length; i++) {
                vm.cardStatus[i] = "chosen";
            }
            $scope.$apply();
        });

        vm.socket.on("cardChosen", function (data) {
            vm.cardStatus[data.index] = "chosen";
            vm.cardInfo[data.index] = data.color;
            var message = new ChatMessage(data.user + " has chosen " + vm.cards[data.index]);
            vm.chatMessages.push(message);
            $scope.$apply();
        });

        vm.socket.on("gameStart", function () {
            vm.gameStarted = true;
            $scope.$apply();
        });

        vm.socket.on("disconnect", function () {
            var message = new ChatMessage("The game will restart in 10 seconds...", "SERVER");
            vm.socket.disconnect();
            vm.chatMessages.push(message);
            setTimeout(function() {
                location.reload();
            }, 10000);
            $scope.$apply();
        });
    }

    angular.module("app").controller("wordAssociationController", ["$scope", "$q", "$timeout", wordAssociationController]);
})();