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

  const dbParam = {
    TableName: postsTable,
    Key: {
      postId: postId,
    },
  };

  let finalResult = null;

  try {
    await documentClient.delete(dbParam).promise();
    finalResult = {
      status: "OK",
    };
  } catch (err) {
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
