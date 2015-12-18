
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

//socket.io
io.on("connection", function(socket) {
    console.log("Client has connected");
    socket.username = "Name";

    socket.on("chat", function (data) {
        var output = {
            message: data,
            sender: socket.username
        };
        socket.broadcast.emit("chat", output);
    });

    socket.on("disconnect", function() {
        console.log("Client has disconnected");
    });
});

app.get("/", routes.index);
app.get("/about", routes.about);
app.get("/contact", routes.contact);
app.get("/wordassociation", routes.wordassociation);

http.listen(app.get("port"), function () {
    console.log("Express server listening on port " + app.get("port"));
});