const AWS = require("aws-sdk");
const KSUID = require("ksuid");

AWS.config.update({
  region: "eu-west-1",
});

const postsTable = process.env.POSTS_TABLE.split("/")[1];
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const postId = event.pathParameters.postid;

  let postIdIsKsuid = false;

  try {
    const ksuidString = KSUID.parse(postId);
    postIdIsKsuid = KSUID.isValid(ksuidString.raw);
  } catch {
    console.log("error when parsing ksuid");
  }

  let finalResult = null;

  if (postIdIsKsuid) {
    let dbParam = {
      TableName: postsTable,
      Key: {
        postId: postId,
      },
    };
    try {
      const result = await documentClient.get(dbParam).promise();
      finalResult = result.Item;
    } catch (err) {
      finalResult = {
        status: "ERROR",
      };
    }
  } else {
    let dbParam = {
      TableName: postsTable,
      IndexName: "slug",
      KeyConditionExpression: "#slug = :v_slug",
      ExpressionAttributeNames: {
        "#slug": "slug",
      },
      ExpressionAttributeValues: {
        ":v_slug": postId,
      },
    };
    try {
      const result = await documentClient.query(dbParam).promise();
      finalResult = result.Items[0];
    } catch (err) {
      finalResult = {
        status: "ERROR",
      };
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(finalResult),
  };
};
