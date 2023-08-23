const AWS = require("aws-sdk");

AWS.config.update({
  region: "eu-west-1",
});

const IMAGES_BUCKET = process.env.IMAGES_BUCKET;
const IMAGES_BUCKET_URL = process.env.IMAGES_BUCKET_URL;

const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: IMAGES_BUCKET },
});

function getValueIgnoringKeyCase(object, key) {
  const foundKey = Object.keys(object).find(
    (currentKey) => currentKey.toLocaleLowerCase() === key.toLowerCase()
  );
  return object[foundKey];
}

function getBoundary(event) {
  return getValueIgnoringKeyCase(event.headers, "Content-Type").split("=")[1];
}

const parse = (body, event, spotText) => {
  // methods coppied from this library
  // https://github.com/myshenin/aws-lambda-multipart-parser/blob/master/index.js

  const boundary = getBoundary(event);
  const result = {};
  body.split(boundary).forEach((item) => {
    if (/filename=".+"/g.test(item)) {
      result[item.match(/name=".+";/g)[0].slice(6, -2)] = {
        type: "file",
        filename: item.match(/filename=".+"/g)[0].slice(10, -1),
        contentType: item.match(/Content-Type:\s.+/g)[0].slice(14),
        content: spotText
          ? Buffer.from(
            item.slice(
              item.search(/Content-Type:\s.+/g) +
              item.match(/Content-Type:\s.+/g)[0].length +
              4,
              -4
            ),
            "binary"
          )
          : item.slice(
            item.search(/Content-Type:\s.+/g) +
            item.match(/Content-Type:\s.+/g)[0].length +
            4,
            -4
          ),
      };
    } else if (/name=".+"/g.test(item)) {
      result[item.match(/name=".+"/g)[0].slice(6, -1)] = item.slice(
        item.search(/name=".+"/g) + item.match(/name=".+"/g)[0].length + 4,
        -4
      );
    }
  });
  return result;
};

const makeFilename = (length) => {
  var result = "";
  var characters = "abcdefghijklmnopqrstuvwxyz";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

exports.handler = async (event) => {
  const bodyDecoded = Buffer.from(event.body, "base64");
  const result = parse(bodyDecoded.toString("binary"), event, true);
  let fileExtension = "";
  let fileName = "";
  if (result.file) {
    fileExtension = result.file.filename.split(".")[1];
    let fileBegining = makeFilename(50);
    fileName = `${fileBegining}.${fileExtension}`;
    await s3
      .upload({
        Key: fileName,
        Body: Buffer.from(result.file.content),
      })
      .promise();
  }

  if (result.image) {
    fileExtension = result.image.filename.split(".")[1];
    let fileBegining = makeFilename(50);

    fileName = `${fileBegining}.${fileExtension}`;
    try {
      await s3
        .upload({
          Key: fileName,
          Body: Buffer.from(result.image.content),
        })
        .promise();
    } catch (e) {
      console.log("ERROR updating to s3: ", e);
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,DELETE",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({
      success: 1,
      file: {
        url: IMAGES_BUCKET_URL + fileName,
        name: fileName,
      },
    }),
  };
};
