global.port = process.env.PORT || 3000;
global.staticPath = "public";
global.enableAuth = 0;
global.env = "DEV";
global.appVersion = "0.0.1";

global.tables = {
  chats: "chats",
  channels: "channels",
};

global.groups = {};

global.users = [];

global.confChannels = {};
