const fs = require('fs');
const path = require('path');
const { reportFileGenerateSuccess, reportFileGenerateError } = require('../utils/reportFileGenerate');
const { generateFileName } = require('../utils/generateFileName');
const { processVideo } = require('./video/processVideo');

const generateVideo = (hexo, currentManifest, imageCacheDir, file, targetType, dimensions, hash) => {
    const targetFileName = generateFileName(file, hash, '2x', targetType);
    return processVideo(file, path.join(imageCacheDir, targetFileName), targetType, dimensions.maxLargeImageWidth, false)
        .then(({ duration, width, height, destination: filePath }) => {
            if (!currentManifest.files) {
                currentManifest.files = {};
            }
            if (targetType === 'mp4') {
                currentManifest.files.default = targetFileName;
            }
            currentManifest.files[targetType] = targetFileName;

            if (duration) {
                currentManifest.duration = duration;
            }
            if (width && height) {
                currentManifest.dimensions = {
                    w: width,
                    h: height
                };
            }

            reportFileGenerateSuccess(hexo, file, filePath, `video/${targetType}`);
        })
        .catch((error) => reportFileGenerateError(hexo, file, targetFileName, error));
};

const removeWebmIfBigger = (imageCacheDir, currentManifest) => () => {
    if (currentManifest.files && currentManifest.files.webm && currentManifest.files.mp4) {
        const { size: webmSize } = fs.statSync(path.join(imageCacheDir, currentManifest.files.webm));
        const { size: mp4Size } = fs.statSync(path.join(imageCacheDir, currentManifest.files.mp4));

        if (webmSize > mp4Size) {
            delete currentManifest.files.webm;
        }
    }
};

const videoProcessor = (hexo, imageCacheDir, file, currentManifest, dimensions, shortFileHash) => {
    const processing = [];

    currentManifest.originalType = String(path.extname(file) || '')
        .slice(1)
        .toLowerCase();

    processing.push(generateVideo(hexo, currentManifest, imageCacheDir, file, 'mp4', dimensions, shortFileHash));
    processing.push(generateVideo(hexo, currentManifest, imageCacheDir, file, 'webm', dimensions, shortFileHash));

    return Promise.all(processing).then(removeWebmIfBigger(imageCacheDir, currentManifest));
};

module.exports = { videoProcessor };
