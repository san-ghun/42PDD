import http from "http";
import express from "express";
import WebSocket from "ws";

const app = express();

// set templating engine
app.set("view engine", "pug");
// set template directory
app.set("views", __dirname + "/views");
// use public path locating file like JS file to be executed at FrontEnd
app.use("/public", express.static(__dirname + "/public"));

// route handler 
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);
// app.listen(3000, handleListen);

// Create a http server 
const server = http.createServer(app);
// Create ws server on top of http server, to access and share the port
const wss = new WebSocket.Server({ server });

const sockets = [];

wss.on("connection", (socket) => {
    sockets.push(socket);
    console.log("Connected to Browser ✅");
    socket.on("close", () => console.log("Disconnected from Browser"));
    socket.on("message", (message) => {
        sockets.forEach((aSocket, i) => aSocket.send(`${message.toString()}`));
    });
});

server.listen(3000, handleListen);