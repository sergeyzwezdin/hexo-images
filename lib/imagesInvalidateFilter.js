const { magenta } = require('chalk');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { findAllFiles } = require('./utils/findAllFiles');

const {
    cleanupManifestFromRemovedFiles,
    cleanupManifestFromOutdatedFiles,
    removeFoldersThatNotInManifest
} = require('./processors/cleanup');
const { imageProcessor } = require('./processors/imageProcessor');
const { videoProcessor } = require('./processors/videoProcessor');
const { vectorProcessor } = require('./processors/vectorProcessor');

const maxLargeImageWidth = 1800;
const maxSmallImageWidth = 640;
const maxSmallImageHeight = 800;

const imagesInvalidateFilter = (hexo) =>
    async function () {
        const { base_dir, source_dir, log } = hexo;
        const imageCacheDir = path.resolve(base_dir, hexo.config.images.base_dir);
        const imageManifestPath = path.join(imageCacheDir, hexo.config.images.manifestFileName);

        if (!fs.existsSync(imageCacheDir)) {
            fs.mkdirSync(imageCacheDir, { recursive: true });
        }

        const checkOnly = false;

        let processed = [];

        // Cleanup outdated cache

        processed = [...processed, ...cleanupManifestFromRemovedFiles(hexo, imageManifestPath, checkOnly)];
        processed = [...processed, ...cleanupManifestFromOutdatedFiles(hexo, imageManifestPath, checkOnly)];
        processed = [...processed, ...removeFoldersThatNotInManifest(hexo, imageManifestPath, checkOnly)];

        // Process images

        const manifest = fs.existsSync(imageManifestPath) ? JSON.parse(fs.readFileSync(imageManifestPath, 'utf-8')) : {};

        const files = findAllFiles(source_dir, ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.avi', '.svg']);
        const filesToProcess = files
            .map((file) => ({
                file,
                fileName: path.relative(source_dir, file),
                size: fs.statSync(file).size
            }))
            .filter(({ file, fileName, size }) => !manifest[fileName.toLowerCase()] || manifest[fileName.toLowerCase()].size !== size);

        if (checkOnly) {
            processed = [...processed, ...filesToProcess.map(({ fileName }) => fileName)];
        } else {
            const parallelizm = 10;

            for (const imagesPortion of Array.from({ length: Math.ceil(filesToProcess.length / parallelizm) }).map((_, index) =>
                filesToProcess.slice(index * parallelizm, (index + 1) * parallelizm)
            )) {
                await Promise.all(
                    imagesPortion.map(async ({ file, fileName, size }) => {
                        const fileHash = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
                        const shortFileHash = fileHash.substr(0, 8);
                        const targetDir = path.join(imageCacheDir, shortFileHash);

                        const postFilePath = [
                            path.join(path.dirname(file), 'index.md'),
                            path.resolve(path.dirname(file), '..', `${path.basename(path.dirname(file))}.md`)
                        ].find(fs.existsSync);
                        const postFileName = postFilePath ? path.relative(source_dir, postFilePath) : undefined;

                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir);
                        }

                        const currentManifest = {
                            size,
                            hash: fileHash,
                            relatedPath: postFileName,
                            dimensions: {}
                        };

                        console.log(currentManifest, { targetDir });

                        if (/.(png|jpg|jpeg|webp)$/gi.test(file)) {
                            await imageProcessor(
                                hexo,
                                imageCacheDir,
                                file,
                                currentManifest,
                                { maxLargeImageWidth, maxSmallImageWidth, maxSmallImageHeight },
                                shortFileHash
                            );
                        } else if (/.(gif|mp4|webm|avi)$/gi.test(file)) {
                            await videoProcessor(
                                hexo,
                                imageCacheDir,
                                file,
                                currentManifest,
                                { maxLargeImageWidth, maxSmallImageWidth, maxSmallImageHeight },
                                shortFileHash
                            );
                        } else if (/.(svg)$/gi.test(file)) {
                            await vectorProcessor(hexo, imageCacheDir, file, currentManifest, shortFileHash);
                        } else {
                            log.warn('Unknown image type to process: %s', magenta(file));
                        }

                        manifest[fileName.toLowerCase()] = currentManifest;
                        processed.push(fileName);
                    })
                );
            }
        }

        fs.writeFileSync(imageManifestPath, JSON.stringify(manifest, null, 4), 'utf-8');
    };

module.exports = imagesInvalidateFilter;
