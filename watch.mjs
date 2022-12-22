import { watch } from 'node:fs'
import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const cmd = './watch.sh'
const dir = './src'
const delay = 500

/**
 * Get all files in `dir` and in all of its subdirectories and in all of their
 * subdirectories, and so on...
 * @param {string} dir directory to read
 * @returns
 */
async function walk (dir) {
  let files = await fs.readdir(dir)

  files = await Promise.all(
    files.map(async file => {
      const filePath = path.join(dir, file)
      const stats = await fs.stat(filePath)
      if (stats.isDirectory()) return walk(filePath)
      else if (stats.isFile()) return filePath
    })
  )

  return files.reduce((all, contents) => all.concat(contents), [])
}

let run = true

/**
 *
 * @param {string} cmd - script to run
 * @param {(stderr:Duplex,stdout:Duplex,stdin:Duplex)=>void} cb - stderr, stdout, stdin
 * @param {number} ms - milliseconds to wait before executing `cmd`
 * @returns
 */
function action (cmd, cb, ms) {
  return function (eventType, filename) {
    console.log(eventType, filename)
    if (ms) {
      if (!run) return
      run = false
      setTimeout(() => (run = true && exec(cmd, cb)), ms)
    } else {
      exec(cmd, cb)
    }
  }
}

function log (stderr, stdout, stdin) {
  console.log(stderr || stdout || stdin)
}

/**
 * Watch for changes to source files. For any change, recompile and hot-reload.
 * @param {string} filePath - relative path to file from {@link process.cwd()}
 * @param {(eventType:string,filename:string)=>void} cb - callback, see {@link action}
 * @param {{recursive:boolean}} options - include all subdirectories (not supported on linux)
 */
function monitor (filePath, cb, options = {}) {
  console.debug('watching ', filePath)
  watch(filePath, options, cb)
}

if (/linux/i.test(os.platform()))
  walk(dir).then(files =>
    files.forEach(file => monitor(file, action(cmd, log, delay)))
  )
else monitor(dir, action(cmd, log, delay), { recursive: true })
