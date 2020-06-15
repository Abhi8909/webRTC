"use strict";

const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const cryptoRandomString = require("crypto-random-string");

const __startup = require("./startup");
const chat = require("./router/chat");

require("./config");
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/views/index.html"));
});

app.get("/groupchat", (req, res) => {
  res.sendFile(path.join(__dirname, "public/views/groupChat.html"));
});

app.get("/groupchat/:room", (req, res) => {
  res.sendFile(path.join(__dirname, "public/views/room.html"));
});

app.get("/confCall", (req, res) => {
  res.sendFile(path.join(__dirname, "public/views/confCall.html"));
});

app.get("/confCall/:chId", (req, res) => {
  res.sendFile(path.join(__dirname, "public/views/call.html"));
});

app.use("/api/chat", chat);

/**
 * Temp APIs for testing
 * purpose
 *
 */
app.get("/users", (req, res) => {
  res.send(global.users || []);
});

app.get("/groups", (req, res) => {
  res.send(global.groups || {});
});

app.post("/createGroup", (req, res) => {
  let gName = req.body.group.replace(" ", "_");
  if (!global.groups) global.groups = {};
  if (!global.groups[gName]) {
    global.groups[gName] = { users: [] };
    res.redirect("groupchat/" + gName);
    global.io.emit("newGroupCreated", gName);
  } else {
    res.redirect("/groupchat");
  }
});

app.post("/createConfChannel", (req, res) => {
  let confChId = cryptoRandomString({ length: 16, type: "url-safe" });
  if (!global.confChannels[confChId]) {
    global.confChannels[confChId] = { users: [] };
    res.redirect("confCall/" + confChId);
    global.io.emit("newConfChannel", confChId);
  } else {
    res.redirect("/");
  }
});

app.get("/confChannels", (req, res) => {
  if (req.query.chId) {
    let r = req.query;
    let result = [];

    if (global.confChannels[r.chId]) {
      result = global.confChannels[r.chId].users;
      result = result.map((r) => {
        return {
          username: r.username,
          socketId: r.socketId,
        };
      });
    }
    res.send(result);
  } else {
    res.send(Object.keys(global.confChannels) || []);
  }
});

// Start the server
__startup.init(app);
