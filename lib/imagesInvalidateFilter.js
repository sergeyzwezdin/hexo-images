const { magenta, cyan } = require('chalk');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const minimatch = require('minimatch');
const rimraf = require('rimraf');
const prettyHrtime = require('pretty-hrtime');

const { findAllFiles } = require('./utils/findAllFiles');
const { resolveSpecialImagesFromFrontmatter } = require('./utils/resolveSpecialImagesFromFrontmatter');
const { groupIntoParallelPortions } = require('./utils/groupIntoParallelPortions');

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

const manifestReservedKeys = ['size', 'hash', 'relatedpath', 'dimensions', 'originaltype', 'files'];

const imagesInvalidateFilter = (hexo) =>
    async function () {
        const timeStarted = process.hrtime();

        const { base_dir, source_dir, env, log } = hexo;
        const specialImages = hexo.config.images.specialImages.filter(({ name }) => {
            const conatinsReservedWord = manifestReservedKeys.indexOf(name.toLowerCase()) !== -1;
            if (conatinsReservedWord) {
                log.warn('Special images contains reserved key and will be ignored: %s', magenta(name));
            }
            return !conatinsReservedWord;
        });

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

        const allImages = files.map((file) => ({
            file,
            fileName: path.relative(source_dir, file),
            size: fs.statSync(file).size,
            postFilePath: [
                path.join(path.dirname(file), 'index.md'),
                path.resolve(path.dirname(file), '..', `${path.basename(path.dirname(file))}.md`)
            ].find(fs.existsSync)
        }));

        const specialImagesByPost = allImages.reduce((result, { postFilePath }) => {
            result[postFilePath] = resolveSpecialImagesFromFrontmatter(postFilePath, specialImages);
            return result;
        }, {});

        const allImagesSpecial = allImages
            .map((item) => {
                const imageFileName = path
                    .basename(item.file)
                    .replace(/\.noresize$/gi, '')
                    .toLowerCase();

                return (specialImagesByPost[item.postFilePath] || [])
                    .filter(({ image }) => image.toLowerCase() === imageFileName)
                    .map((specialImageManifest) => ({
                        ...specialImageManifest,
                        file: item.file
                    }));
            })
            .flat(1)
            .reduce((result, { file, ...item }) => {
                result[file] = result[file] ? result[file] : [];
                result[file].push(item);
                return result;
            }, {});

        const filesToProcess = allImages
            .map((image) => ({
                ...image,
                special: allImagesSpecial[image.file] || []
            }))
            .filter(({ fileName, size, special }) => {
                const currentManifest = manifest[fileName.toLowerCase()];
                if (currentManifest) {
                    const hasMissingSpecialImage = special.some(({ name }) => currentManifest[name] === undefined);
                    return currentManifest.size !== size || hasMissingSpecialImage;
                }

                return true;
            });

        if (isCheckOnlyMode) {
            processed = [...processed, ...filesToProcess.map(({ fileName }) => fileName)];

            log.info('Images loaded in %s.', cyan(prettyHrtime(process.hrtime(timeStarted))));
        } else {
            for (const imagesPortion of groupIntoParallelPortions(filesToProcess, 9)) {
                await Promise.all(
                    imagesPortion.map(async ({ file, fileName, size, postFilePath, special }) => {
                        log.debug('Started processing: %s', magenta(fileName));
                        const fileHash = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
                        const shortFileHash = fileHash.substr(0, 8);
                        const targetDir = path.join(imageCacheDir, shortFileHash);

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
                                shortFileHash,
                                special
                            );
                        } else if (/.(gif|mp4|webm|avi)$/gi.test(file)) {
                            if (special && special.length > 0) {
                                log.warn('Special images are not supported for videos: %s', magenta(file));
                            }

                            await videoProcessor(
                                hexo,
                                imageCacheDir,
                                file,
                                currentManifest,
                                { maxLargeImageWidth, maxSmallImageWidth, maxSmallImageHeight },
                                shortFileHash
                            );
                        } else if (/.(svg)$/gi.test(file)) {
                            if (special && special.length > 0) {
                                log.warn('Special images are not supported for vectors: %s', magenta(file));
                            }

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

            log.info(
                'Images generated in %s.\n      %s items processed.',
                cyan(prettyHrtime(process.hrtime(timeStarted))),
                magenta(processed.length)
            );
        }

        if (isCheckOnlyMode && processed.length > 0) {
            log.warn('Following items should be updated:\n%s', magenta(processed.map((f) => `      ${f}`).join('\n')));

            throw new Error(`${processed.length} items should be updated. Run "npm run build".`);
        }
    };

module.exports = imagesInvalidateFilter;
