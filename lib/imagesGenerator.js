const fs = require('fs');
const { join, resolve, dirname } = require('path');
const { resolveAssetPaths } = require('./utils/resolveAssetPaths');

const imagesGenerator = (hexo) => async ({ posts, pages }) => {
    const { base_dir, source_dir } = hexo;
    const imageCacheDir = resolve(base_dir, hexo.config.images.base_dir);
    const imageManifestPath = join(imageCacheDir, hexo.config.images.manifestFileName);

    // Find all post/page paths and URLs for them

    const paths = resolveAssetPaths([...posts.data, ...pages.data], source_dir);

    // Scan manifest file for all images in cache and prepare its path for output

    const manifest = fs.existsSync(imageManifestPath) ? JSON.parse(fs.readFileSync(imageManifestPath, 'utf-8')) : {};
    const images = Object.keys(manifest)
        .map((manifestImagePath) => {
            const targetPathDefinition = paths.find(({ assetsPath }) => manifestImagePath.startsWith(assetsPath));
            const targetPath = targetPathDefinition ? targetPathDefinition.url : dirname(manifestImagePath);

            const files = [
                ...new Set(
                    Object.keys(manifest[manifestImagePath].files)
                        .map((f) => {
                            if (typeof manifest[manifestImagePath].files[f] === 'string') {
                                return manifest[manifestImagePath].files[f];
                            } else if (typeof manifest[manifestImagePath].files[f] === 'object') {
                                return Object.keys(manifest[manifestImagePath].files[f]).map(
                                    (ff) => manifest[manifestImagePath].files[f][ff]
                                );
                            }
                        })
                        .flat(Infinity)
                )
            ];

            return files.map((file) => ({
                path: join(targetPath, file),
                dataPath: join(imageCacheDir, file)
            }));
        })
        .flat(Infinity);

    // Generator result

    return images.map(({ path, dataPath }) => ({
        path,
        data: () => fs.createReadStream(dataPath)
    }));
};

module.exports = imagesGenerator;
