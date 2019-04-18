const pathUtil = require('path')
const filesystem = require("./filesystem.js")
const Logger = require('./logger.js')

function FSDB(path) {
  Logger.fn("constructor")
  this.path = path
}

FSDB.prototype.setPath = function(path) {
  Logger.fn(path)
  this.path = path
}
FSDB.prototype.getDBPath = function() {
  Logger.fn()
  return getDBPath(this.path)
}
FSDB.prototype.getFilePath = function(id) {
  Logger.fn(id)
  return getFilePath(this.path, id)
}
FSDB.prototype.exists = function(id) {
  Logger.fn(id)
  return exists(this.path, id)
}
FSDB.prototype.put = function(id, data) {
  Logger.fn(id)
  return put(this.path, id, data)
}
FSDB.prototype.assign = function(id, data) {
  Logger.fn(id)
  return assign(this.path, id, data)
}
FSDB.prototype.remove = function(id) {
  Logger.fn(id)
  return remove(this.path, id)
}
FSDB.prototype.fetch = function(id) {
  Logger.fn(id)
  return fetch(this.path, id)
}
FSDB.prototype.list = function() {
  Logger.fn()
  return list(this.path)
}

function getDBPath(path) {
  Logger.fn(path)
  return pathUtil.resolve(path, 'db')
}
function getFilePath(path, id) {
  Logger.fn(path, id)
  return pathUtil.resolve(path, 'db', id+".json")
}
async function exists(path, id) {
  Logger.fn(path, id)
  return await filesystem.verifyFile(getFilePath(path, id))
}
async function put(path, id, data) {
  Logger.fn(path, id)
  const filepath = getFilePath(path, id)
  data.created = Date.now()
  await filesystem.saveJSON(filepath, data)
}
async function assign(path, id, data) {
  Logger.fn(path, id)
  const filepath = getFilePath(path, id)
  let item = await filesystem.loadJSON(filepath)
  Object.assign(item, data)
  item.modified = Date.now()
  await filesystem.saveJSON(filepath, item)
}
async function remove(path, id) {
  Logger.fn(path, id)
  await filesystem.remove(getFilePath(path, id))
}
async function fetch(path, id) {
  Logger.fn(path, id)
  return await filesystem.loadJSON(getFilePath(path,id))
}
async function list(path) {
  Logger.fn(path)
  let contents = await filesystem.listDirectory(getDBPath(path))
  contents = contents.map(filename => filename.replace(/\.json$/i, ''))
  return contents
}

module.exports = {
  FSDB,
  getDBPath,
  getFilePath,
  exists,
  put,
  assign,
  remove,
  fetch,
  list
}
