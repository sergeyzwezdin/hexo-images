const path = require('path');

hexo.config.images = Object.assign(
    {
        enable: true,
        base_dir: '.images',
        manifestFileName: 'images.json',
        excludeSourceImages: true,
        specialImages: [],
        templates: {
            image: path.relative(hexo.base_dir, path.resolve(__dirname, 'lib', 'templates', 'image.ejs')),
            video: path.relative(hexo.base_dir, path.resolve(__dirname, 'lib', 'templates', 'video.ejs'))
        }
    },
    hexo.config.images
);

if (hexo.config.images.enable) {
    // Process source images, write to cache folder
    hexo.extend.filter.register('before_generate', require('./lib/imagesInvalidateFilter')(hexo));

    // Exclude source images from output
    if (hexo.config.images.excludeSourceImages) {
        hexo.extend.filter.register('after_generate', require('./lib/cleanupSourceImagesFiler')(hexo));
    }

    // Inlcude processed images into final output
    hexo.extend.generator.register('images', require('./lib/imagesGenerator')(hexo));

    // Inject image cache manifest into page metadata
    hexo.extend.filter.register('before_post_render', require('./lib/postMetadataFilter')(hexo));

    // Helper to resolve image by name from the current post context
    hexo.extend.helper.register('resolve_image', require('./lib/resolveImageHelper')(hexo));

    // Picture tag
    hexo.extend.tag.register('picture', require('./lib/picture')(hexo), { ends: true });
}
