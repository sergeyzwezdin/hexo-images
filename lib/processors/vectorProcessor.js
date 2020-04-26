const path = require('path');
const svgDim = require('svg-dimensions');
const { reportFileGenerateSuccess, reportFileGenerateError } = require('../utils/reportFileGenerate');
const { generateFileName } = require('../utils/generateFileName');
const { processVector } = require('./vector/processVector');

const generateVector = (hexo, currentManifest, imageCacheDir, file, hash) => {
    const targetFileName = generateFileName(file, hash, '2x', 'svg');
    return new Promise((resolve, reject) => {
        svgDim.get(file, (error, dimensions) => {
            if (!error) {
                resolve(dimensions);
            } else {
                reject(error);
            }
        });
    }).then(({ width, height }) => {
        return processVector(file, path.join(imageCacheDir, targetFileName))
            .then(() => {
                currentManifest.dimensions = {
                    '2x': {
                        w: width,
                        h: height
                    }
                };
                currentManifest.originalType = 'svg';
                currentManifest.files = {
                    default: targetFileName,
                    svg: {
                        '2x': targetFileName
                    }
                };

                reportFileGenerateSuccess(hexo, file, path.join(imageCacheDir, targetFileName), `image/svg`);
            })
            .catch((error) => reportFileGenerateError(hexo, file, targetFileName, error));
    });
};
const vectorProcessor = (hexo, imageCacheDir, file, currentManifest, shortFileHash) => {
    return generateVector(hexo, currentManifest, imageCacheDir, file, shortFileHash);
};

module.exports = { vectorProcessor };
