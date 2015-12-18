
/**
 * Module dependencies.
 */

var express = require("express");
var routes = require("./routes");
var path = require("path");

var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

// all environments
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.use(express.favicon());
app.use(express.logger("dev"));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require("stylus").middleware(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public")));

// development only
if ("development" == app.get("env")) {
    app.use(express.errorHandler());
}

//
//Server game code - needs to be externalized
//

var rng = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var randomizeArray = function (input) {
    var output = [];
    var arr = input.slice();
    for (var i = arr.length; i > 0; i--) {
        var remIndex = rng(0, i-1);
        var removed = arr.splice(remIndex, 1);
        output.push(removed[0]);
    }
    
    return output;
};

var answers = [];
var goFirst = null;

var createAnswers = function () {
    var possibleAnswers = ["red", "red", "red", "red", "red", "red", "red", "red", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "none", "none", "none", "none", "none", "none", "none", "death"];

    var goFirstNum = rng(1, 2);
    goFirst = goFirstNum === 1 ? "red" : "blue";
    goFirst === "red"
        ? possibleAnswers.push("red")
        : possibleAnswers.push("blue");

    answers = randomizeArray(possibleAnswers);
};

var getTeamColorCount = function (color) {
    var count = 0;
    for (var i = 0; i < io.sockets.sockets.length; i++) {
        if (io.sockets.sockets[i].teamColor === color) count++;
    }
    return count;
};

var isRoleFilled = function (teamColor, role) {
    for (var i = 0; i < io.sockets.sockets.length; i++) {
        if (io.sockets.sockets[i].teamColor === teamColor && io.sockets.sockets[i].role === role) return true;
    }
    return false;
};

io.sendServerMessage = function (msg) {
    io.emit("chat", {
        message: msg,
        sender: serverUsername
    });
};

createAnswers();

var serverUsername = "SERVER";
var seed = rng(1, 999999);
var gameStarted = false;
var playerCount = 0;
var currentTeam = null;

io.on("connection", function (socket) {
    
    socket.sendServerMessage = function (msg) {
        socket.emit("chat", {
            message: msg,
            sender: serverUsername
        });
    };
    
    socket.broadcastServerMessage = function (msg) {
        socket.broadcast.emit("chat", {
            message: msg,
            sender: serverUsername
        });
    };

    console.log("Client has connected: " + socket.handshake.address);
    //socket variable init
    socket.username = null;
    socket.teamColor = null;
    socket.role = null;
    socket.readyToPlay = false;

    socket.sendServerMessage("Please enter a username");

    socket.on("chat", function (data) {
        //initialization
        //username not set
        if (!socket.username) {
            if (data.toLowerCase() !== "you") {
                socket.username = data;
                socket.emit("usernameSet", socket.username);
                socket.emit("setSeed", seed);
                socket.broadcastServerMessage(socket.username + " has connected");
                socket.sendServerMessage("Your username has been set to: " + socket.username);
                socket.sendServerMessage("Please select a team color (red or blue)");
            } else {
                socket.sendServerMessage("That is a reserved username - Please try again");
                socket.sendServerMessage("Please enter a username");
            }
            return;
        }
        
        //team color selection
        if (!socket.teamColor) {
            var color = data.toLowerCase();
            if (color !== "red" && color !== "blue") {
                socket.sendServerMessage("Invalid color selection - Please try again");
                socket.sendServerMessage("Please select a team color (red or blue)");
            } else if (getTeamColorCount(color) >= 2) {
                socket.sendServerMessage("That team is already full - Please try again");
                socket.sendServerMessage("Please select a team color (red or blue)");
            } else {
                socket.teamColor = color;
                socket.emit("teamColorSet", socket.teamColor);
                socket.sendServerMessage("Your team color has been set to: " + socket.teamColor);
                socket.sendServerMessage("Please select a role (guesser or cluegiver)");
                socket.broadcastServerMessage(socket.username + " has chosen " + socket.teamColor + " team");
            }
            return;
        }

        if (!socket.role) {
            var role = data.toLowerCase();
            if (role !== "guesser" && role !== "cluegiver") {
                socket.sendServerMessage("Invalid role selection - Please try again");
                socket.sendServerMessage("Please select a role (guesser or cluegiver)");
            } else if (isRoleFilled(socket.teamColor, role)) {
                socket.sendServerMessage("That role is already taken on this team - Please try again");
                socket.sendServerMessage("Please select a role (guesser or cluegiver)");
            } else {
                socket.role = role;
                socket.readyToPlay = true;
                playerCount++;
                socket.emit("roleSet", socket.role);
                socket.sendServerMessage("Your role has been set to: " + socket.role);
                socket.broadcastServerMessage(socket.username + " has chosen " + socket.role + " as their role");
            }

            if (socket.role === "cluegiver") {
                socket.emit("cardInfo", answers);
            }
        }
        
        //game start handling
        if (!gameStarted) {
            if (playerCount >= 4) {
                gameStarted = true;
                currentTeam = goFirst;
                io.sendServerMessage("The game is starting");
                io.sendServerMessage(currentTeam + " team goes first");
            } else {
                socket.sendServerMessage("Waiting for additional players");
            }
        }

        //standard chat handling
        else {
            var output = {
                message: data,
                sender: socket.username
            };
            socket.broadcast.emit("chat", output);
        }
    });

    socket.on("disconnect", function() {
        console.log("Client has disconnected: " + socket.handshake.address + " (username: " + socket.username + ")");
        if (socket.username) {
            io.emit("chat", {
                message: socket.username + " has disconnected",
                sender: serverUsername
            });
        }
        if (socket.readyToPlay) {
            playerCount--;
        }
    });
});

//
//End server game code
//

app.get("/", routes.index);
app.get("/about", routes.about);
app.get("/contact", routes.contact);
app.get("/wordassociation", routes.wordassociation);

http.listen(app.get("port"), function () {
    console.log("Express server listening on port " + app.get("port"));
});