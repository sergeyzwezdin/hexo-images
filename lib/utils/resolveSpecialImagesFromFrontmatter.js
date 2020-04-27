const fs = require('fs');
const hexoFrontMatter = require('hexo-front-matter');

const resolveImageNamesFromFrontmatter = (frontMatter, names) => {
    const name = names.pop();
    const value = frontMatter[name];

    if (typeof value === 'object' && names.length > 0) {
        return resolveImageNamesFromFrontmatter(value, names);
    } else if (Array.isArray(value)) {
        return value.map((v) => String(v || '').trim()).filter(Boolean);
    } else {
        return [String(value || '').trim()].filter(Boolean);
    }
};

const resolveSpecialImagesFromFrontmatter = (frontMatterPath, specialImages) => {
    if (fs.existsSync(frontMatterPath)) {
        const frontMatter = hexoFrontMatter.parse(fs.readFileSync(frontMatterPath, 'utf-8'));

        return specialImages
            .map((specialImage) => {
                const imagesFromFrontMatter = resolveImageNamesFromFrontmatter(
                    frontMatter,
                    String(specialImage.frontmatter || '')
                        .split('.')
                        .map((i) => i.trim())
                        .reverse()
                );

                return imagesFromFrontMatter.map((image) => ({
                    image,
                    name: specialImage.name,
                    frontmatter: specialImage.frontmatter,
                    suffix: specialImage.suffix,
                    width: specialImage.width,
                    height: specialImage.height
                }));
            })
            .flat(1);
    }
};

module.exports = { resolveSpecialImagesFromFrontmatter };
