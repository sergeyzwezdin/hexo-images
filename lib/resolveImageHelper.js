const path = require('path');

const resolveTargetPath = (postPath) => {
    if ((path.extname(postPath) || '').toLowerCase() === '.html') {
        const baseName = path.basename(postPath, '.html');

        if (baseName.toLowerCase() === 'index') {
            return path.dirname(postPath);
        } else {
            return path.join(path.dirname(postPath), baseName);
        }
    } else {
        return String(postPath || '').trim();
    }
};

const processFilesPath = (files, resolveUrl) => {
    for (const key of Object.keys(files)) {
        if (typeof files[key] === 'string') {
            files[key] = resolveUrl(files[key]);
        } else if (typeof files[key] === 'object') {
            files[key] = processFilesPath(files[key], resolveUrl);
        }
    }

    return files;
};

const resolveImage = (hexo) =>
    function (imageName, page) {
        imageName = String(imageName || '').trim();

        if (imageName) {
            const { path: pagePath, images } = page || this.post || this.page;

            if (images) {
                const url_for = hexo.extend.helper.get('url_for').bind(hexo);

                const fileName = imageName.toLowerCase();
                const fileNameNoResize = fileName.replace(/(.+\.)(\w+)$/gi, '$1noresize.$2');

                const image = images[fileName] || images[fileNameNoResize];

                if (image) {
                    const resolveUrl = (fileName) =>
                        /^([\\\/]+|([a-z]{1,5}:[\\\/]+))/gi.test(fileName)
                            ? fileName
                            : url_for(path.join(resolveTargetPath(pagePath), fileName));

                    image.files = processFilesPath(image.files, resolveUrl);

                    for (const specialSectionName of (hexo.config.images.specialImages || []).map(({ name }) => name)) {
                        if (image[specialSectionName]) {
                            image[specialSectionName] = processFilesPath(image[specialSectionName], resolveUrl);
                        }
                    }

                    return image;
                }
            }
        }

        return undefined;
    };

module.exports = resolveImage;
