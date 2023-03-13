import express from "express";

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
app.listen(3000, handleListen);