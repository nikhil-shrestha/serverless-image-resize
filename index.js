const AWS = require('aws-sdk');
const sharp = require('sharp');
const stream = require('stream');

const width = 400;
const prefix = `${width}w`;

const S3 = new AWS.S3();

// Read stream for downloading from S3
function readStreamFromS3({ Bucket, Key }) {
  return S3.getObject({ Bucket, Key }).createReadStream();
}

// Write stream for uploading to S3
function writeStreamToS3({ Bucket, Key }) {
  const pass = new stream.PassThrough();

  return {
    writeStream: pass,
    upload: S3.upload({
      Key,
      Bucket,
      Body: pass
    }).promise()
  };
}

// Sharp resize stream
function streamToSharp(width) {
  return sharp().resize(width);
}

exports.handler = async (event, context) => {
  const s3Record = event.Records[0].s3;

  // Read options from the event parameter.
  const Key = s3Record.object.key;
  const Bucket = s3Record.bucket.name;
  const sanitizedKey = key.replace(/\+/g, ' ');
  const keyWithoutExtension = sanitizedKey.replace(/.[^.]+$/, '');

  // Infer the image type from the file suffix.
  const typeMatch = sanitizedKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    context.fail('Could not determine the image type.');
  }

  // Check that the image type is supported
  const extension = typeMatch[1].toLowerCase();
  if (
    extension != 'jpg' &&
    extension != 'png' &&
    extension != 'gif' &&
    extension != 'webp'
  ) {
    context.fail(`Unsupported image type: ${extension}`);
  }

  // Create the new filename with the dimensions
  const newKey = `${keyWithoutExtension}_${prefix}.${extension}`;

  // Stream to read the file from the bucket
  const readStream = readStreamFromS3({ Key, Bucket });

  // Stream to resize the image
  const resizeStream = streamToSharp(width);
  // Stream to upload to the bucket
  const { writeStream, upload } = writeStreamToS3({
    Bucket,
    Key: newKey
  });

  // Trigger the streams
  readStream.pipe(resizeStream).pipe(writeStream);

  // Wait for the file to upload
  await upload;

  context.succeed();
};
