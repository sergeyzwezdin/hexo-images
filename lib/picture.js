const path = require('path');
const fs = require('fs');
const { magenta } = require('chalk');
const { stripHTML } = require('hexo-util');

const capitalizeName = (name) =>
    String(name || '')
        .toLowerCase()
        .replace(/[- ]+(.?)/gi, (_, x) => x.toUpperCase());

const pictureTag = (hexo) =>
    function (args, content) {
        const { base_dir, render, log } = hexo;
        const config = hexo.config.images;
        const { templates } = config;

        const { title: postTitle } = this;

        const resolve_image = hexo.extend.helper.get('resolve_image').bind(hexo);

        const image = resolve_image(args[0], this);
        if (image) {
            const { originalType } = image;
            const params = args.slice(1).reduce((result, rawParam) => {
                const match = rawParam.match(/^\-(?<name>.+?)\:[ ]*(?<value>.+)?$/i);
                if (match) {
                    const { name, value } = match.groups;
                    result[capitalizeName(name)] = value;
                } else {
                    result[capitalizeName(rawParam)] = true;
                }

                return result;
            }, {});

            if (
                originalType === 'jpg' ||
                originalType === 'jpeg' ||
                originalType === 'png' ||
                originalType === 'webp' ||
                originalType === 'svg'
            ) {
                const templatePath = path.resolve(base_dir, templates.image);

                let alt = params.alt || '';
                if (!String(alt).trim()) {
                    alt = stripHTML(content || '').replace(/[ \r\n\t]+/gi, ' ');
                }
                if (!String(alt).trim()) {
                    alt = stripHTML(postTitle).replace(/[ \r\n\t]+/gi, ' ');
                }

                if (fs.existsSync(templatePath)) {
                    return `\n\n${render.renderSync(
                        {
                            path: templatePath
                        },
                        {
                            ...image,
                            alt: alt,
                            caption: content || '',
                            postTitle: postTitle,
                            params: params
                        }
                    )}\n\n`;
                } else {
                    log.warn('Template not found: %s', magenta(templatePath));
                    return '';
                }
            } else if (originalType === 'gif' || originalType === 'mp4' || originalType === 'avi' || originalType === 'webm') {
                const templatePath = path.resolve(base_dir, templates.video);

                if (fs.existsSync(templatePath)) {
                    return `\n\n${render.renderSync(
                        {
                            path: templatePath
                        },
                        {
                            ...image,
                            caption: content || '',
                            postTitle: postTitle,
                            params: params
                        }
                    )}\n\n`;
                } else {
                    log.warn('Template not found: %s', magenta(templatePath));
                    return '';
                }
            } else {
                log.warn('Unable to resolve %s image for %s post', magenta(args[0]), magenta(this.path));
                return '';
            }
        } else {
            log.warn('There is no images metadata for the post: %s', magenta(this.path));
            return '';
        }
    };

module.exports = pictureTag;
