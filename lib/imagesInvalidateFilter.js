const { magenta } = require('chalk');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const minimatch = require('minimatch');
const rimraf = require('rimraf');

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

const buildSkipFilter = (condition, source_dir) => (f) => !minimatch(path.relative(source_dir, f), condition);

const imagesInvalidateFilter = (hexo) =>
    async function () {
        const { base_dir, source_dir, env, log } = hexo;
        const imageCacheDir = path.resolve(base_dir, hexo.config.images.base_dir);
        const imageManifestPath = path.join(imageCacheDir, hexo.config.images.manifestFileName);

        const isCheckOnlyMode = Boolean(env && env.args && env.args.imageCheckOnly);
        const isForceUpdate = Boolean(env && env.args && env.args.imageForceUpdate);

        if (isForceUpdate) {
            log.info('Image force update mode enabled. Cleaning up the cache.');
            rimraf.sync(imageCacheDir, {});
        }

        if (!fs.existsSync(imageCacheDir)) {
            log.debug('Image cache directory created: %s', magenta(imageCacheDir));
            fs.mkdirSync(imageCacheDir, { recursive: true });
        }

        let processed = [];

        // Cleanup outdated cache

        processed = [...processed, ...cleanupManifestFromRemovedFiles(hexo, imageManifestPath, isCheckOnlyMode)];
        processed = [...processed, ...cleanupManifestFromOutdatedFiles(hexo, imageManifestPath, isCheckOnlyMode)];
        processed = [...processed, ...removeFoldersThatNotInManifest(hexo, imageManifestPath, isCheckOnlyMode)];

        // Process images

        const manifest = fs.existsSync(imageManifestPath) ? JSON.parse(fs.readFileSync(imageManifestPath, 'utf-8')) : {};

        log.debug('Image cache manifest loaded: %s', magenta(imageManifestPath));

        const files = findAllFiles(source_dir, ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.avi', '.svg'])
            .filter(buildSkipFilter('_covers/**/*.*', source_dir))
            .filter(buildSkipFilter('_data/**/*.*', source_dir))
            .filter(buildSkipFilter('_drafts/**/*.*', source_dir));

        log.debug('Total images to process: %s', magenta(files.length));

        const filesToProcess = files
            .map((file) => ({
                file,
                fileName: path.relative(source_dir, file),
                size: fs.statSync(file).size
            }))
            .filter(({ file, fileName, size }) => !manifest[fileName.toLowerCase()] || manifest[fileName.toLowerCase()].size !== size);

        if (isCheckOnlyMode) {
            processed = [...processed, ...filesToProcess.map(({ fileName }) => fileName)];
        } else {
            const parallelizm = os.cpus().length;

            for (const imagesPortion of Array.from({ length: Math.ceil(filesToProcess.length / parallelizm) }).map((_, index) =>
                filesToProcess.slice(index * parallelizm, (index + 1) * parallelizm)
            )) {
                const p = await Promise.all(
                    imagesPortion.map(async ({ file, fileName, size }) => {
                        log.debug('Started processing: %s', magenta(fileName));
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
                        log.debug('Finised processing: %s', magenta(fileName));
                    })
                );

                fs.writeFileSync(imageManifestPath, JSON.stringify(manifest, null, 4), 'utf-8');
                log.debug('Image cache manifest updated: %s', magenta(imageManifestPath));
            }
        }

        if (isCheckOnlyMode && processed.length > 0) {
            log.warn('Following items should be updated:\n%s', magenta(processed.map((f) => `      ${f}`).join('\n')));

            throw new Error(`${processed.length} items should be updated. Run "npm run build".`);
        }
    };

module.exports = imagesInvalidateFilter;
