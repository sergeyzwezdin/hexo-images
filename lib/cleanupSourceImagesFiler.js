const fs = require('fs');
const { join, resolve, dirname, basename } = require('path');

const { resolveAssetPaths } = require('./utils/resolveAssetPaths');

const cleanupSourceImagesFiler = (hexo) => () => {
    const { route, locals } = hexo;

    const lists = route.list();
    const { base_dir, source_dir } = hexo;
    const imageCacheDir = resolve(base_dir, hexo.config.images.base_dir);
    const imageManifestPath = join(imageCacheDir, hexo.config.images.manifestFileName);

    // Find all post/page paths and URLs for them

    const paths = resolveAssetPaths([...locals.get('posts').data, ...locals.get('pages').data], source_dir);

    // Scan manifest file for all images in cache and prepare its path for output

    const manifest = fs.existsSync(imageManifestPath) ? JSON.parse(fs.readFileSync(imageManifestPath, 'utf-8')) : {};
    const images = Object.keys(manifest).map((manifestImagePath) => {
        const targetPathDefinition = paths.find(({ assetsPath }) => manifestImagePath.startsWith(assetsPath));
        const targetPath = targetPathDefinition ? targetPathDefinition.url : dirname(manifestImagePath);

        return join(targetPath, basename(manifestImagePath));
    });

    for (const image of images) {
        const imagePath = String(image || '')
            .trim()
            .toLowerCase();
        const routeToDelete = lists.find((l) => l.trim().toLowerCase() === imagePath);

        route.remove(routeToDelete);
    }
};

module.exports = cleanupSourceImagesFiler;
