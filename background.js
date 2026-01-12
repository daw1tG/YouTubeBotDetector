chrome.runtime.onMessage.addListener((message, sender, sendResponse)=>{
    if (message.action == "get yTInitialData"){
        fetch(message.url)
        .then(result => result.text())
        .then(html => {
            const match = html.match(/var ytInitialData = (.*?);\s*<\/script>/s)
            if (match){
                const data = JSON.parse(match[1])
                sendResponse({ success: true, ytInitialData: data})
            }
        })
        .catch(err => sendResponse({ success: false, error: err.toString() }))
    }
    else if (message.action == "store data"){
        chrome.storage.local.get(["saved"]).then(result => {
            const oldData = result.saved || []
			chrome.storage.local.set({ saved: [ ...oldData, message.data]})
		})
    }
    else if (message.action == "retrieve data"){
       chrome.storage.local.get(["saved"]).then(result => {
			sendResponse(result.saved)
		})
        .then(()=>chrome.storage.local.set({ saved: []}))
    }

    return true;
})