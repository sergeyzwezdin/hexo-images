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
    /**
     * Process source images and write to cache folder
     * when post content or file(s) changed - what happens first.
     *
     * ⚠️ Note: if images already validated in the current cycle,
     * it won't be runned again until "after_generate".
     */
    const invalidateImages = require('./lib/invalidateImages')(hexo);
    const injectMetadata = require('./lib/injectMetadata')(hexo);
    let imagesInvaidated = false;

    hexo.extend.filter.register('before_generate', function () {
        if (imagesInvaidated === false) {
            imagesInvaidated = true;
            return invalidateImages();
        }
    });

    // Inject image cache manifest into page metadata. Process images before if needed.
    hexo.extend.filter.register('before_post_render', function (data) {
        if (imagesInvaidated === false) {
            imagesInvaidated = true;
            return invalidateImages().then(() => injectMetadata(data));
        } else {
            return injectMetadata(data);
        }
    });

    hexo.extend.filter.register('after_generate', function () {
        imagesInvaidated = false;
    });

    // Exclude source images from output
    if (hexo.config.images.excludeSourceImages) {
        hexo.extend.filter.register('after_generate', require('./lib/cleanupSourceImagesFiler')(hexo));
    }

    // Inlcude processed images into final output
    hexo.extend.generator.register('images', require('./lib/imagesGenerator')(hexo));

    // Helper to resolve image by name from the current post context
    hexo.extend.helper.register('resolve_image', require('./lib/resolveImageHelper')(hexo));

    // Picture tag
    hexo.extend.tag.register('picture', require('./lib/picture')(hexo), { ends: true });
}
