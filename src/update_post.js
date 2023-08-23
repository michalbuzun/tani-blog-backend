const AWS = require("aws-sdk");
const KSUID = require("ksuid");

AWS.config.update({
  region: "eu-west-1",
});

const postsTable = process.env.POSTS_TABLE.split("/")[1];
const stepFunctionsArn = process.env.STEP_FUNCTIONS_ARN;

const documentClient = new AWS.DynamoDB.DocumentClient();
const stepfunctions = new AWS.StepFunctions();

exports.handler = async (event) => {
  const postId = event.pathParameters.postid;
  const date = new Date();
  const modifiedAt = date.toISOString();
  const requestBody = JSON.parse(event.body);

  if (!requestBody.tag) {
    requestBody.tag = "";
  }

  if (!requestBody.slug) {
    const ksuidFromSync = KSUID.randomSync();
    requestBody.slug = ksuidFromSync.string;
  }

  var dbParam = {
    TableName: postsTable,
    Key: {
      postId: postId,
    },
    UpdateExpression: [
      "set #title = :title",
      "#body = :body",
      "#mainImage = :mainImage",
      "#author = :author",
      "#shortDescription = :shortDescription",
      "#modifiedAt = :modifiedAt",
      "#isDraft = :isDraft",
      "#isFeatured = :isFeatured",
      "#slug = :slug",
      "#tag = :tag",
    ].join(","),
    ExpressionAttributeNames: {
      "#title": "title",
      "#body": "body",
      "#mainImage": "mainImage",
      "#author": "author",
      "#shortDescription": "shortDescription",
      "#modifiedAt": "modifiedAt",
      "#isDraft": "isDraft",
      "#isFeatured": "isFeatured",
      "#slug": "slug",
      "#tag": "tag",
    },
    ExpressionAttributeValues: {
      ":title": requestBody.title,
      ":body": requestBody.body,
      ":mainImage": requestBody.mainImage,
      ":author": requestBody.author,
      ":shortDescription": requestBody.shortDescription,
      ":modifiedAt": modifiedAt,
      ":isDraft": requestBody.isDraft,
      ":isFeatured": requestBody.isFeatured,
      ":slug": requestBody.slug,
      ":tag": requestBody.tag,
    },
    ReturnValues: "ALL_NEW",
  };

  console.log("Updating the item...");

  let finalResult = null;

  try {
    await documentClient.update(dbParam).promise();
    finalResult = {
      status: "OK",
    };
  } catch (err) {
    console.log("error z dynamoDB: ", err);
    finalResult = {
      status: "ERROR",
    };
  }

  // start application rebuild
  const stepExecutionRandomNumber = KSUID.randomSync();

  const params = {
    stateMachineArn: stepFunctionsArn,
    input: JSON.stringify({ start: true }),
    name: stepExecutionRandomNumber.string,
  };

  await stepfunctions.startExecution(params).promise();

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,DELETE",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(finalResult),
  };
};
