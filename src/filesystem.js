const fs = require("fs");
const pathUtil = require('path')
const del = require('del');

const Logger = require('./logger.js')

async function remove(path) {
  Logger.fn(path)
  await del(path, {force: true})
}

async function listDirectory(path) {
  Logger.fn(path)
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) reject(err)
      else resolve(files || [])
    })
  })
}
async function isDirectory(path) {
  Logger.fn(path)
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) reject(err)
      else resolve(stats.isDirectory())
    })
  })
}
async function listSubDirectories(path) {
  Logger.fn(path)
  const entries = await listDirectory(path)
  let result = []
  let promises = []
  entries.forEach(entry => {
    promises.push(isDirectory(pathUtil.resolve(path, entry)).then(() => {
      result.push(entry)
    }))
  })
  await Promise.all(promises)
  return result
}


async function verifyFile(path) {
  Logger.fn(path)
  return new Promise((resolve, reject) => {
    fs.access(path, fs.F_OK, (err) => {
      if (err) resolve(false)
      else resolve(true)
    })
  })
}

async function loadFile(path) {
  Logger.fn(path)
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) reject('could not load json');
      else resolve(data)
    })
  })
}

async function saveFile(path, data) {
  Logger.fn(path)
  new Promise((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
      if (err) reject("could not write db");
      else resolve('The file has been saved!');
    })
  })
}

async function loadJSON(path) {
  Logger.fn(path)
  let data
  try {
    let json = await loadFile(path)
    data = JSON.parse(json)
  } catch(e) {
    Logger.error(e)
  }
  return data
}

async function saveJSON(path, data) {
  Logger.fn(path)
  try {
    let json = JSON.stringify(data, null, 2)
    await saveFile(path, json)
  } catch(e) {
    Logger.error(e)
  }
}

async function saveJS(path, name, data) {
  Logger.fn(path)
  try {
    let js = "var " + name + " = " + JSON.stringify(data, null, 2) + ";"
    await saveFile(path, js)
  } catch(e) {
    Logger.error(e)
  }
}

module.exports = {
  remove,
  listDirectory,
  isDirectory,
  listSubDirectories,
  verifyFile,
  loadFile,
  saveFile,
  loadJSON,
  saveJSON,
  saveJS
}
