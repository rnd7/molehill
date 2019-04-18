let selectedCollection
let container = document.querySelector("#content")
function getTemplate(selector) {
  const t = document.querySelector(selector).cloneNode(true)
  return document.importNode(t.content, true)
}

async function showItems() {
  removeChildren(container)
  if (!selectedCollection) {
    let page = getTemplate('#error-template')
    page.querySelector('.error').innerHTML = "No Collection selected"
    container.appendChild(page)
  } else {
    let page = getTemplate('#items-template')
    let cid = selectedCollection
    let items = await fetchItems(cid, true)
    items.sort((a,b) => { b.created - a.created})
    items.forEach((item) => {
      const elem = document.createElement('LI')
      const link = document.createElement('A')
      link.href = item.link
      link.target = "_blank"
      elem.appendChild(link)
      page.querySelector('ul').appendChild(elem)
      Object.keys(item.display).forEach(key => {
        switch (item.display[key]) {
          case "value":
            const valueElem = document.createElement('div')
            valueElem.innerHTML = item.dataset[key]
            link.appendChild(valueElem)
            break;
          case "image":
            const imgElem = document.createElement('img')
            imgElem.src = getImageSrc(cid,item.dataset[key])
            link.appendChild(imgElem)
            break;
          default:
        }
      })
    })
    page.querySelector("button[name=remove-all]").addEventListener("click", async e => {
      let collection = await fetchCollection(selectedCollection)
      if(
        collection
        && confirm(
          "Do you really want to delete all items of the collection named "+ collection.name+"?"
        )
      ){
        try {
          await deleteItems(selectedCollection)
        } catch(e) {
          console.log(e)
        }
      }
    })
    container.appendChild(page)

  }
}



async function showCollections() {
  removeChildren(container)
  let page = getTemplate('#collection-template')
  let collections = await fetchCollections(true)
  collections.sort((a, b) => {
      const ta = a.name.toUpperCase();
      const tb = b.name.toUpperCase();
      return (ta < tb) ? -1 : (ta > tb) ? 1 : 0;
  })
  for (let i=0; i < collections.length; i++) {
    const collection = collections[i]
    const elem = document.createElement('LI')
    elem.innerHTML = collection.name
    if (collection.id === selectedCollection) {
      elem.classList.add('selected')
    }
    elem.addEventListener('click', (e) => {
      selectCollection(collection.id)
      showCollections()
      //setView(VIEW_LIST)
    })

    page.querySelector('ul').appendChild(elem)
  }
  page.querySelector("button[name=new-collection]").addEventListener("click", async e => {
    try {
      let result = await postCollection("New Collection")
      console.log(result)
      if(result) selectCollection(result.id)
      await showCollections()
    } catch(e) {
      console.log(e)
    }
  })
  page.querySelector("button[name=delete-selected]").addEventListener("click", async e => {
    let collection = await fetchCollection(selectedCollection)
    if(
      collection
      && confirm(
        "Do you really want to delete the collection named "+ collection.name+"?"
      )
    ){
      try {
        await deleteCollection(selectedCollection)
        deselectCollection()
        showCollections()
      } catch(e) {
        console.log(e)
      }
    }
  })
  container.appendChild(page)

}
async function showMeta() {
  removeChildren(container)
  if (!selectedCollection) {
    let page = getTemplate('#error-template')
    page.querySelector('.error').innerHTML = "No Collection selected"
    container.appendChild(page)
  } else {
    let cid = selectedCollection
    let collection = await fetchCollection(cid)
    let page = getTemplate('#meta-template')
    let nameInput = page.querySelector('input[name=name]')
    let idInput = page.querySelector('input[name=id]')
    let dateInput = page.querySelector('input[name=date]')
    nameInput.value = collection.name
    idInput.value = collection.id
    dateInput.value = collection.created
    page.querySelector("button[name=save-meta]").addEventListener("click", async e => {
      try {

        //const json = JSON.parse(textarea.value)
        //console.log("val", json)
        console.log("name", nameInput.value)
        await putMeta(
          selectedCollection,
          Object.assign({}, collection, {name: nameInput.value})
        )
        showMeta()
        updateStatusBar()
      } catch(e) {
        console.log(e)
      }

    })
    container.appendChild(page)
  }
}

async function showConfig() {
  removeChildren(container)
  if (!selectedCollection) {
    let page = getTemplate('#error-template')
    page.querySelector('.error').innerHTML = "No Collection selected"
    container.appendChild(page)
  } else {
    let cid = selectedCollection
    let page = getTemplate('#config-template')
    let config = await fetchConfig(cid)
    let textarea = page.querySelector('textarea')
    textarea.value = JSON.stringify(config, null, 2)
    page.querySelector("button[name=save-config]").addEventListener("click", e => {
      try {
        const json = JSON.parse(textarea.value)
        console.log("val", json)
        putConfig(selectedCollection, json)
      } catch(e) {
        console.log(e)
      }

    })
    container.appendChild(page)
  }
}

async function showCrawl() {
  removeChildren(container)
  let page = getTemplate('#status-template')
  let crawler = await fetchCrawler()
  let downloader = await fetchDownloader()
  console.log("stats")
  page.querySelector("button[name=start]").addEventListener("click", e => {
    postStart(selectedCollection)
  })
  container.appendChild(page)
  updateCrawlerTasks()
  updateDownloaderTasks()
}

async function updateCrawlerTasks() {
  let crawlerContainer = document.querySelector('ul.crawler')
  if (!crawlerContainer) return
  let crawlerTasks = await fetchCrawlerTasks()
  removeChildren(crawlerContainer)

  for (let i = 0; i<crawlerTasks.length; i++) {
    let elem = document.createElement('LI')
    let urlElem = document.createElement('DIV')
    urlElem.innerHTML = crawlerTasks[i].url
    elem.appendChild(urlElem)
    crawlerContainer.appendChild(elem)
  }
}
async function updateDownloaderTasks() {
  let downloaderContainer = document.querySelector('ul.downloader')
  if (!downloaderContainer) return
  let downloaderTasks = await fetchDownloaderTasks()
  removeChildren(downloaderContainer)

  for (let i = 0; i<downloaderTasks.length; i++) {
    let elem = document.createElement('LI')
    let urlElem = document.createElement('DIV')
    urlElem.innerHTML = downloaderTasks[i].url
    elem.appendChild(urlElem)
    downloaderContainer.appendChild(elem)
  }
}

const VIEW_SELECT = "select"
const VIEW_LIST = "items"
const VIEW_EDIT = "edit"
const VIEW_CRAWL = "crawl"
const VIEW_META = "meta"

let view

function updateTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active")
  })
  document.querySelector(".tab."+view).classList.add("active")
}
function updateUI() {
  updateTabs()
  updateStatusBar()
}

document.querySelector("#select").addEventListener("click", e => {
  setView(VIEW_SELECT)
})
document.querySelector("#items").addEventListener("click", e => {
  setView(VIEW_LIST)
})
document.querySelector("#edit").addEventListener("click", e => {
  setView(VIEW_EDIT)
})
document.querySelector("#crawl").addEventListener("click", e => {
  setView(VIEW_CRAWL)
})
document.querySelector("#meta").addEventListener("click", e => {
  setView(VIEW_META)
})

function setView(value) {
  view = value
  switch (view) {
    case VIEW_SELECT:
      showCollections()
      break;
    case VIEW_LIST:
      showItems()
      break;
    case VIEW_EDIT:
      showConfig()
      break;
    case VIEW_CRAWL:
      showCrawl()
      break;
    case VIEW_META:
      showMeta()
      break;
  }
  updateUI()
}

async function updateStatusBar() {
  if (selectedCollection) {
    let collection = await fetchCollection(selectedCollection)
    document.querySelector("#selected-collection").innerHTML = collection.name
  } else {
    document.querySelector("#selected-collection").innerHTML = "none"
  }
}

const POLL_TIMEOUT = 10
let crawler_poll = false
async function crawlerUpdate() {
  let crawler = await fetchCrawler()
  document.querySelector("#crawler-tasks").innerHTML = crawler.tasks + crawler.processing
  await updateCrawlerTasks()
  if (crawler_poll) return
  console.log("crawler poll")
  crawler_poll = true
  await pollCrawler()
  console.log("crawler poll ended")
  crawler_poll = false
  setTimeout(crawlerUpdate, POLL_TIMEOUT)
  /*let crawler = await fetchCrawler()
  let downloader = await fetchDownloader()
  document.querySelector("#downloader-tasks").innerHTML = downloader.tasks + downloader.processing

  */
}
crawlerUpdate()


let downloader_poll = false
async function downloaderUpdate() {
  let downloader = await fetchDownloader()
  document.querySelector("#downloader-tasks").innerHTML = downloader.tasks + downloader.processing
  await updateDownloaderTasks()
  if (downloader_poll) return
  console.log("downloader poll")
  downloader_poll = true
  await pollDownloader()
  console.log("downloader poll ended")
  downloader_poll = false
  setTimeout(downloaderUpdate, POLL_TIMEOUT)
}
downloaderUpdate()

function deselectCollection() {
  selectedCollection = null
}
function selectCollection(collection) {
  selectedCollection = collection
  updateStatusBar()
}

function removeChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
}
setView(VIEW_SELECT)
