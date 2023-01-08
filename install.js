#!/usr/bin/env node

/**
 * Pulumi as an npm package
 * This script downloads and extracts pulumi v3.51.0
 * 
 * author Luca Fabbian <luca.fabbian.1999@gmail.com>
 * 
 */

// Change to update pulumi version
const version = '3.51.0'

// Node modules
const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')
const process = require('node:process')
// External dependency for decompressing zip and tar.gz files
const decompress = require('decompress')



// Clean previous install: remove the ./bin directory if it exists, and make a fresh one
const binPath = path.join(__dirname, "bin")
if(fs.existsSync(binPath)) fs.rmSync(binPath, { recursive: true })
fs.mkdirSync(binPath)


/** Logging utility */
const log = (...args) => {
    // If the console is interactive, always clear the current line before writing
    // This ensure no conflict with the output thrown by npm
    if(process.stdout.clearLine) process.stdout.clearLine(1)
    console.log(...args)
}


// Avaiable pulumi distribution (keys are the os and platform identifiers in Node.js)
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

/**  Get download address (standard pulumi mirror) */
const getUrl = (version, os, arch, extension) => 
    `https://get.pulumi.com/releases/sdk/pulumi-v${version}-${os}-${arch}.${extension}`



if(!distributions.hasOwnProperty(process.platform) || !distributions[process.platform].hasOwnProperty(process.arch)){
    throw new Error('No compatible distribution found, aborting...')
    process.abort()
}

// Retrieve os info
const [os, arch, extension] = distributions[process.platform][process.arch]
const fileName = `pulumi.${extension}`
const url = getUrl(version, os, arch, extension)


// Actual script: download and decompress

// https://stackoverflow.com/questions/73345878/fetching-large-file-for-processing-using-node-js
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
        decompress(path.join(binPath, fileName), binPath).then(files => {
            files.forEach( f => {
                fs.chmodSync(path.join(binPath, f.path), 0o755)
            })
            console.log(files)
            log('\nRemoving old files...')
            fs.rmSync(path.join(binPath, fileName))
            log('Done!')
        });
    }).on("error", err => console.log(err));
});
