const fs = require('fs');

const hbjs = require('handbrake-js');
const { MovieParser } = require('node-video-lib');

const processVideo = (source, destination, format, maxWidth, debug) => {
    return new Promise((resolve, reject) => {
        if (format !== 'mp4' && format !== 'webm') {
            reject(`Wrong format: ${format}`);
            return;
        }

        const formatOptions =
            format === 'mp4'
                ? {
                      encoder: 'x264',
                      format: 'av_mp4'
                  }
                : format === 'webm'
                ? {
                      encoder: 'VP8',
                      format: 'av_webm'
                  }
                : {};

        hbjs.spawn({
            ...formatOptions,
            input: source,
            output: destination,
            optimize: true,
            'two-pass': true,
            turbo: true,
            rate: 30,
            audio: 'none',
            maxWidth: maxWidth,
            'loose-anamorphic': true
        })
            .on('error', (error) => {
                reject(error);
            })
            .on('end', () => {
                fs.open(destination, 'r', 666, function(error, fd) {
                    if (!error && fd) {
                        try {
                            const movie = MovieParser.parse(fd);
                            const duration = movie.relativeDuration();
                            const { width, height } = movie.videoTrack();

                            resolve({ duration, width, height, destination });
                        } catch (error) {
                            resolve({ destination });
                        } finally {
                            fs.closeSync(fd);
                        }
                    } else {
                        reject(error);
                    }
                });
            })
            .on('progress', (progress) => {
                if (debug) {
                    console.log('Percent complete: %s, ETA: %s', progress.percentComplete, progress.eta);
                }
            })
            .on('output', (output) => {
                if (debug) {
                    console.log(output.toString());
                }
            });
    });
};

module.exports = { processVideo };
