
const pathUtil = require('path')
const fs = require('fs')

const Logger = require('./logger.js')
const Crawler = require('./crawler.js')
const FSDB = require('./fsdb.js')
const Downloader = require('./downloader.js')
const filesystem = require('./filesystem.js')
const util = require('./util.js')

const indices = []
const cache = {}
let path = ''
let defaultConfig = {}

function init() {
  Crawler.on(Crawler.PROCESS, async (result) => {
    const {url, scheme, config, dataset} = result
    Logger.status(Crawler.PROCESS, url)
    let fsdb = new FSDB.FSDB(getBasepath(config.tier))
    let item = {
      id: util.makeHash(url),
      link: url,
      type: scheme.type,
      dataset: {},
      display: {}
    }

    scheme.queries.forEach(async (query) => {
      item.dataset[query.key] = dataset[query.key]
      if (query.display) item.display[query.key] = query.display
      if (query.follow) {
        if (query.all) {
          item.dataset[query.key].forEach(async (link) => {
            if (link) {
              let id = util.makeHash(link)
              if (! await fsdb.exists(id)) Crawler.addTask(link, config)
            }
          })
        } else {
          if (dataset[query.key]) {
            let link = dataset[query.key]
            let id = makeHash(link)
            if (! await fsdb.exists(id)) Crawler.addTask(link, config)
          }
        }
      }
      if (query.download) {
        if (query.all) {
          item.dataset[query.key].forEach((bin) => {
            item.dataset[query.key] = Downloader.getFilename(bin)
            Downloader.addTask(
              dataset[query.key],
              pathUtil.resolve(getBasepath(config.tier), 'data')
            )
          })
        } else {
          item.dataset[query.key] = Downloader.getFilename(dataset[query.key])
          Downloader.addTask(
            dataset[query.key],
            pathUtil.resolve(getBasepath(config.tier), 'data')
          )
        }
      }
    })
    if (scheme.store) {
      if (await fsdb.exists(item.id)) {
        await fsdb.assign(item.id, item)
      } else {
        await fsdb.put(item.id, item)
      }
    }
  })

  Crawler.on(Crawler.IDLE, async () => {
    Logger.status(Crawler.IDLE)
  })
}

function setPath(str) {
  Logger.fn(str)
  path = str
}
function setDefaultConfig(config) {
  Logger.fn()
  defaultConfig = config
}

function getBasepath(id) {
  Logger.fn(id)
  return pathUtil.resolve(path, id)
}

async function syncAll() {
  Logger.fn()
  while (indices.length) indices.pop()
  let cks = Object.keys(cache)
  cks.forEach(key=>{
    delete cache[key]
  })
  let ls = await filesystem.listSubDirectories(path)
  ls.forEach(dir => { indices.push(dir) })

  let promises = []
  indices.forEach(id => {
    const basepath = pathUtil.resolve(path, id)
    promises.push(
      sync(id)
    )
  })
  await Promise.all(promises)
}

async function sync(id) {
  Logger.fn(id)
  const basepath = getBasepath(id)
  await filesystem.loadJSON(pathUtil.resolve(basepath, 'meta.json'))
    .then(meta => {
      if (meta) {
        cache[id] = Object.assign(
          {},
          meta,
          {
            id
          }
        )
      }
    })
}

async function create(name, config) {
  Logger.fn(name)
  if (!config) config = util.clone(defaultConfig)
  const id = util.makeRandomId()
  const basepath = getBasepath(id)
  // ensure directories
  fs.mkdirSync(basepath, { recursive: true })
  fs.mkdirSync(pathUtil.resolve(basepath, 'data'), { recursive: true })
  fs.mkdirSync(pathUtil.resolve(basepath, 'db'), { recursive: true })
  // write db and config
  await Promise.all([
    filesystem.saveJSON(pathUtil.resolve(basepath, 'config.json'), config),
    filesystem.saveJSON(pathUtil.resolve(basepath, 'meta.json'), {
      name,
      created: Date.now()
    })
  ])
  await syncAll()
  return id
}

async function clone(id, name) {
  Logger.fn(id, name)
  const basepath = getBasepath(id)
  const config = await filesystem.loadJSON(
    pathUtil.resolve(basepath, 'config.json')
  )
  return await create(name, config)
}

async function remove(id) {
  Logger.fn(id)
  const basepath = getBasepath(id)
  await filesystem.remove(basepath)
  await syncAll()
}

function list() {
  Logger.fn()
  return indices.map((id) => {
    return cache[id]
  })
}

async function crawl(cid) {
  Logger.fn(cid)
  const collection = cache[cid]
  let config = await filesystem.loadJSON(
    pathUtil.resolve(getBasepath(cid), "config.json")
  ).catch(e => Logger.error)

  Crawler.addTasks(
    config.pages,
    {
      tier: cid,
      browser: config.browser,
      schemes: config.schemes
    }
  )
}


module.exports = {
  init,
  cache,
  indices,
  setPath,
  setDefaultConfig,
  getBasepath,
  crawl,
  list,
  remove,
  clone,
  create,
  sync,
  syncAll
}
