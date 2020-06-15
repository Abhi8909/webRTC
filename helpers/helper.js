/**
 * Contains all the helpers methods
 *
 */

const cryptoRandomString = require("crypto-random-string");

const _db = require("../helpers/db");

// Container of the helper
let helper = {};

helper.createMessage = (req) => {
  return {
    id: cryptoRandomString({ length: 25, type: "base64" }),
    msg: req.msg,
    chId: req.chId,
    isSent: true,
    sentAt: Date.now(),
    isEdited: false,
    editedAt: null,
    isDelivered: false,
    deliveredAt: null,
    isDeleted: false,
    deletedAt: null,
    isRead: false,
    readAt: null,
    isForwarded: false,
    forwardedAt: null,
    timeStamp: Date.now(),
    senderId: req.senderId,
    meta: {},
    editHistory: [],
    _v: global.appVersion,
  };
};

helper.createChannel = (req) => {
  return {
    chId: cryptoRandomString({ length: 25, type: "base64" }),
    title: req.title,
    tenantId: req.tenantId || "tenant123",
    participants: [],
    createdAt: Date.now(),
    createdBy: req.creator,
    updatedAt: null,
    updatedBy: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    status: "",
    meta: {},
    _v: global.appVersion,
  };
};

/**
 * Update the msg status on different
 * points read delivered and deleted
 *
 * @param req Obeject
 * @returns boolean
 *
 * */
helper.updateMsg = (r, type) => {
  return new Promise(async (res, rej) => {
    let updateExpression = "";
    let expressionAttributeNames = {};
    let expressionAttributeValues = {};

    switch (type) {
      case "delivered":
        updateExpression = "SET #isDelivered = :v1, #deliveredAt = :v2";
        expressionAttributeNames = {
          "#isDelivered": "isDelivered",
          "#deliveredAt": "deliveredAt",
        };
        break;

      case "read":
        updateExpression = "SET #isRead = :v1, #readAt = :v2";
        expressionAttributeNames = {
          "#isRead": "isRead",
          "#readAt": "readAt",
        };
        break;

      case "deleted":
        updateExpression = "SET #isDeleted = :v1, #deletedAt = :v2";
        expressionAttributeNames = {
          "#isDeleted": "isDeleted",
          "#deletedAt": "deletedAt",
        };
        break;

      default:
        break;
    }

    expressionAttributeValues = {
      ":v1": true,
      ":v2": Date.now(),
    };

    let params = {
      TableName: global.tables.chats,
      Key: {
        id: r.msgId,
      },
      ReturnValues: "ALL_NEW",
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    let result = await _db.update(params);

    res(result);
  });
};

// Export the module
module.exports = helper;
