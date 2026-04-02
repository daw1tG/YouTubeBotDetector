console.log("Bot detector running...");


// function debounce(func, delay=500){
//     let timeOutId;

//     return function (...args){
//         clearTimeout(timeOutId)
//         timeOutId = setTimeout(()=>func.apply(this, args), delay)
//     }
// }

function throttle(func, delay=500){
    let shouldWait
    let waitingArgs

    const timeoutFunc = () => {
        if (waitingArgs == null){
            shouldWait = false
        }
        else {
            func(...waitingArgs)
            waitingArgs = null
            setTimeout(timeoutFunc , delay)
        }
    }

    return function (...args){
        if (shouldWait){
            waitingArgs = args
            return
        }

        func(...args)
        shouldWait = true

        setTimeout(timeoutFunc , delay)
    }
}

const API = "http://localhost:3000/" // "youtubebotdetector-production.up.railway.app/" 
let serverRunning = false
async function postToAPI(path, data) {
    try {
        let res = await fetch(API + path, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        })
        if (res) serverRunning = true
    
        return await res.json()
    } catch (err) {
        serverRunning = false
        return null
    }
}

async function postCommentDataToServer(commentInfo){
    return await postToAPI("api/collect", commentInfo)
}

async function getBotProbability(commentInfo){
    return await postToAPI("api/predict", commentInfo)
}

function stripEmojis(text){
    return text.replace( /(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*)/gu, "")
}

let oldComments;
const flaggedEmojisSet = new Set(flaggedEmojis)

function checkForBotComment(username, text){
    const messageData = {}

    // check emojis`
    const emojiRegex = /(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*)/u;
    messageData.hasEmojis = emojiRegex.test(text) ? 1:0
    messageData.endsWithEmojis = emojiRegex.test(text.slice(-6)) ? 1:0

    messageData.flaggedEmojiCount = 0
    messageData.hasFlaggedEmoji = 0
    const emojis = text.match(emojiRegex)
    if (emojis){
        for (let emoji of emojis.input){
            if (flaggedEmojisSet.has(emoji)){
                messageData.hasFlaggedEmoji = 1
                messageData.flaggedEmojiCount++
            }
        }
        
    }

    // username check
    isBotUsername(username, messageData)

    // word count
    const words = text.trim().split(/\s+/);
    messageData.wordCount = words.length;
    messageData.isShortComment = messageData.wordCount <= 4 ? 1:0

    // check duplicate comment
    if (oldComments == null) oldComments = new Set();
    const cleanedText = stripEmojis(text) // bots copy comments and append emojis at the end
    messageData.isDuplicateComment = 1
    if (oldComments.has(cleanedText)){
        messageData.isDuplicateComment = 1
    }
    else {
        oldComments.add(cleanedText)
    }

    // check common phrases
    const commonBotPhrases = /(genuinel?y?|i needed th(is|at)|ress?onate|emotionally|that'?s rare|colorful|adore|just being(?: so)? real|confident|hits?( me)? deep)/ig
    messageData.hasCommonBotPhrases = commonBotPhrases.test(text) ? 1:0
    messageData.commonBotPhrasesCount = (text.match(commonBotPhrases) || []).length
    // check for time stamp
    const hasTimeStamp = /\d?\d:\d\d/
    messageData.hasTimeStamp = hasTimeStamp.test(text) ? 1:0

    // !|? spam
    messageData.exclamationCount = text.split(/!/g).length
    messageData.punctuationClusters = (text.match(/[!?]{2,}/g) || []).length;

    console.log(username, ": ", messageData)

    return messageData
}


const femaleNamesRegex = new RegExp(femaleNames
                                    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
                                    .join('|')
                                    , "i")

function isBotUsername(username, messageData) {
    console.log("checking: ", username)
    const crillicRegex = /\p{Script=Cyrillic}+/u
    
    messageData.hasCyrillicUsername = crillicRegex.test(username) ? 1:0

    // test entropy
    const uniqueChars = (new Set(username)).size
    messageData.usernameEntropy = uniqueChars / username.length

    const cleanedUsername = username.slice(1).trim()
    // console.log("match: ", cleanedUsername.match(femaleNamesRegex))

    messageData.hasFemaleNameInUsername = femaleNamesRegex.test(cleanedUsername) ? 1:0
}

function checkProfileWithYTInitialData(profileUrl, username) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "get yTInitialData", url: profileUrl },
            response => {
                if (!response.success) {
                    console.error("Failed to fetch:", response.error);
                    resolve(false);
                    return;
                }

                const ytInitialData = response.ytInitialData;

                const hasVideos = ytInitialData.contents.twoColumnBrowseResultsRenderer.autoplay
                if (hasVideos) resolve(false)

                if (ytInitialData
                    .contents
                    .twoColumnBrowseResultsRenderer
                    .tabs.length > 1) resolve(false); // checks for any posts
                
                let profilePic = ytInitialData.metadata
                        ?.channelMetadataRenderer
                        ?.avatar?.thumbnails[0]?.url

                const externalLink = ytInitialData?.header?.pageHeaderRenderer
                        ?.content?.pageHeaderViewModel
                        ?.attribution?.attributionViewModel
                        ?.text?.commandRuns?.[0]
                        ?.onTap?.innertubeCommand
                        ?.urlEndpoint

                // if (externalLink 
                //     && !/youtube.com\/(watch|@|shorts)|tiktok|twitch|discord|twitter|insta|x\.com/i
                //     .test(externalLink.url)) {
                //         console.log(username, ": external link")
                //     resolve(true);
                //     return;
                // }

                if (externalLink){
                    const url = externalLink.url.toLowerCase();
                    
                    const legitimatePlatforms = /youtube\.com\/(watch|@|shorts)|tiktok|twitch|discord|twitter|x\.com|instagram|facebook|spotify|soundcloud|patreon|github|linkedin|bandcamp|vimeo/i;
                    
                    const suspiciousPatterns = [
                        /\.(xyz|top|click|link|online|site|live|cam|buzz)$/i, // suspicious TLDs
                        /onlyfans|fansly|dating|casino|bet|whatsapp|telegram/i, // bot keywords
                        /bit\.ly|tinyurl|shorturl|cutt\.ly|t\.co/i, // URL shorteners (often used by bots)
                        /free|earn|money|crypto|nft|prize|gift|winner/i, // scam keywords in URL
                        /\d{4,}/, // long number sequences in domain
                    ];
                    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url))
                    if (!legitimatePlatforms.test(url) && isSuspicious){ resolve(true) }
                }

                const descriptionRegex = /(link|click |find me|onlyfans|dating|18|💋|👇|💦|🍓|🍒|🍑|[\u0250-\u02AF\u1D00-\u1D7F\uA720-\uA7FF])/ui;

                const description = ytInitialData
                    ?.header?.pageHeaderRenderer?.content
                    ?.pageHeaderViewModel?.description
                    ?.descriptionPreviewViewModel?.description?.content ?? "";

                const description2 = ytInitialData
                    ?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]
                    ?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
                    ?.itemSectionRenderer?.contents?.[0]
                    ?.shelfRenderer?.endpoint
                    ?.showEngagementPanelEndpoint?.engagementPanel
                    ?.engagementPanelSectionListRenderer?.header
                    ?.engagementPanelTitleHeaderRenderer?.title?.simpleText ?? "";

                if (descriptionRegex.test(description) ||
                    descriptionRegex.test(description2)) {
                        console.log(username, ": description")
                    resolve(true);
                    return;
                }

                const linkedChannelRabbitHole = ytInitialData.contents
                    ?.twoColumnBrowseResultsRenderer?.tabs[0]?.tabRenderer
                    ?.content?.sectionListRenderer?.contents[0]
                    ?.itemSectionRenderer?.contents[0]
                    ?.shelfRenderer?.content?.horizontalListRenderer?.items
                
                if (linkedChannelRabbitHole && description2.match(/^Subscriptions$/)) {
                    console.log(username, ": rabbit hole")
                    resolve(true)
                }

                resolve(false);
            }
        );
    });
}

function checkProfile(username){
    const profileUrl = "https://www.youtube.com/" + username
    return checkProfileWithYTInitialData(profileUrl, username) 
}

function storeCommentDataInExtension(commentInfo){
    try {
        chrome.runtime.sendMessage({ action: "store data", data: commentInfo })
        console.log("Data stored")
    } catch (error) {
        console.log("Failed to save comment data")
        return
    }
}


function loadSavedCommentData(){
    try {
        if (!serverRunning) {
            setTimeout(loadSavedCommentData, 10000)
            return
        }
        chrome.runtime.sendMessage({ action: "retrieve data"}, async (data) => {
            batchSeverPost(data)
        })
    } catch (error) {
        console.log("Failed to retrieve stored comment data")
        return
    }
}

let commentDataset;
async function batchSeverPost(comments){
    const chunkSize = 1000;

    for (let i = 0; i < comments.length; i += chunkSize){
        const res = await postCommentDataToServer({data:comments.slice(i, i+chunkSize), list:true})
        if (!res){
            // server is offline
            storeCommentDataInExtension(comments.slice(i))
            console.log(commentDataset)
            comments = []
            console.log(commentDataset)
        }
        else {
            if (res.message == "Success"){
                if (res.unadded.length) storeCommentDataInExtension(res.unadded.map(x => x.data))
            }
            else {
                console.log(res.error)
            }
        }
    }
}

window.addEventListener("beforeunload", batchSeverPost(commentDataset))

async function scanComment(comment) {
    // check messages and usernames
    const commentInfo = grabCommentInfo(comment)
    commentInfo.Bot = 0

    if (!commentDataset) commentDataset = []
    let botProfile = await checkProfile(commentInfo.Username)
    if (botProfile) {
        console.log('🚨 Potential Bot Detected:', commentInfo.Username);
        comment.style.border = '2px solid white';
        comment.style.backgroundColor = '#8B0000';

        commentInfo.Bot = 1
    }

    commentDataset.push(commentInfo)
    if (commentDataset.length >= 50) batchSeverPost(commentDataset)

    // comment.remove();
}

function grabCommentInfo(comment){
    const authorSpan = comment.querySelector('#author-text span');
    if (!authorSpan) {
        console.log("no authorSpan")
        return;
    }
    const Username = authorSpan.textContent.trim();

    let message = comment.querySelector("yt-attributed-string#content-text")
    let Text = message.childNodes[0].textContent

    let Pfp = comment.querySelector("img").src

    let data = checkForBotComment(Username, Text)

    return { Username: Username, Text: Text, Pfp: Pfp, data: data }
}


let observer
function watchComments(commentsSection) {
    observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node?.tagName === "YTD-COMMENT-THREAD-RENDERER" || node?.tagName === "YTD-COMMENT-VIEW-MODEL") {
                    visibilityObserver.observe(node)
                    // node.style.border = '2px solid red'; // red == detected, blue == not bot
                    //newComments.push(node)
                }
            }
        }

        // pause detection
        
        // if (isScrolling || document.hidden) return
  
        // if (newComments.length) {
        //     proccessNewComments(newComments)
        //     newComments = []
        // }
    });
  
    observer.observe(commentsSection, { childList: true});
  
    console.log("Watching for new YouTube comments...");
}

let commentsSection
function waitForCommentsToLoad(){
    let commentsContainer
    
    if (window.location.pathname.match(/shorts/)){
        commentsSection = document.querySelector("div#contents > ytd-comment-thread-renderer")?.parentNode
    }
    else if (window.location.pathname.match(/watch/)){
        commentsContainer = document.querySelector("#comments");
        commentsSection = commentsContainer.querySelector("div#contents")
    }
  
    if (!commentsSection) {
        console.log("No comments section found yet. Retrying...");
        setTimeout(waitForCommentsToLoad, 500);
    }
    else{
        commentSectionObserver.observe(commentsSection)
        watchComments(commentsSection)
    }
}
  
  
window.addEventListener("yt-navigate-finish", () => {
    console.log("Navigation finished on YouTube");
    // in development
    if (window.location.pathname.match(/(watch|shorts)/)){
        waitForCommentsToLoad();
        oldComments == null
    }
    loadSavedCommentData()
});


// pause while scrolling fast
let isScrolling = false
let scrollTimeout = null

window.addEventListener("scroll", () => {
    isScrolling = true

    if (scrollTimeout){
        clearTimeout(scrollTimeout)
        // console.log("scrolling")
    }

    scrollTimeout = setTimeout(() => {
        isScrolling = false
       //  console.log("stopped scrolling")
        // console.log("scrolledPast: ", scrolledPast)

        // scrolledPast?.forEach(comment => visibilityObserver.observe(comment))
        // scrolledPast = []
    }, 150)
}, { passive: true })


const processNewCommentsWithIntersectionObserver = throttle((comments) => {
    for (const comment of comments) {
        scanComment(comment)
    }
}, 500)

const scannedComments = new WeakSet()
let scrolledPast

const visibilityObserver = new IntersectionObserver(entries => {

    if (scrolledPast == null){
        scrolledPast = []
    }

    for (const entry of entries) {
        const comment = entry.target
        
        // if (isScrolling) continue
        entry.target.style.border = '2px solid red'
        if (!entry.isIntersecting ) { //|| isScrolling
            //scrolledPast.push(comment)
            continue
        }

        entry.target.style.border = '2px solid blue'
        if (scannedComments.has(comment)) continue

        scannedComments.add(comment)
        scanComment(comment)
    }
     
}, { threshold: 0.15})


let commentSectionObserver = new IntersectionObserver(entry => {
    if (entry.isIntersecting && observer){
        entry.target.style.border = '2px solid green'
        console.log("connecting observer")
        // watchComments()
        //observer.observe(commentsSection, { childList: true })
    }
    else if ((!entry.isIntersecting || document.hidden) && observer){
        console.log("disconnecting observer")
        // observer?.disconnect()
    }
}, {threshold: 0.15 })
  


// //common bot comments: 💖💦♥♥, 3 random emojis at end, or emojis with no text
// //ytd-ad-slot-renderer
// //const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{1F004}-\u{1F0CF}\u{2934}\u{2935}]/u;
// // <ytd-comments id="comments" ...> 
// // <div id="replies"> <-- other commenters usually call out bots already


// // common bio --> ʜɪ ʜᴀɴᴅꜱᴏᴍᴇ, ᴡᴀɴᴛ ᴀ ᴅᴀᴛᴇ ᴡɪᴛʜ ᴍᴇ? ɪᴛ’ꜱ ᴇᴀꜱʏ, ꜰɪɴᴅ ᴍᴇ ʙᴇʟᴏᴡ
// //            -->
// @DianneR.Mullins --> '"Youre dad grips my hair while i give brain💝💘🙏💸"\n -Not me 💀💀'
// @KaterinaLoveMaker --> 'Clix or me ?!! vote For Me ✨ 🖤!!!🧡!!!😘!!!🫶🏻' <-- ! spam
// botted likes 
// @Владислава Лидия Марина <--russain names?
// @TaylorReed-j7u --> "Can’t get over how genuine you are, this is the kind of content that sticks."
// @AngelinaBarbara-e7d --> I adore how she simply gets up and exits the water without incident as soon as she receives the life ring 😂.
// @MinhNgogo-e7f --> what even is this channel and why am i hooked 🧡💖
// @Phanphuongomuhqhq --> just here like 🍒🧡
// @ÝTrươngng-w7z --> Thank you so much for your colorful and creative videos. Your videos are a real work of art.💡‍♀️🐡
// @NgọcCaoao --> Keep on creating great content. Your videos are always neat and informative.😹🥩🥥
// @AmandaLewis-x3t --> I needed this kind of truth today, thank you.
// @HannahClark-s7d --> You shine without even trying — that’s rare.
// @VoVanTuTu --> this is youtube at its finest 😻👅
// @HaYenNhihi --> % confused, % impressed 🔥😛
// @BiancaTudore --> Clients are able to write.  You elevated Benjamin to customer even though he was a Case employee. <-- stealing some on else's comment
// @AmberPhillips-k4b --> Your chill presence is a reminder that realness still exists.
// @JosephineBrooks-n2z --> Can’t get over how genuine you are, this is the type of content that matters.
// @AuroraSavannahLucy --> i woke up today feeling sad about a recent break up with my ex of 2 years... your videos have been an emotional crutch to me since I'm a very emotionally dependent person and have a hard time realizing what I am feeling. Your reflections during these videos ressonate a shit ton with me, so thank you, Ken. You are an amazing person 😓😓😔😔
// @HarperWilson-o9k--> Every second of this felt raw, no filters needed.

// // Reused pfps: structure =
// // <div id='author-thumbnail'>
// //  <button id = 'author-thumbnail-button'>
//         //<yt-img-shadow>
//             //<img height ='40' width ='40' src={reused}>
