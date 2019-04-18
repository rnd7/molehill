const pathUtil = require('path')
const puppeteer = require('puppeteer');
const { EventEmitter } = require('events');

const filesystem = require('./filesystem.js')
const Logger = require('./logger.js')
const util = require('./util.js')

const tasks = []
let parallelTasks = 3
let processing = 0

const PROCESS = "process"
const IDLE = "idle"
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


function stop() {
  Logger.fn()
  while (tasks.length) tasks.pop()
}

function addTask(url, config) {
  Logger.fn(url)
  let id = util.makeRandomId()
  tasks.push({id, url, config})
  processTasks()
}

function addTasks(urls, config) {
  Logger.fn(urls.length)
  if (urls.length) {
    urls.forEach((url) => {
      addTask(url, config)
    })
  } else {
    processTasks()
  }

}

function findScheme(url, config) {
  Logger.fn(url)
  let scheme = {}
  const len = config.schemes.length
  for (let i = 0; i < len; i++) {
    const scheme = config.schemes[i]
    if (typeof scheme.filter === "string") {
      if(util.parseRegExp(scheme.filter).test(url)) return scheme
    } else {
      return scheme
    }
  }
  return null
}

function processQueryResult(value, query) {
  Logger.fn(value)
  if (
    typeof query.test !== "string"
    || util.parseRegExp(query.test).test(value)
  ){
    if (typeof query.match === "string") {
      const result = value.toString().match(util.parseRegExp(query.match))
      if (result) value = result[1]
    }
    return value
  }
  return null
}
function processQueryResults(values, query) {
  Logger.fn(values.length)
  const len = values.length
  for (let i = 0; i < len; i++) {
    values[i] = processQueryResult(values[i], query)
  }
  return values
}

async function simulateScroll(page, attempts, timeout) {
  Logger.fn()
  if (!attempts) return
  //wait page.hover(selector.items+":last-of-type")
  await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
  //await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
  if (timeout) await page.waitFor(timeout)
  //await new Promise(resolve => setTimeout(resolve, behaviour.scroll.timeout))
  await simulateScroll(page, --attempts, timeout)

}
async function queryPage(page, scheme) {
  Logger.fn()
  let dataset = {}
  if (scheme.simulateScroll) {
    let attempts = scheme.scrollAttempts || 0
    let timeout = scheme.timeout || 0
    await simulateScroll(page, attempts, timeout)
  }
  await Promise.all(scheme.queries.map(async (query) => {
    if(query.all) {
      let results = await page.$$eval(
        query.selector,
        (nodes, attribute) => {
          let arr = []
          nodes.forEach((node) => {
            arr.push(node[attribute])
          })
          return arr
        },
        query.attribute
      ).catch((e)=>{
        Logger.error(e)
      })
      if (results) results = processQueryResults(results, query)
      dataset[query.key] = results
    } else {
      let result = await page.$eval(
        query.selector,
        (node, attribute) => {
          return node[attribute]
        },
        query.attribute
      ).catch((e)=>{
        Logger.error(e)
      })
      if (result) result = processQueryResult(result, query)
      dataset[query.key] = result
    }
  }))
  return dataset
}

async function processTask(url, config) {
  Logger.fn(url)
  const browser = await puppeteer.launch().catch(e=>{
    Logger.error("error instantiating browser", e)
  })
  if (browser) {
    try {
      const scheme = findScheme(url, config)
      const page = await browser.newPage();
      await page.emulate(config.browser)
      await page.goto(url)
      if (typeof scheme.wait === "number") await page.waitFor(scheme.wait)
      let dataset = await queryPage(page, scheme)
      await page.close()
      emitter.emit(PROCESS, {url, scheme, config, dataset})
    } catch(e) {
      Logger.error("error loading page", e)
    }
    await browser.close().catch(e=>Logger.error)
  }
}

function processTasks() {
  Logger.fn()
  while (tasks.length && processing < parallelTasks) {
    processing++
    const {url, config } = tasks.shift()
    emitter.emit(CHANGE)
    const done = () => {
      processing--
      emitter.emit(CHANGE)
      processTasks()
    }
    processTask(url, config)
      .then(done)
      .catch(done)
  }
  if (tasks.length + processing == 0) {
    emitter.emit(IDLE)
  }
}

function getStats() {
  Logger.fn()
  return {
    processing,
    tasks: tasks.length,
    parallelTasks
  }
}

module.exports = {
  IDLE,
  PROCESS,
  CHANGE,
  tasks,
  getStats,
  stop,
  addTask,
  addTasks,
  findScheme,
  processQueryResult,
  processQueryResults,
  simulateScroll,
  queryPage,
  processTask,
  processTasks,
  on,
  off,
  once
}
