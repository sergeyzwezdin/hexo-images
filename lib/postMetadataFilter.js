const path = require('path');
const fs = require('fs');

const adjustPaths = (manifest, subFolderName) => {
    if (subFolderName) {
        const { files } = manifest;

        for (const f of Object.keys(files)) {
            if (typeof files[f] === 'string') {
                files[f] = path.join(subFolderName, files[f]);
            } else if (typeof files[f] === 'object') {
                for (const ff of Object.keys(files[f])) {
                    files[f][ff] = path.join(subFolderName, files[f][ff]);
                }
            }
        }
    }
};

const fillPostMetadata = (data, imageManifestPath) => {
    const manifest = fs.existsSync(imageManifestPath) ? JSON.parse(fs.readFileSync(imageManifestPath, 'utf-8')) : {};
    const keysToInclude = Object.keys(manifest).filter((manifestKey) => manifest[manifestKey].relatedPath === data.source);

    const [, subFolderName] =
        !/index\.md$/i.test(data.source) && !data.source.toLowerCase().trim().startsWith('_posts')
            ? data.source.match(/[\\\/]+([^\\\/]+)\.md$/i) || []
            : [];

    data.images = keysToInclude.reduce((result, manifestKey) => {
        const { relatedPath, ...manifestData } = manifest[manifestKey];

        adjustPaths(manifestData, subFolderName);

        result[path.basename(manifestKey)] = manifestData;
        return result;
    }, {});
};

const postMetadataFilter = (hexo) =>
    function (data) {
        const { base_dir } = hexo;
        const imageCacheDir = path.resolve(base_dir, hexo.config.images.base_dir);
        const imageManifestPath = path.join(imageCacheDir, hexo.config.images.manifestFileName);

        fillPostMetadata(data, imageManifestPath);

        return data;
    };

module.exports = postMetadataFilter;
