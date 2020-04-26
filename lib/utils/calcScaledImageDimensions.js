const calcScaledImageDimensionsLarge = (initialWidth, initialHeight, maxImageWidth) => {
    if (initialWidth > maxImageWidth) {
        const ratio = initialWidth / initialHeight;
        const width = maxImageWidth;
        const height = Math.floor(width / ratio);
        return { width, height };
    } else {
        return {
            width: initialWidth,
            height: initialHeight
        };
    }
};

const calcScaledImageDimensionsSmall = (initialWidth, initialHeight, maxImageWidth, maxImageHeight) => ({
    width: initialWidth >= maxImageWidth ? maxImageWidth : initialWidth,
    height: initialHeight >= maxImageHeight ? maxImageHeight : initialHeight
});

module.exports = { calcScaledImageDimensionsLarge, calcScaledImageDimensionsSmall };
