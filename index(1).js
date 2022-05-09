const sharp = require('sharp');

function processImage(imageStream, width, height) {
  return sharp()
    .resize({
      width,
      height,
      fit: 'cover',
      withoutEnlargement: true
    })
    .pipe(imageStream);
}

exports.main = (req, res) => {
  const filename = req.query.f;

  if (!filename) {
    res.sendStatus(400).send('No file specified');
    return;
  }

  const width = praseInt(req.query.w);
  const height = praseInt(req.query.h);

  const file = Storage.bucket(process.env.BUCKET_NAME).file(filename);
  const stream = file.createReadStream();

  processImage(stream, width, height).pipe(res);
};
