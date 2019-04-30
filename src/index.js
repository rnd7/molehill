const puppeteer = require('puppeteer');
const program = require('commander');
const chalk = require('chalk')

const pathUtil = require('path')
const fs = require("fs")
const express = require('express')

const FSDB = require('./fsdb.js')
const Crawler = require('./crawler.js')
const Downloader = require('./downloader.js')
const util = require('./util.js')
const filesystem = require('./filesystem.js')
const Webservice = require('./webservice.js')
const Collection = require('./collection.js')
const Logger = require('./logger.js')

const os = require('os')
const USER_DATA_PATH = os.homedir('home')

function getAppDataPath() {
  if (process.env.APPDATA) return process.env.APPDATA
  const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
  switch (os.platform) {
    case "darwin":
      return pathUtil.resolve(home , 'Library', 'Preferences')
    case "win32":
      return pathUtil.resolve(home, 'AppData', 'Roaming')
    default:
      return pathUtil.resolve(home , '.local', 'share')
  }
}

function init() {
  const APP_DATA_PATH = pathUtil.resolve(
    getAppDataPath(),
    'molehill'
  )

  const SETTINGS_FILE_PATH = pathUtil.resolve(APP_DATA_PATH, 'settings.json' )
  const COLLECTION_PATH = pathUtil.resolve(APP_DATA_PATH, 'collection' )

  const version = "0.2.5"

  let settings = {}

  async function ensurePrerequisites() {
    Logger.fn()
    fs.mkdirSync(COLLECTION_PATH, { recursive: true })
    if (!await filesystem.verifyFile(SETTINGS_FILE_PATH)) {
      settings = await filesystem.loadJSON("settings.json") // load defaults
      await saveSettings()
    } else {
      await loadSettings()
    }
    Collection.init()
    Collection.setPath(COLLECTION_PATH)
    Collection.setDefaultConfig(settings.defaultConfig)
    await Collection.syncAll()
  }

  async function loadSettings() {
    Logger.fn()
    settings = await filesystem.loadJSON(SETTINGS_FILE_PATH) || {}
  }

  async function saveSettings() {
    Logger.fn()
    await filesystem.saveJSON(SETTINGS_FILE_PATH, settings)
  }

  async function before(options) {
    if (program.silent) {
      Logger.raw.silent = true
      Logger.log.silent = true
      Logger.print.silent = true
    } else if (program.raw) {
      Logger.print.silent = true
      Logger.log.outputFormat = Logger.log.RAW
      Logger.log.trace = false
      Logger.log.tier = false
      Logger.log.margin = false
      Logger.fn.show = false
      Logger.cmd.show = false
      Logger.api.show = false
      Logger.error.show = false
      Logger.warn.show = false
      Logger.status.show = false
    } else if (program.debug) {
      Logger.log.trace = true
      Logger.log.stack = true
    } else {
      Logger.log.trace = false
      Logger.fn.show = false
    }
    Logger.print(
      chalk.bgWhite.black.bold(' Molehill ')
      + chalk.bgBlack(' '+version+' ')
    )
    Logger.print()
    Logger.fn()
    await ensurePrerequisites()
  }

  program
    .version(version)
    .description('Molehill')
    .option('-s, --silent', 'Silent mode')
    .option('-r, --raw', 'RAW Output')
    .option('-d, --debug', 'Debug Output')

  program
    .command('locate')
    .description('Locate Application Data')
    .action(async function(collection, options){
      await before(options)
      Logger.cmd("locate")
      return Logger.output(APP_DATA_PATH)
    });

  program
    .command('locate-collection <collection>')
    .description('Locate a collection')
    .action(async function(collection, options){
      await before(options)
      Logger.cmd("locate-collection")
      Logger.output(Collection.getBasepath(collection))
    });

  program
    .command('list-collections')
    .description('List all collections')
    .action(async function(options){
      await before(options)
      Logger.cmd("list-collection")
      Logger.output(Collection.list())
    });

  program
    .command('create-collection <name>')
    .description('Create a new collection')
    .action(async function(name, options){
      await before(options)
      Logger.cmd("create-collection")
      Logger.output(await Collection.create(name))
    });


  program
    .command('locate-config <collection>')
    .description('Locate config file of collection')
    .action(async function(collection, options){
      await before(options)
      Logger.cmd("locate-config")
      Logger.output(pathUtil.resolve(Collection.getBasepath(collection),'config.json'))
    });

  program
    .command('list-items <collection>')
    .description('List all items of a collection')
    .action(async function(collection, options){
      await before(options)
      Logger.cmd("list-items")
      const files = await FSDB.list(Collection.getBasepath(collection))
      Logger.output(files)
    });

  program
    .command('view-items <collection>')
    .description('View all items of a collection')
    .action(async function(collection, options){
      await before(options)
      Logger.cmd("view-items")
      const fsdb = new FSDB.FSDB(Collection.getBasepath(collection))
      const items = await fsdb.list()
      const result = []
      const promises = []
      items.forEach(iid => {
        promises.push(new Promise(async (resolve, reject) => {
          let data = await fsdb.fetch(iid)
          result.push(data)
          resolve()
        }))
      })
      await Promise.all(promises)
      Logger.output(result)
    });

  program
    .command('view-item <collection> <item>')
    .description('View an item within a collection')
    .action(async function(collection, item, options){
      await before(options)
      Logger.cmd("view-item")
      const files = await FSDB.fetch(Collection.getBasepath(collection), item)
      Logger.output(files)
    });

  program
    .command('locate-item <collection> <item>')
    .description('Locate an item within a collection')
    .action(async function(collection, item, options){
      await before(options)
      Logger.cmd("view-item")
      const filepath = await FSDB.getFilePath(Collection.getBasepath(collection), item)
      Logger.output(filepath)
    });

  program
    .command('crawl-collection <collection>')
    .description('Start crawling using pages defined in collection config')
    .action(async function(collection, options){
      await before(options)
      Logger.cmd("crawl-collection")
      Collection.crawl(collection)
    });

  program
    .command('remove-collection <collection>')
    .description('Remove a collecition')
    .action(async function(collection, options){
      await before(options)
      Logger.cmd("remove-collection")
      Logger.output(await Collection.remove(collection))
    });

  program
    .command('gui')
    .option('-p, --port', 'Port')
    .description('Start Graphical User Interface')
    .action(async function(options){
      await before(options)
      Logger.cmd("gui")
      let port = options.port || 8080
      await Webservice.start(port)
      const browser = await puppeteer.launch({
        headless:false,
        defaultViewport: null,
        args: ['--disable-infobars',"http://localhost:"+port]
      }).catch(e=>{
        Logger.error("error instantiating browser", e)
      })
      browser.on("disconnected", e =>{
        Webservice.stop()
      })
    });

  program
    .command('server')
    .option('-p, --port', 'Port')
    .description('Start Webservice')
    .action(async function(options){
      let port = options.port || 8080
      await before(options)
      await Webservice.start(port)
    });

  process.on("SIGPIPE", process.exit)
  program.parse(process.argv);
}


module.exports = {
  Crawler,
  Collection,
  Downloader,
  FSDB,
  Logger,
  filesystem,
  Webservice,
  init
}
