const request = require("request")
const pathUtil = require('path')
const fs = require('fs')
const { EventEmitter } = require('events')

const Logger = require('./logger.js')
const util = require('./util.js')

const tasks = []
let parallelTasks = 3
let processing = 0

const CHANGE = "change"

let emitter = new EventEmitter()

function on(eventName, fn) {
  Logger.fn(eventName)
  emitter.on(eventName, fn)
}
function off(eventName, fn) {
  Logger.fn(eventName)
  emitter.off(eventName, fn)
}

function once(eventName, fn) {
  Logger.fn(eventName)
  emitter.once(eventName, fn)
}

function getFilepath(url, path) {
  Logger.fn(url, path)
  return pathUtil.resolve(path, getFilename(url))
}

function addTask(url, path) {
  Logger.fn(url, path)
  let id = util.makeRandomId()
  tasks.push({id, url, path})
  processTasks()
}

async function processTask(url, path) {
  Logger.fn(path, url)
  return new Promise((resolve, reject) => {
    request.head(url, function(err, res, body) {
      if (err) reject('image could not been downloaded')
      else request(url)
        .pipe(fs.createWriteStream(getFilepath(url, path)))
        .on("close", () => {
          console.log("downloader down", path)
          resolve(true)
        })
        .on('error', (err) => {
          Logger.error(err);
          reject(err)
        })
    })
  })
}

function processTasks() {
  Logger.fn()
  while (tasks.length && processing < parallelTasks) {
    processing++
    const { url, path } = tasks.shift()
    emitter.emit(CHANGE)
    const done = () => {
      processing--
      emitter.emit(CHANGE)
      processTasks()
    }
    processTask(url, path).then(done).catch(done)
  }
}

function getFilename(url) {
  Logger.fn(url)
  const hash = util.makeHash(url)
  const ext = pathUtil.extname(url)
  let filename = hash
  if (ext) filename += ext
  return filename
}

function getStats() {
  Logger.fn()
  return {
    processing: processing,
    tasks: tasks.length,
    parallelTasks: parallelTasks
  }
}

module.exports = {
  CHANGE,
  tasks,
  getFilepath,
  addTask,
  processTask,
  processTasks,
  getFilename,
  getStats,
  on,
  off,
  once
}
