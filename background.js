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

    return true;
})