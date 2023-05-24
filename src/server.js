/* 
Note: 
  The import statement is only available in Node.js versions 
    that support ES modules (i.e., version 13.2.0 or later). 
  If you are using an earlier version of Node.js, 
    you will need to use the require() function.
*/

"use strict";

// Import necessary modules
const http = require("http");
const socketIO = require("socket.io");
import { instrument } from "@socket.io/admin-ui";
const express = require("express");

// Create an Express application
const app = express();

// Set up the view engine and template directory
app.set("view engine", "pug");
app.set("views", __dirname + "/views");

// Serve static files from the public directory
app.use("/public", express.static(__dirname + "/public"));

// Define route handlers
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

// Create an HTTP server using the Express app
const httpServer = http.createServer(app);

// Create a WebSocket server using the HTTP server
// const wsServer = socketIO(httpServer);
const wsServer = socketIO(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});
instrument(wsServer, {
  auth: false,
});

// Handle incoming WebSocket connections
wsServer.on("connection", (socket) => {
  // Handle joining a room and sending a welcome message
  socket.on("join_room", (roomName) => {
    socket.join(roomName);
    socket.to(roomName).emit("welcome");
  });

  // Handle sending an offer to a room
  socket.on("offer", (offer, roomName, username) => {
    socket.to(roomName).emit("offer", offer, username);
  });

  // Handle sending an answer to a room
  socket.on("answer", (answer, roomName, username) => {
    socket.to(roomName).emit("answer", answer, username);
  });

  // Handle sending ICE candidates to a room
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });

  // TODO: Handle leaving a room and send a bye message
  socket.on("leave_room", (roomName) => {
    socket.to(roomName).emit("bye");
    socket.leave(roomName);
  });

  // TODO: Handle disconnect
  socket.on("disconnect", (reason) => {
    socket.to(socket.roomName).emit("bye", reason);
  });
});

// Start the HTTP server
const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
