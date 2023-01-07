const tar = require('tar')
const fs = require("node:fs")
const path = require("node:path")
const https = require('node:https')


// Remove bin directory if it already exists, and make a fresh one
const binPath = path.join(__dirname, "bin")
if(fs.existsSync(binPath)) fs.rmSync(binPath, { recursive: true })
fs.mkdirSync(binPath)


const getUrl = (version, os, arch) => 
    `https://get.pulumi.com/releases/sdk/pulumi-v${version}-${os}-${arch}.tar.gz`

const fileName = "pulumi.tar.gz"

// https://stackoverflow.com/questions/73345878/fetching-large-file-for-processing-using-node-js
const url = getUrl('3.51.0', 'linux', 'x64')
const file = fs.createWriteStream(path.join(binPath, fileName));
file.on("error", err => console.log(err));
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
        process.stdout.write(`Downloaded ${(downloaded / 1000000).toFixed(2)} MB of ${fileName}\r`);
    }).on("end", function() {
        file.end(); console.log(`${fileName} downloaded successfully.`);
        console.log('\nExtracting files...')
        fs.createReadStream(path.join(binPath, fileName)).pipe(
            tar.x({
                strip: 1,
                C: binPath
            })
        ).on("end", () => {
            console.log('\nRemoving old files...')
            fs.rmSync(path.join(binPath, fileName))
            console.log('Done!')
        })
    }).on("error", err => console.log(err));
});

