/**
 * Contains all resources to setup the server
 *
 */
const socketIO = require("socket.io");
const helper = require("./helpers/helper");
const _db = require("./helpers/db");
const startup = {};

/**
 * @params app express instance
 * @returns boolean
 *
 */
startup.init = async (app) => {
  await server(app);
  await socket();
  await initSocket();
};

const server = (app) => {
  return new Promise((res, rej) => {
    global.server = app.listen(global.port, () => {
      console.log("Server Up Port -> " + global.port);
      console.log("Server Time");
      console.log(new Date());
      res();
    });
  });
};

const socket = () => {
  return new Promise((res, rej) => {
    global.io = socketIO.listen(global.server);
    res();
  });
};

const initSocket = () => {
  return new Promise((res, rej) => {
    global.io.on("connect", (socket) => {
      console.log(socket.id + " connceted");
      // send peer to peer integration
      socket.on("sendNewMsg", (req, groupName) => {
        let msg = helper.createMessage({
          msg: req.msg,
          senderId: socket.id, // will be replace by user id in prod
          chId: req.chId || "ch123",
        });
        let user = null;

        _db.save(global.tables.chats, msg).then((err) => {
          if (!err) {
            if (groupName) {
              user = global.groups[groupName].users.find(
                (r) => r.socketId === socket.id
              );
              msg.name = user ? user.username : "";
              socket.to(groupName).broadcast.emit("receiveMessage", msg);
            } else {
              if (!req.id) return;
              user = global.users.find((r) => r.socketId === socket.id);
              msg.name = user ? user.username : "";
              global.io.to(req.id).emit("receiveMessage", msg);
            }
          } else {
            // send socket message could not be send pls retry
          }
        });
      });

      // send message to every one conncetd
      socket.on("broadcastMessage", (msg) => {
        socket.broadcast.emit("receiveMessage", {
          msg: msg,
          timeStamp: Date.now(),
        });
      });

      socket.on("disconnect", () => {
        let arr = getUserRooms(socket, global.groups);
        let confChanelArr = getUserRooms(socket, global.confChannels);
        let uIndex = -1;
        let removedUser = null;

        if (confChanelArr.length > 0) {
          confChanelArr.forEach((r) => {
            uIndex = global.confChannels[r].users.findIndex(
              (r) => r.socketId === socket.id
            );
            if (uIndex > -1) {
              removedUser = global.confChannels[r].users[uIndex];
              if (removedUser) {
                console.log(removedUser.username + " disconncetd");
                global.confChannels[r].users.splice(uIndex, 1);
                for (var user of global.confChannels[r].users) {
                  process.nextTick(() => {
                    delete removedUser.socket;
                    user.socket.emit("userLeftConfCall", removedUser);
                  });
                }
              }
            }
          });
        }

        if (arr.length > 0) {
          arr.forEach((r) => {
            uIndex = global.groups[r].users.findIndex(
              (r) => r.socketId === socket.id
            );
            if (uIndex > -1) {
              removedUser = global.groups[r].users[uIndex];
              if (removedUser) {
                console.log(removedUser.username + " disconncetd");
                global.groups[r].users.splice(uIndex, 1);
                socket.to(r).broadcast.emit("userLeft", removedUser);
              }
            }
          });
        } else {
          uIndex = (global.users || []).findIndex(
            (r) => r.socketId === socket.id
          );
          if (uIndex > -1) {
            removedUser = global.users[uIndex];
            if (removedUser) {
              console.log(removedUser.username + " disconncetd");
              global.users.splice(uIndex, 1);
              socket.broadcast.emit("userUnRegistered", removedUser);
            }
          }
        }
      });

      socket.on("newUser", (username, groupName) => {
        let newUser = {
          username: username,
          socketId: socket.id,
        };

        if (groupName) {
          if (global.groups[groupName]) {
            socket.join(groupName);
            global.groups[groupName].users.push(newUser);
            global.io.to(groupName).emit("userJoined", newUser);
          }
        } else {
          global.users.push(newUser);
          console.log(username + " Added");
          socket.broadcast.emit("userRegistered", newUser);
        }
      });

      socket.on("startTyping", (user, room) => {
        if (room) {
          socket.to(room).broadcast.emit("startTyping", user);
        } else {
          global.io.to(user).emit("startTyping");
        }
      });

      socket.on("stopTyping", (user, room) => {
        if (room) {
          socket.to(room).broadcast.emit("stopTyping", user);
        } else {
          global.io.to(user).emit("stopTyping");
        }
      });

      socket.on("delivered", (msgId) => {
        helper.updateMsg({ msgId: msgId }, "delivered").then((err) => {
          if (!err) {
            console.log("Message marked delivered success");
          } else {
            console.log("Message marked delivered failed");
          }
        });
      });

      /**
       * Video Call socket handling
       *
       */
      socket.on("makeCall", (req, channelId) => {
        let payload = {
          offer: req.offer,
          id: socket.id,
        };

        if (channelId) {
          if (
            global.confChannels[channelId] &&
            global.confChannels[channelId].users
          ) {
            for (var user of global.confChannels[channelId].users) {
              if (user.socketId === req.id) {
                user.socket.emit("callMade", payload);
              }
            }
          }
        } else {
          global.io.to(req.id).emit("callMade", payload);
        }
      });

      socket.on("answerCall", (req, channelId) => {
        let payload = {
          ans: req.ans,
          id: socket.id,
        };

        if (channelId) {
          if (
            global.confChannels[channelId] &&
            global.confChannels[channelId].users
          ) {
            for (var user of global.confChannels[channelId].users) {
              if (user.socketId === req.id) {
                user.socket.emit("callAnswered", payload);
              }
            }
          }
        } else {
          global.io.to(req.id).emit("callAnswered", payload);
        }
      });

      socket.on("callRejected", (req, channelId) => {
        if (channelId) {
        } else {
          global.io.to(req.id).emit("callRejected", {
            id: socket.id,
          });
        }
      });

      socket.on("endCall", (req, channelId) => {
        if (channelId) {
          if (
            global.confChannels[channelId] &&
            global.confChannels[channelId].users
          ) {
            global.confChannels[channelId].users.forEach((user) => {
              if (user.socketId === req.id) {
                user.socket.emit("callEnded");
              }
            });
          }
        } else {
          global.io.to(req.id).emit("callEnded");
        }
      });

      socket.on("iceCandidate", (req, channelId) => {
        let payload = {
          iceCandidate: req.iceCandidate,
          id: socket.id,
        };

        if (channelId) {
          if (
            global.confChannels[channelId] &&
            global.confChannels[channelId].users
          ) {
            for (var user of global.confChannels[channelId].users) {
              if (user.socketId === req.id) {
                user.socket.emit("iceCandidate", payload);
              }
            }
          }
        } else {
          global.io.to(req.id).emit("iceCandidate", payload);
        }
      });

      socket.on("upgradeCall", (req, channelId) => {
        if (channelId) {
        } else {
          global.io.to(req.id).emit("callUpgraded", {
            id: socket.id,
          });
        }
      });

      socket.on("downgradeCall", (req, channelId) => {
        if (channelId) {
        } else {
          global.io.to(req.id).emit("callDowngrade", {
            id: socket.id,
          });
        }
      });

      /**
       * Video Conf Call socket handling
       *
       */

      socket.on("addUserInConfCall", (username, channelId) => {
        let newUser = {
          username: username,
          socketId: socket.id,
          socket: socket,
        };

        if (global.confChannels[channelId]) {
          global.confChannels[channelId].users.push(newUser);

          for (var user of global.confChannels[channelId].users) {
            if (user.socketId !== socket.id) {
              user.socket.emit("userAddedInConfCall", {
                username: username,
                socketId: socket.id,
              });
            }
          }
        }
      });

      socket.on("userLeftConfCall", (username, channelId) => {
        if (
          global.confChannels[channelId] &&
          global.confChannels[channelId].users
        ) {
          uIndex = global.confChannels[channelId].users.findIndex(
            (r) => r.socketId === socket.id
          );
          if (uIndex > -1) {
            removedUser = global.confChannels[channelId].users[uIndex];
            if (removedUser) {
              console.log(removedUser.username + " disconncetd");
              global.confChannels[channelId].users.splice(uIndex, 1);

              for (var user of global.confChannels[channelId].users) {
                if (user.socketId !== socket.id) {
                  console.log("user removed " + removedUser.name);
                  delete removedUser.socket;
                  user.socket.emit("userLeftConfCall", removedUser);
                }
              }
            }
          }
        }
      });
    });
    res();
  });
};

const getUserRooms = (socket, reqObj) => {
  let names = [];

  Object.keys(reqObj).forEach((gName) => {
    let userInRoom = reqObj[gName].users.find((r) => r.socketId === socket.id);
    if (userInRoom) names.push(gName);
  });

  return names;
};

// Export the module
module.exports = startup;
