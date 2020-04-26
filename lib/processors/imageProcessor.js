const fs = require('fs');
const path = require('path');
const imageSize = require('image-size');
const { calcScaledImageDimensionsLarge, calcScaledImageDimensionsSmall } = require('../utils/calcScaledImageDimensions');
const { reportFileGenerateSuccess, reportFileGenerateError } = require('../utils/reportFileGenerate');
const { generateFileName } = require('../utils/generateFileName');
const { processImage } = require('./image/processImage');

const generateImage = (hexo, currentManifest, imageCacheDir, file, originalType, targetType, scalePrefix, hash, targetSize) => {
    const targetFileName = generateFileName(file, hash, scalePrefix, targetType);
    if (!fs.existsSync(path.join(imageCacheDir, targetFileName))) {
        // target file doesn't exist, go generate
        return processImage(imageCacheDir, file, targetFileName, originalType, targetType, scalePrefix, targetSize)
            .then((path) => {
                if (!currentManifest.files) {
                    currentManifest.files = {};
                }
                if (originalType === targetType) {
                    currentManifest.files.default = targetFileName;
                }
                if (!currentManifest.files[targetType]) {
                    currentManifest.files[targetType] = {};
                }
                currentManifest.files[targetType][scalePrefix] = targetFileName;

                reportFileGenerateSuccess(hexo, file, path, `image/${targetType}`);
            })
            .catch((error) => reportFileGenerateError(hexo, file, targetFileName, error));
    } else {
        // target file already exist in target dir
        // it means that we already generated images for that (probably for another page)
        // so we can carefully skip it
        if (!currentManifest.files) {
            currentManifest.files = {};
        }
        if (originalType === targetType) {
            currentManifest.files.default = targetFileName;
        }
        if (!currentManifest.files[targetType]) {
            currentManifest.files[targetType] = {};
        }
        currentManifest.files[targetType][scalePrefix] = targetFileName;

        return Promise.resolve();
    }
};

const removeWebpIfBigger = (imageCacheDir, originalType, currentManifest) => () => {
    if (currentManifest.files && currentManifest.files.webp && currentManifest.files[originalType]) {
        const originalTypeFiles = currentManifest.files[originalType];
        const webpFiles = currentManifest.files.webp;

        if (webpFiles['2x'] && originalTypeFiles['2x']) {
            const { size: webpSize } = fs.statSync(path.join(imageCacheDir, webpFiles['2x']));
            const { size: originalTypeSize } = fs.statSync(path.join(imageCacheDir, originalTypeFiles['2x']));

            if (webpSize > originalTypeSize) {
                delete currentManifest.files.webp['2x'];
            }
        }

        if (webpFiles['1x'] && originalTypeFiles['1x']) {
            const { size: webpSize } = fs.statSync(path.join(imageCacheDir, webpFiles['1x']));
            const { size: originalTypeSize } = fs.statSync(path.join(imageCacheDir, originalTypeFiles['1x']));

            if (webpSize > originalTypeSize) {
                delete currentManifest.files.webp['1x'];
            }
        }

        if (!currentManifest.files.webp['1x'] && !currentManifest.files.webp['2x']) {
            delete currentManifest.files.webp;
        }
    }
};

const imageProcessor = (hexo, imageCacheDir, file, currentManifest, dimensions, shortFileHash) => {
    const { type: originalType, ...imageInfo } = imageSize(file);
    const largeImageSize = calcScaledImageDimensionsLarge(imageInfo.width, imageInfo.height, dimensions.maxLargeImageWidth);
    const smallImageSize = calcScaledImageDimensionsSmall(
        imageInfo.width,
        imageInfo.height,
        dimensions.maxSmallImageWidth,
        dimensions.maxSmallImageHeight
    );

    const fileNameHasNoResizeSuffix = path.basename(file).indexOf('.noresize.') !== -1;
    const isImageSmallerThanSmallSize =
        imageInfo.width < dimensions.maxSmallImageWidth && imageInfo.height < dimensions.maxSmallImageHeight;

    currentManifest.originalType = originalType;
    currentManifest.dimensions = {
        '2x': {
            w: largeImageSize.width,
            h: largeImageSize.height
        }
    };

    const processing = [];

    if (!fileNameHasNoResizeSuffix && !isImageSmallerThanSmallSize) {
        /**
         * Skip small image generating in case of:
         * 1. .noresize. prefix in file name
         * 2. Image smaller than maxSmallImageWidth/maxSmallImageHeight
         * 3. The file is microbrowser cover
         */

        currentManifest.dimensions = {
            '1x': {
                w: smallImageSize.width,
                h: smallImageSize.height,
                media: '(max-width: 39.99em)'
            },
            ...currentManifest.dimensions
        };
        currentManifest.dimensions['2x'].media = '(min-width: 40em)';

        processing.push(
            generateImage(hexo, currentManifest, imageCacheDir, file, originalType, originalType, '1x', shortFileHash, smallImageSize)
        );
        processing.push(
            generateImage(hexo, currentManifest, imageCacheDir, file, originalType, 'webp', '1x', shortFileHash, smallImageSize)
        );
    }

    processing.push(
        generateImage(hexo, currentManifest, imageCacheDir, file, originalType, originalType, '2x', shortFileHash, largeImageSize)
    );
    processing.push(generateImage(hexo, currentManifest, imageCacheDir, file, originalType, 'webp', '2x', shortFileHash, largeImageSize));

    return Promise.all(processing).then(removeWebpIfBigger(imageCacheDir, originalType, currentManifest));
};

module.exports = { imageProcessor };
