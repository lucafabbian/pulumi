#!/usr/bin/env node

/**
 * Clean downloaded file to avoid publishing them.
 * (npm specs on npmignore are rather complicated when ignored files are references in package.json)
 * 
 * author Luca Fabbian <luca.fabbian.1999@gmail.com>
 * 
 */

const path = require('node:path')
const fs = require('node:fs')


const binPath = path.join(__dirname, "bin")
if(fs.existsSync(binPath)) fs.rmSync(binPath, { recursive: true })
