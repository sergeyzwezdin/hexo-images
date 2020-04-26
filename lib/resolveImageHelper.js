const resolveImageHelper = (hexo) =>
    function (file) {
        if (file) {
            const { post } = this;
            const { images } = post;

            if (images) {
                const fileName = String(file || '').toLowerCase();
                const fileNameNoResize = fileName.replace(/(.+\.)(\w+)$/gi, '$1noresize.$2');

                const image = images[fileName] || images[fileNameNoResize];

                return image;
            }
        }

        return undefined;
    };

module.exports = resolveImageHelper;
