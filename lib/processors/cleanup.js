const { magenta } = require('chalk');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

/**
 * Check if file exists in manifest, but deleted from initial location.
 * If different then remove from manifest.
 */
const cleanupManifestFromRemovedFiles = (hexo, imageManifestPath, checkOnly) => {
    const processed = [];

    const { source_dir, log } = hexo;

    if (fs.existsSync(imageManifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(imageManifestPath, 'utf-8'));

        let manifestModified = false;
        for (const imagePath of Object.keys(manifest)) {
            const imageFullPath = path.resolve(source_dir, imagePath);
            const isImageExists = fs.existsSync(imageFullPath);

            if (!isImageExists) {
                processed.push(imagePath);

                delete manifest[imagePath];
                log.info('Deleted image %s removed from manifest', magenta(imagePath));

                manifestModified = true;
            }
        }

        if (manifestModified) {
            if (!checkOnly) {
                fs.writeFileSync(imageManifestPath, JSON.stringify(manifest, null, 4), 'utf-8');
            }
        }
    }

    return processed;
};

/**
 * Check if file size in manifest is different than actual file size.
 * If different then remove from manifest.
 */
const cleanupManifestFromOutdatedFiles = (hexo, imageManifestPath, checkOnly) => {
    const processed = [];

    const { source_dir, log } = hexo;

    if (fs.existsSync(imageManifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(imageManifestPath, 'utf-8'));

        let manifestModified = false;
        for (const imagePath of Object.keys(manifest)) {
            const { size } = manifest[imagePath];

            const imageFullPath = path.resolve(source_dir, imagePath);
            const isImageExists = fs.existsSync(imageFullPath);

            if (isImageExists) {
                const { size: actualSize } = fs.statSync(imageFullPath);
                if (size !== actualSize) {
                    processed.push(imagePath);

                    delete manifest[imagePath];
                    log.info('Outdated image %s removed from manifest', magenta(imagePath));
                    manifestModified = true;
                }
            }
        }

        if (manifestModified) {
            if (!checkOnly) {
                fs.writeFileSync(imageManifestPath, JSON.stringify(manifest, null, 4), 'utf-8');
            }
        }
    }

    return processed;
};

/**
 * Check if image folder contains in manifest.
 * If not then remove from disk.
 */
const removeFoldersThatNotInManifest = (hexo, imageManifestPath, checkOnly) => {
    const processed = [];

    const { base_dir, log } = hexo;

    if (fs.existsSync(imageManifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(imageManifestPath, 'utf-8'));
        const manifestItems = Object.values(manifest).map((item) => item.hash.substr(0, 8));

        const manifestDir = path.dirname(imageManifestPath);
        const dirsToRemove = fs
            .readdirSync(manifestDir)
            .filter((f) => fs.statSync(path.join(manifestDir, f)).isDirectory() && /^[a-z0-9]{8}$/gis.test(f))
            .filter((dir) => manifestItems.indexOf(dir) === -1)
            .map((dir) => path.resolve(manifestDir, dir));

        for (const dir of dirsToRemove) {
            const relativeDir = path.relative(base_dir, dir);
            processed.push(relativeDir);

            if (!checkOnly) {
                rimraf.sync(dir, {});
            }

            log.info('Outdated image directory removed:\n      %s', magenta(relativeDir));
        }
    }

    return processed;
};
module.exports = { cleanupManifestFromRemovedFiles, cleanupManifestFromOutdatedFiles, removeFoldersThatNotInManifest };
