console.log("Clean Recommended running...");

// discontinuing indefinitely to focus scope of project

function debounce(func, delay=500){
    let timeOutId;

    return function (...args){
        clearTimeout(timeOutId)
        timeOutId = setTimeout(()=>func.apply(this, args), delay)
    }
}

function cleanRecommended(video){
    const progressBar = video.querySelector("div.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment")
    if (!progressBar) return;

    const width = parseFloat(progressBar.style.width || getComputedStyle(progressBar).width);
    const parentWidth = parseFloat(getComputedStyle(progressBar.parentElement).width);
    const percent = (width / parentWidth) * 100;

    if (percent > 1 ){ // <-- update value to be user inputted
            // video.style.border = '2px solid white';
            // video.style.backgroundColor = '#8B0000';
            //grab title
            try{
                let title = video.querySelector('h3.yt-lockup-metadata-view-model-wiz__heading-reset').title
                console.log(`removing ${title}`)
            }
            catch(err){
                console.log("removing: ", video)
            }
            
            video.style.display = "none" 
    }
}

function blackOut(adSlot){
    const blackout = document.createElement('div');
            blackout.style.position = 'absolute';
            blackout.style.top = '0';
            blackout.style.left = '0';
            blackout.style.width = '100%';
            blackout.style.height = '100%';
            blackout.style.backgroundColor = '#0f0f0f';
            blackout.style.opacity = '1';
            blackout.style.zIndex = '9999'; // make sure it's on top
            adSlot.appendChild(blackout)
}

function removeShorts(container){
    // container.style.border = '2px solid white';
    // container.style.backgroundColor = '#8B0000';

    container.style.display = "none"
}
  
function watchAds(adSlot){
    // adSlot.style.border = '2px solid white';
    // adSlot.style.backgroundColor = '#8B0000';

    adSlot.style.display = "none"
}

function checkInitial(){
    document.querySelectorAll("yt-lockup-view-model.ytd-item-section-renderer").forEach(video=>cleanRecommended(video))
    document.querySelectorAll("ytd-ad-slot-renderer").forEach(ad=>watchAds(ad))
    let shorts = window.location.pathname == "/" ? "ytd-rich-shelf-renderer":"ytd-reel-shelf-renderer"
    document.querySelectorAll(shorts).forEach(container=>removeShorts(container))
}

function waitForContentsToLoad(observer){
    let contents = document.querySelector("#contents")
    if (contents == null){
        setTimeout(() => waitForContentsToLoad(observer), 1000)
        return;
    }
    setTimeout(checkInitial, 500)
    observer.observe(contents, { childList: true, subtree: true })
}

function filterNode(node){
    const tag = node.tagName ? node.tagName.toUpperCase() : "";
    let target = node?.querySelector("yt-lockup-view-model") ?? null
    if (target != null || tag == "YT-LOCKUP-VIEW-MODEL") {
        console.log(`cleaning recommended...`)
        cleanRecommended(node)
        return true
    }
    target = node.querySelector("ytd-ad-slot-renderer")
    if (target != null || tag == "YTD-AD-SLOT-RENDERER") {
        console.log(`Blocking ads...`)
        watchAds(node)
        return true
    }
    target = node.querySelector("ytd-reel-shelf-renderer")
    if (target != null || /ytd-(reel|rich)-shelf-renderer/i.test(tag)) {
        console.log(`Blocking shorts...`)
        removeShorts(node)
        return true
    }

    return false
}

let observer;
window.addEventListener("yt-navigate-finish", () => {

    if (observer) observer.disconnect();
    const debouncedCheckInitial = debounce(checkInitial, 1500);

    observer = new MutationObserver((mutationList, observer) => {
        let foundRelevant = false
        for (const mutation of mutationList) {
            for (const node of mutation.addedNodes){ // node == "ytd-rich-item-renderer" if on homepage, else node == targets below
                foundRelevant ||= filterNode(node)
            }
        }
        if (foundRelevant) debouncedCheckInitial();
    })

    waitForContentsToLoad(observer)
  });

  // document.querySelector("#player-ads > ytd-player-legacy-desktop-watch-ads-renderer > ytd-companion-slot-renderer")