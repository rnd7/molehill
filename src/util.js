const crypto = require('crypto')
const Logger = require('./logger.js')

function makeHash(str) {
  Logger.fn()
  return crypto.createHash('md5').update(str).digest("hex")
}

function makeRandomId() {
  Logger.fn()
  return makeHash(Date.now().toString()+Math.random().toString())
}

function clone(obj) {
  Logger.fn()
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch(e) {
    console.log(e)
  }
}

function parseRegExp(str) {
  Logger.fn()
  str = str.replace(/\\{2,2}/g,'/')
  const result = str.match(/^\/(.+)\/(i)?$/)
  const pattern = result[1]
  const flags = (result[2] !== undefined) ? result[2] : ""
  return new RegExp(pattern, flags)
}

module.exports = {
  makeHash,
  makeRandomId,
  clone,
  parseRegExp
}
