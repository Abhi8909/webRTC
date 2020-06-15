/**
 * Handles all chat related APIs
 *
 */

// Dependencies
const router = require("express").Router();

// Helpers
const _db = require("../helpers/db");
const helper = require("../helpers/helper");

router.get("/", (req, res) => {
  let chId = req.query.chId;

  let params = {
    TableName: global.tables.chats,
    Key: {
      FilterExpression: "chId = :val",
      ExpressionAttributeValues: { ":val": chId },
    },
  };
  _db
    .scan(params)
    .then((msgs) => {
      if (Array.isArray(msgs) && msgs.length > 0) {
        res.send(msgs);
      } else {
        res.send([]);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send({ err: err });
    });
});

router.get("/channel", (req, res) => {
  let tenantId = req.query.tenantId;

  var params = {
    TableName: global.tables.channels,
    FilterExpression: "tenantId = :val",
    ExpressionAttributeValues: { ":val": tenantId },
  };

  if (!tenantId)
    return res.status(400).send({ error: "Missing required fields" });

  _db.scan(params).then((channels) => {
    if (Array.isArray(channels) && channels.length > 0) {
      res.send(channels);
    } else {
      res.send([]);
    }
  });
});

router.post("/channel", (req, res) => {
  let channel = helper.createChannel(req.body);
  _db.save(global.tables.channels, channel).then((err) => {
    if (!err) {
      res.send({ msg: "Channel saved Successfully" });
    } else {
      res
        .status(500)
        .send({ error: "Could not saved the channel. Something went wrong" });
    }
  });
});

router.put("/channel", (req, res) => {
  let r = req.body;

  if (!r.chId)
    return res.status(403).send({ error: "Required fields missing" });

  let query = getChannelUpdateQuery(r);

  let updateExpression = query.updateExpression;
  let expressionAttributeNames = query.expressionAttributeNames;
  let expressionAttributeValues = query.expressionAttributeValues;

  let params = {
    TableName: global.tables.channels,
    Key: {
      chId: r.chId,
    },
    ReturnValues: "ALL_NEW",
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  _db.update(params).then((err) => {
    if (!err) {
      res.send({ msg: "Partipant added Successfully" });
    } else {
      res
        .status(500)
        .send({ error: "Could not update the channel. Something went wrong" });
    }
  });
});

router.delete("/channel", (req, res) => {
  let r = req.body;

  let params = {
    TableName: global.tables.channels,
    Key: {
      chId: r.chId,
    },
  };
  _db.delete(params).then((err) => {
    if (!err) {
      res.send({ msg: "Item deleted successfully:" });
      // TODO log the operation
    } else {
      res.status(500).send({ error: "Item deleted failed:" });
    }
  });
});

router.post("/channel/addParticipant", (req, res) => {
  let r = req.body;

  let params = {
    TableName: global.tables.channels,
    Key: {
      chId: r.chId,
    },
    UpdateExpression:
      "set #participants = list_append(if_not_exists(#participants, :empty_list), :participant)",
    ExpressionAttributeNames: {
      "#participants": "participants",
    },
    ExpressionAttributeValues: {
      ":participant": [
        {
          name: r.name,
          id: r.user_id || `${r.name}123`,
        },
      ],
      ":empty_list": [],
    },
  };

  _db.update(params).then((err) => {
    if (!err) {
      res.send({ msg: "Partipant added Successfully" });
    } else {
      res
        .status(500)
        .send({ error: "Could not add the Partipant. Something went wrong" });
    }
  });
});

router.post("/channel/removeParticipant", (req, res) => {
  let r = req.body;

  let params = {
    TableName: global.tables.channels,
    Key: {
      chId: r.chId,
    },
    ProjectionExpression: "participants",
  };

  _db
    .get(params)
    .then((data) => {
      if (
        data &&
        data[0] &&
        data[0].participants &&
        data[0].participants.length > 0
      ) {
        let participantIndexToRemove = data[0].participants.findIndex(
          (p) => p.id === r.user_id
        );
        if (participantIndexToRemove > -1) {
          // remove the paritcipant{{
          delete params.ProjectionExpression;
          params.UpdateExpression = `REMOVE participants[${participantIndexToRemove}]`;
          params.ReturnValues = "ALL_NEW";

          _db.update(params).then((err) => {
            if (!err) {
              res.send({ msg: "Particiapnt removed successfully" });
            } else {
              res
                .status(502)
                .send({ err: "Could not removed the participant.Try again" });
            }
          });
        } else {
          res.send({
            msg: "Participant Already removed",
          });
        }
      } else {
        res.status(404).send({
          err: "Could not find the channel to delete the participant",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({ err: "Something went wrong" });
    });
});

const getChannelUpdateQuery = (r) => {
  let updateExpression = "";
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  switch (r.type) {
    case "title":
      updateExpression = "SET #title = :v1, #updatedAt = :v2, #updatedBy = :v3";
      expressionAttributeNames = {
        "#title": "title",
        "#updatedAt": "updatedAt",
        "#updatedBy": "updatedBy",
      };
      expressionAttributeValues = {
        ":v1": r.title,
        ":v2": Date.now(),
        ":v3": r.user_id,
      };
      break;

    default:
      break;
  }

  return {
    updateExpression,
    expressionAttributeNames,
    expressionAttributeValues,
  };
};

//Export the module
module.exports = router;
