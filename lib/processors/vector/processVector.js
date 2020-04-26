const fs = require('fs');
const imagemin = require('imagemin');
const imageminSvgo = require('imagemin-svgo');

const processVector = (file, targetFilePath) => {
    const { size: originalFileSize } = fs.statSync(file);
    const buffer = fs.readFileSync(file);

    const writeTargetFile = (optimized) => {
        if (optimized.length > originalFileSize) {
            /**
             * Use original file (without optimization) in case of
             * optimized file is bigger than original one.
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

    return imagemin
        .buffer(buffer, {
            plugins: [
                imageminSvgo({
                    plugins: [{ removeViewBox: false }]
                })
            ]
        })
        .then(writeTargetFile);
};

module.exports = { processVector };
