const { magenta, blue, redBright, yellowBright, greenBright, red } = require('chalk');
const fs = require('fs');
const path = require('path');

const reportFileGenerateSuccess = (hexo, source, dest, type) => {
    const { base_dir, log } = hexo;

    const { size: sourceSize } = fs.statSync(source);
    const { size: destSize } = fs.statSync(dest);

    const compressionRate = Math.round((destSize / sourceSize) * 100);
    const compressionRateColor = compressionRate < 50 ? greenBright : compressionRate < 90 ? yellowBright : redBright;

    log.info(
        `Generated ${type} [%s → %s / %s]:\n      %s`,
        blue(`${Math.round((sourceSize * 100) / 1024) / 100}Kb`),
        blue(`${Math.round((destSize * 100) / 1024) / 100}Kb`),
        compressionRateColor(`${compressionRate}%`),
        magenta(path.relative(base_dir, dest))
    );
};

const reportFileGenerateError = (hexo, source, dest, error) => {
    const { log } = hexo;

    log.error('Unable to process file "%s" (%s):\n      %s', magenta(source), blue(dest), red(error));
};

module.exports = { reportFileGenerateSuccess, reportFileGenerateError };
