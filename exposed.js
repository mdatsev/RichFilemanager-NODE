const paths = require('path')
const fs = require('fs')
const sharp = require('sharp')
const shellescape = require('shell-escape')

const exec = require('util').promisify(require('child_process').exec)

const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tiff']
const videoExts = ['ogv', 'avi', 'mkv', 'mp4', 'webm', 'm4v', 'ogg', 'mp3', 'wav']

module.exports = {
    async getThumbnail(path, cb) {
        try {
            if (paths.dirname(path).includes('.thumbnails')) {
                return cb(path)
            }
            const thumbnailsDir = paths.join(paths.dirname(path), '.thumbnails')
            let thumbnailPath = paths.join(thumbnailsDir, paths.basename(path))
            if(!thumbnailPath.endsWith('.jpg')) {
                thumbnailPath += '.jpg'
            }
            try {
                const stats = await fs.promises.stat(thumbnailsDir)
                if (!stats.isDirectory()) {
                    throw Error('.thumbnails is not a directory')
                }
            } catch (e) {
                if (e.code == 'ENOENT') {
                    try {
                        await fs.promises.mkdir(thumbnailsDir)
                    } catch (e) {
                        if (e.code != 'EEXIST') {
                            throw e
                        }
                    }
                } else {
                    throw e
                }
            }
            try {
                const stats = await fs.promises.stat(thumbnailPath)
                if (stats.size === 0) {
                    throw Error('Thumbnail broken')
                }
                return cb(thumbnailPath)
            } catch (e) {
                return cb(await createThumbnail(path, thumbnailPath))
            }
        } catch (e) {
            console.error(e, e.stack)
            return cb(null)
        }
    },

    filterFiles(files) {
        const filtered = ['.thumbnails', '.trash']
        return files.filter(f => !filtered.includes(paths.basename(f).toLowerCase()) )
    }
}

async function createThumbnail(source, dest) {
    const ext = paths.extname(source).slice(1).toLowerCase();
    const assetsDir = paths.join(__dirname, 'assets');
    // image
    if(imageExts.includes(ext)) {
        return imageThumb(source, dest)
    // video
    } else if(videoExts.includes(ext)) {
        return videoThumb(source, dest)
    // other
    } else {
        const stats = await fs.promises.stat(source)
        // directory
        if(stats.isDirectory()) {
            // snimki            
            if (paths.basename(source).toLowerCase() === 'snimki') {
                return paths.join(assetsDir, 'snimki.png')
            }
            // generic folder
            return paths.join(assetsDir, 'folder.png')
        // generic file
        } else {
            return paths.join(assetsDir, 'file.png')
        }
    }
}

const thumbW = 291;
const thumbH = 180;

async function imageThumb(source, dest) {
    await sharp(source).resize(thumbW, thumbH, { fit: 'inside' }).toFile(dest)
    return dest
}

async function videoThumb(source, dest) {
    await exec(
        shellescape(['ffmpeg', '-i', source, '-frames:v', '1', '-filter:v', `scale=w=${thumbW}:h=${thumbH}:force_original_aspect_ratio=decrease`, dest])
    )
    return dest
}