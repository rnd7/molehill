const express = require('express')
const bodyParser = require('body-parser')
const pathUtil = require('path')

const filesystem = require('./filesystem.js')
const Collection = require('./collection.js')
const Crawler = require('./crawler.js')
const Downloader = require('./downloader.js')
const FSDB = require('./fsdb.js')
const Logger = require('./logger.js')

const webservice = express();
let server

webservice.use(function (req, res, next) {
  var url = req.protocol + '://' + req.get('host') + req.originalUrl
  Logger.api(req.method, url);
  next();
})

webservice.get('/api/collection', async (req, res) => {
  res.json(Collection.indices);
});

webservice.get('/api/collections', async (req, res) => {
  res.json(Collection.list());
});

webservice.post('/api/collection', bodyParser.json(), async (req, res) => {
  let id = await Collection.create(req.body.name)
  res.json({id});
});

webservice.delete('/api/collection/:cid', async (req, res) => {
  await Collection.remove(req.params.cid)
  res.json({id: req.params.cid});
});

webservice.get('/api/collection/:cid', async (req, res) => {
  res.json(Collection.cache[req.params.cid]);
});

webservice.get('/api/collection/:cid/item', async (req, res) => {
  const files = await FSDB.list(Collection.getBasepath(req.params.cid))
  res.json(files)
});

webservice.get('/api/collection/:cid/items', async (req, res) => {
  const fsdb = new FSDB.FSDB(Collection.getBasepath(req.params.cid))
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
  res.json(result)
});

webservice.delete('/api/collection/:cid/items', async (req, res) => {
  const fsdb = new FSDB.FSDB(Collection.getBasepath(req.params.cid))
  const items = await fsdb.list()
  const result = []
  const promises = []
  items.forEach(iid => {
    promises.push(new Promise(async (resolve, reject) => {
      await fsdb.remove(iid)
      const globPath = pathUtil.resolve(Collection.getBasepath(req.params.cid), 'data')+"/*"
      await filesystem.remove(globPath)
      resolve()
    }))
  })
  await Promise.all(promises)
  res.json();
});

webservice.get('/api/collection/:cid/item/:iid', async (req, res) => {
  let result = await FSDB.fetch(Collection.getBasepath(req.params.cid), req.params.iid)
  res.json(result);
});

webservice.delete('/api/collection/:cid/item/:iid', async (req, res) => {
  const fsdb = new FSDB.FSDB(Collection.getBasepath(req.params.cid))
  let removed = await fsdb.fetch(req.params.iid)
  await fsdb.remove(req.params.itemid)
  res.json(removed);
});

webservice.get('/api/collection/:cid/data/:file', async (req, res) => {
  let root = pathUtil.resolve(Collection.getBasepath(req.params.cid), "data")
  res.sendFile(req.params.file, {root});
});

webservice.get('/api/collection/:cid/item/:iid/scheme', async (req, res) => {
  let result = await FSDB.fetch(Collection.getBasepath(req.params.cid), req.params.iid)

  let config = await filesystem.loadJSON(
    pathUtil.resolve(Collection.getBasepath(req.params.cid), "config.json")
  ).catch(e => Logger.error)
  let scheme = Crawler.findScheme(result.link, config)
  res.json(scheme);
});

webservice.get('/api/collection/:cid/config', async (req, res) => {
  let config = await filesystem.loadJSON(
    pathUtil.resolve(Collection.getBasepath(req.params.cid), "config.json")
  ).catch(e => Logger.error)
  res.json(config);
});

webservice.put('/api/collection/:cid/config', bodyParser.json(), async (req, res) => {
  let config = await filesystem.saveJSON(
    pathUtil.resolve(Collection.getBasepath(req.params.cid), "config.json"),
    req.body
  ).catch(e => Logger.error)
  res.end();
});

webservice.put('/api/collection/:cid/meta', bodyParser.json(), async (req, res) => {
  let config = await filesystem.saveJSON(
    pathUtil.resolve(Collection.getBasepath(req.params.cid), "meta.json"),
    req.body
  ).catch(e => Logger.error)
  await Collection.sync(req.params.cid)
  res.end();
});

webservice.get('/api/crawler', async (req, res) => {
  res.json(Crawler.getStats());
});

webservice.get('/api/crawler/poll', async (req, res) => {
  Crawler.once(Crawler.CHANGE, (payload) => {
    res.end()
  })
});

webservice.get('/api/crawler/task', async (req, res) => {
  res.json(Crawler.tasks.map(task => { return task.id }));
});

webservice.get('/api/crawler/tasks', async (req, res) => {
  res.json(Crawler.tasks);
});



webservice.get('/api/downloader', async (req, res) => {
  res.json(Downloader.getStats());
});
webservice.get('/api/downloader/poll', async (req, res) => {
  Logger.status("downloader poll")
  Downloader.once(Downloader.CHANGE, (payload) => {
    Logger.status("downloader change")
    res.end()
  })
});

webservice.get('/api/downloader/task', async (req, res) => {
  res.json(Downloader.tasks.map(task => { return task.id }));
});

webservice.get('/api/downloader/tasks', async (req, res) => {
  res.json(Downloader.tasks);
});

webservice.post('/api/crawler/start/:cid', async (req, res) => {
  Collection.crawl(req.params.cid)
  res.end()
});

webservice.use("/example", express.static(pathUtil.resolve(__dirname, 'example')))

webservice.use("/", express.static(pathUtil.resolve(__dirname, 'client')))


async function start(port) {
  Logger.fn()
  if (server) return Promise.resolve()
  return new Promise((resolve, reject) => {
    server = webservice.listen(port, () => {
      Logger.status('Server listening at Port '+port);
      resolve()
    });
  })
}

function stop() {
  Logger.fn()
  if (server) {
    server.close();
    server = null
  }
}

module.exports = {
  start,
  stop
}
