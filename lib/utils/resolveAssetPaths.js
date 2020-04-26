const { relative, sep } = require('path');

const resolveAssetPaths = (items, source_dir) =>
    items
        .map(({ path, asset_dir, source }) => {
            if (asset_dir) {
                // If post has asset dir use it (usually defined for post)
                return {
                    url: path,
                    assetsPath: `${relative(source_dir, asset_dir)}${sep}`
                };
            } else {
                // If page doesn't have asset dir, then calculate it
                //   /page/index.md → /page/
                //   /page/details.md → /page/details/
                const assets = /index\.md$/i.test(source)
                    ? source.replace(/index\.md$/i, '')
                    : /\.md$/i.test(source)
                    ? source.replace(/\.md$/i, sep)
                    : '';

                const target = /index\.html$/i.test(path)
                    ? path.replace(/index\.html$/i, '')
                    : /\.html$/i.test(path)
                    ? path.replace(/\.html$/i, sep)
                    : '';

                return { assetsPath: assets, url: target };
            }
        })
        .sort((a, b) => (a && a.assetsPath && b && b.assetsPath ? b.assetsPath.length - a.assetsPath.length : 0));

module.exports = { resolveAssetPaths };
