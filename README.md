# hexo-images ![Publish on NPM](https://github.com/sergeyzwezdin/hexo-images/workflows/Publish%20on%20NPM/badge.svg?branch=master) ![](https://img.shields.io/npm/v/hexo-images)

`hexo-images` is a plugin for Hexo static site generator that optimizes images for better website performance.

* **Resizes** images up to sizes that are convenient for web browsing size. You don't need to share 36-megapixel photos on the web 🙃
* **Compresses** images to make sure it loads as fast as possible. It uses the most efficient algorithms to compress the image.
* Creates **responsive images** to display the most important part of the image for mobile users.
* Creates **special-sized** images if needed. Special sizes for special cases 👌
* Provides **tag helper** to generate responsive-oriented picture tag.
* Generates `webp` files in addition to original image type.
* Converts old good GIFs to to `mp4` and `webm`. 

## How it works

1. Near to your `.md` file create folder with the same name as the `.md` file. Copy all required images there.
![Create folder for the images](https://user-images.githubusercontent.com/800755/81406400-ef846b00-9152-11ea-81e0-0c0c2e99ec74.png)

2. Run [`hexo generate`](https://hexo.io/docs/commands#generate) or [`hexo server`](https://hexo.io/docs/commands#server). The images will be processed and cached. Second run will not cause processing this image again. If image changes, the cache will be cleared and the image re-processed. This step could take a time, so be patient 😉
![Processing the image](https://user-images.githubusercontent.com/800755/81405135-84399980-9150-11ea-9fcb-0575dd79fa30.png)

3. Once processing is done, the result files will be stored in special folder (`/.images/`) and included into the cache manifest (`/.images/images.json`). You should not care about the folder structure in this folder, but if you're curious it looks like this.
![Processed files](https://user-images.githubusercontent.com/800755/81405809-d4652b80-9151-11ea-8586-ca99ba1c242b.png)

4. The processed files will be included into output build while running `hexo generate` or `hexo server`. To include it into the post use `{% picture %}` tag helper in the following way:
```markdown
Some text

{% picture 1.jpg %}
{% endpicture %}

Some other text
```

5. Responsive-oriented `picture` tag will be generated in the final output:

```html
<figure>
    <picture>
        <source srcset="/2014/fronttalks-2014/d5ea4373/1@1x.webp" media="(max-width: 39.99em)" type="image/webp" />
        <source srcset="/2014/fronttalks-2014/d5ea4373/1@2x.webp" media="(min-width: 40em)" type="image/webp" />
        <source srcset="/2014/fronttalks-2014/d5ea4373/1@1x.jpg" media="(max-width: 39.99em)" type="image/jpg" />
        <source srcset="/2014/fronttalks-2014/d5ea4373/1@2x.jpg" media="(min-width: 40em)" type="image/jpg" />
        <img src="/2014/fronttalks-2014/d5ea4373/1@2x.jpg" />
    </picture>
</figure>
```

## Requirements

- Hexo: 4.x
- Node 12+

## Usage

## Configuration

## Manifest

## Prevent resizing

## Special images

## Picture tag helper (and its customization)
