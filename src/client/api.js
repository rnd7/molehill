async function fetchCollection(cid) {
  return fetch("api/collection/"+cid).then(res => {return res.json()})
}

async function postCollection(name) {
  let body = JSON.stringify({name})
  return fetch(
    "api/collection",
    {
      method: "POST",
      body,
      headers: {
          "Content-Type": "application/json",
          // "Content-Type": "application/x-www-form-urlencoded",
      }
    }
  ).then(res => {return res.json()})
}

async function deleteCollection(cid) {
  return fetch(
    "api/collection/"+cid,
    {
      method: "DELETE",
    }
  ).then(res => {console.log("delete complete")})
}

async function fetchCollections(meta = false) {
  let result = []
  if (!meta) {
    result = await fetch("api/collection").then(res => {return res.json()})
  } else {
    result = await fetch("api/collections").then(res => {return res.json()})
  }
  return result
}

async function fetchItem(cid, iid) {
  return fetch("api/collection/"+cid+"/item/"+iid).then(res => {return res.json()})
}

async function fetchConfig(cid) {
  return fetch("api/collection/"+cid+"/config").then(res => {return res.json()})
}

async function putConfig(cid, data) {
  let body = JSON.stringify(data)
  return fetch(
    "api/collection/"+cid+"/config",
    {
      method: "PUT",
      body,
      headers: {
          "Content-Type": "application/json",
          // "Content-Type": "application/x-www-form-urlencoded",
      }
    }
  ).then(res => {console.log("put complete")})
}

async function putMeta(cid, data) {
  let body = JSON.stringify(data)
  return fetch(
    "api/collection/"+cid+"/meta",
    {
      method: "PUT",
      body,
      headers: {
          "Content-Type": "application/json",
      }
    }
  ).then(res => {console.log("put complete")})
}

async function postStart(cid) {
  return fetch(
    "api/crawler/start/"+cid,
    {
      method: "POST"
    }
  ).then(res => {console.log("postStart complete")})
}

async function fetchItems(cid, meta) {
  let result = []
  if (!meta) {
    result = await fetch("api/collection/"+cid+"/item").then(res => {return res.json()})
  } else {
    result = await fetch("api/collection/"+cid+"/items").then(res => {return res.json()})
  }
  return result
}

async function deleteItems(cid) {
  return fetch(
    "api/collection/"+cid+"/items",
    {
      method: "DELETE",
    }
  ).then(res => {console.log("delete complete")})
}

async function fetchScheme(cid, iid) {
  return fetch("api/collection/"+cid+"/item/"+iid+"/scheme").then(res => {return res.json()})
}

async function fetchCrawler() {
  return fetch("api/crawler").then(res => {return res.json()})
}

async function fetchCrawlerTasks() {
  return fetch("api/crawler/tasks").then(res => {return res.json()})
}

async function fetchDownloader() {
  return fetch("api/downloader").then(res => {return res.json()})
}

async function fetchDownloaderTasks() {
  return fetch("api/downloader/tasks").then(res => {return res.json()})
}

async function pollCrawler() {
  return fetch("api/crawler/poll")
}

async function pollDownloader() {
  return fetch("api/downloader/poll")
}

function getImageSrc(cid, iid) {
  return  '/api/collection/'+cid+'/data/'+iid
}
