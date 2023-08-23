const AWS = require("aws-sdk");

AWS.config.update({
  region: "eu-west-1",
});

const postsTable = process.env.POSTS_TABLE.split("/")[1];
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  let dbParam = {
    TableName: postsTable,
    AttributesToGet: [
      "postId",
      "isFeatured",
      "slug",
      "title",
      "mainImage",
      "modifiedAt",
      "shortDescription",
      "author",
    ],
  };

  if (event.queryStringParameters && event.queryStringParameters.limit) {
    dbParam["Limit"] = event.queryStringParameters.limit;
  }
  let response = await documentClient.scan(dbParam).promise();
  let result = response["Items"];

  while ("LastEvaluatedKey" in response) {
    dbParam["ExclusiveStartKey"] = response["LastEvaluatedKey"];
    response = await documentClient.scan(dbParam).promise();
    result = [...result, ...response["Items"]];
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,DELETE",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(result),
  };
};
