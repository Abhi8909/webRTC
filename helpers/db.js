/**
 * Data access layer
 *
 */

// Dependencies
const AWS = require("aws-sdk");

// DAL container
const db = {};

/**
 * @params table, keySchema and item attributes
 *
 */

db.createTable = function (table, keySchema, attributes) {
  return new Promise((res, rej) => {
    const dynamodb = new AWS.DynamoDB();

    const params = {
      TableName: table,
      KeySchema: keySchema,
      AttributeDefinitions: attributes,
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10,
      },
    };

    dynamodb.createTable(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to create table. Error JSON:",
          JSON.stringify(err, null, 2)
        );
        res(true, JSON.stringify(err, null, 2));
      } else {
        console.log(
          "Created table. Table description JSON:",
          JSON.stringify(data, null, 2)
        );
        res(false, JSON.stringify(data, null, 2));
      }
    });
  });
};

/**
 * @params table and item
 *
 */

db.save = function (table, item) {
  return new Promise((res, rej) => {
    const docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
      TableName: table,
      Item: item,
    };

    docClient.put(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to add item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
        res(true, JSON.stringify(err, null, 2));
      } else {
        console.log("Added item:", JSON.stringify(item, null, 2));
        res(false, JSON.stringify(data, null, 2));
      }
    });
  });
};

/**
 * @params table and query
 *
 */

db.get = function (params) {
  return new Promise((res, rej) => {
    const docClient = new AWS.DynamoDB.DocumentClient();

    docClient.get(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to fetch subscribers. Error JSON:",
          JSON.stringify(err, null, 2)
        );
        res([]);
      } else {
        console.log("Fetched item:", data.Count);
        let result = [];
        if (data.Item) {
          result.push(data.Item);
        } else if (data.Items) {
          result = data.Items;
        }
        res(result);
      }
    });
  });
};

db.update = function (params) {
  return new Promise((res, rej) => {
    const docClient = new AWS.DynamoDB.DocumentClient();

    docClient.update(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to Update the document. Error JSON:",
          JSON.stringify(err, null, 2)
        );
        res(true);
      } else {
        console.log("UpdatedItem :");
        res(false);
      }
    });
  });
};

db.scan = function (params) {
  return new Promise((res, rej) => {
    const docClient = new AWS.DynamoDB.DocumentClient();

    docClient.scan(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to fetch. Error JSON:",
          JSON.stringify(err, null, 2)
        );
        res([]);
      } else {
        console.log("Fetched item:", data.Count);
        let result = [];

        if (data.Item) {
          result.push(data.Item);
        } else if (data.Items) {
          result = data.Items;
        }

        res(result);
      }
    });
  });
};

db.delete = function (params) {
  return new Promise((res, rej) => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    docClient.delete(params, function (err, data) {
      if (err) {
        console.error("Item delete failed:", JSON.stringify(err, null, 2));
        res(true);
      } else {
        console.log("Item deleted successfully:");
        res(false);
      }
    });
  });
};

// Export the Module
module.exports = db;
