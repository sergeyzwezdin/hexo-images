const fs = require('fs');
const path = require('path');

const smartcrop = require('smartcrop-sharp');
const sharp = require('sharp');
const imagemin = require('imagemin');
const imageminOptipng = require('imagemin-optipng');
const imageminPngquant = require('imagemin-pngquant');
const imageminAdvpng = require('imagemin-advpng');
const imageminPngout = require('imagemin-pngout');
const imageminMozJpg = require('imagemin-mozjpeg');
const imageminJpegRecompress = require('imagemin-jpeg-recompress');
const imageminGuetzli = require('imagemin-guetzli');
const imageminWebp = require('imagemin-webp');

const processImage = (imageCacheDir, file, targetFileName, originalType, type, scalePrefix, targetSize) => {
    const { size: originalFileSize } = fs.statSync(file);

    return smartcrop
        .crop(file, { width: targetSize.width, height: targetSize.height })
        .then(({ topCrop: crop }) => {
            const image = sharp(file)
                .extract({ width: crop.width, height: crop.height, left: crop.x, top: crop.y })
                .resize(targetSize.width, targetSize.height);

            if (type === 'webp') {
                return image.webp({ lossless: originalType === 'png' }).toBuffer();
            } else {
                return image.toBuffer();
            }
        })
        .then((buffer) => {
            const targetFilePath = path.join(imageCacheDir, targetFileName);

            const writeTargetFile = (optimized) => {
                if (scalePrefix === '2x' && originalType === type && optimized.length > originalFileSize) {
                    /**
                     * Use original file (without scaling/optimization) in case of
                     * optimized file is bigger than original one, target type is the same as original
                     * and scale prefix is 2x.
                     */
                    fs.copyFileSync(file, targetFilePath);
                } else {
                    /**
                     * Write optimized file
                     */
                    fs.writeFileSync(targetFilePath, optimized);
                }
                return targetFilePath;
            };

            const imageMinPlugins = [];

            if (type === 'png') {
                imageMinPlugins.push(imageminOptipng());
                imageMinPlugins.push(imageminPngquant());
                imageMinPlugins.push(imageminAdvpng());
                imageMinPlugins.push(imageminPngout());
            } else if (type === 'jpg' || type === 'jpeg') {
                imageMinPlugins.push(
                    imageminMozJpg({
                        quality: 75
                    })
                );
                imageMinPlugins.push(
                    imageminJpegRecompress({
                        quality: 'medium'
                    })
                );
                imageMinPlugins.push(
                    imageminGuetzli({
                        quality: 85
                    })
                );
            } else if (type === 'webp') {
                imageMinPlugins.push(
                    imageminWebp({
                        quality: 75,
                        preset: originalType === 'jpg' || originalType === 'jpeg' ? 'photo' : 'picture',
                        lossless: originalType === 'png'
                    })
                );
            }

            if (imageMinPlugins.length > 0) {
                return imagemin
                    .buffer(buffer, {
                        plugins: imageMinPlugins
                    })
                    .then(writeTargetFile);
            } else {
                return writeTargetFile(buffer);
            }
        });
};

module.exports = { processImage };
