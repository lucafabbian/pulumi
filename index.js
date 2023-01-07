const decompress = require('decompress')
const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')
const process = require('node:process')


// Remove bin directory if it already exists, and make a fresh one
const binPath = path.join(__dirname, "bin")
if(fs.existsSync(binPath)) fs.rmSync(binPath, { recursive: true })
fs.mkdirSync(binPath)


const log = (...args) => {
    if(process.stdout.clearLine) process.stdout.clearLine(1)
    console.log(...args)
}


const distributions = {
    'darwin': {
        'arm64': ['darwin', 'arm64', 'tar.gz'],
        'x64':   ['darwin', 'x64',   'tar.gz'],  
    },
    'linux': {
        'arm64':['linux', 'arm64', 'tar.gz'],
        'x64':  ['linux', 'x64',   'tar.gz'],         
    },
    'win32': {
        'x64': ['windows', 'x64', 'zip'],
    }
}


const getUrl = (version, os, arch, extension) => 
    `https://get.pulumi.com/releases/sdk/pulumi-v${version}-${os}-${arch}.${extension}`



if(!distributions.hasOwnProperty(process.platform) || !distributions[process.platform].hasOwnProperty(process.arch)){
    throw new Error('No compatible distribution found, aborting...')
    process.abort()
}


const [os, arch, extension] = distributions[process.platform][process.arch]
const fileName = `pulumi.${extension}`

// https://stackoverflow.com/questions/73345878/fetching-large-file-for-processing-using-node-js
const url = getUrl('3.51.0', os, arch, extension)

const file = fs.createWriteStream(path.join(binPath, fileName));
file.on("error", err => console.log(err));

log(`Downloading file from <${url}>\n\n`)
https.get(url).on("response", function(res) {
    let downloaded = 0;
    res.on("data", function(chunk) {
        let readyForMore = file.write(chunk);
        if (!readyForMore) {
            // pause readstream until drain event comes
            res.pause();
            file.once('drain', () => {
                res.resume();
            });
        }
        downloaded += chunk.length;
        if(process.stdout.moveCursor) process.stdout.moveCursor(0, -1)
        log(`Downloaded ${(downloaded / 1000000).toFixed(2)} MB of ${fileName}`);
    }).on("end", function() {
        file.end(); 
        log(`${fileName} downloaded successfully.`);
        log('\nExtracting files...')
        decompress(path.join(binPath, fileName), binPath).then(_ => {
            log('\nRemoving old files...')
            fs.rmSync(path.join(binPath, fileName))
            log('Done!')
        });
    }).on("error", err => console.log(err));
});
