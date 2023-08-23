// Funciton not used, it is left to show how to get item from s3

const AWS = require("aws-sdk");

AWS.config.update({
  region: "eu-west-1",
});

const IMAGES_BUCKET = process.env.IMAGES_BUCKET;

const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: IMAGES_BUCKET },
});

exports.handler = (event, context, callback) => {
  const fileName = event.pathParameters.fileName;

  if (!fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing file name." }),
    };
  }

  const params = {
    Bucket: IMAGES_BUCKET,
    Key: fileName,
  };

  s3.getObject(params, function (err, data) {
    if (err) console.log(err, err.stack);
    else {
      const imageBinary = data.Body;
      const buffer = Buffer.from(imageBinary, "base64");

      callback(null, {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET,DELETE",
          "Access-Control-Allow-Credentials": true,
          "Content-Type": "image/png",
        },
        body: buffer.toString("utf8"),
        isBase64Encoded: true,
      });
    }
  });
};
