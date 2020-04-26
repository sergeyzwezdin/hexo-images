const path = require('path');

const generateFileName = (basePath, hash, size, ext) =>
    `${hash}/${path
        .basename(basePath, path.extname(basePath))
        .replace(/\.noresize$/gi, '')
        .replace(/\@cover\./gi, '.')}@${size}.${ext}`.toLowerCase();

module.exports = { generateFileName };
