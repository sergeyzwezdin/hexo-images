hexo.config.images = Object.assign(
    {
        enable: true,
        base_dir: '.images',
        manifestFileName: 'images.json',
        excludeSourceImages: true
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
}

// Helper to resolve image by name from the current post context
hexo.extend.helper.register('resolve_image', require('./lib/resolveImageHelper')(hexo));
