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

function stripEmojis(text){
    return text.replace( /(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*)/gu, "")
}

let oldComments;

function checkForBotMessage(comment, text){
    const emojiRegex = /(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*)/gu;
    const hasEmojis = text.match(emojiRegex)
    let flags = 0
    // to do
    // emojis
    if (hasEmojis){
        flags += hasEmojis.length
        for (let emoji of hasEmojis){
            if (flaggedEmojisSet.has(emoji)){
                flags += 5
            }
        }
        
    }

    // check duplicate comment
    if (oldComments == null) oldComments = new Set();
    const cleanedText = stripEmojis(text) // bots copy comments and append emojis at the end
    if (oldComments.has(cleanedText)){
        flags += 1000000 // for sure a bot
    }
    else {
        oldComments.add(cleanedText)
    }

    // check common phrases
    const commonBotPhrases = /(genuine|i needed th(is|at)|ress?onate|emotionally|that'?s rare|colorful|adore|just being(?: so)? real|confident)/i
    if (commonBotPhrases.test(text)){
        flags += 1000
    }

    // check for time stamp
    const hasTimeStamp = /\d?\d:\d\d/
    if (hasTimeStamp.test(text)){
        flags -= 1000 // probably human
    }

    // ! spam
    let exclamationCount = text.match(/!+(?:.)/g) || []

    if (exclamationCount.length > 3){
        flags += 10
    }

    return flags > -1
}


const femaleNamesRegex = new RegExp(femaleNames
                                    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g))
                                    .join('|')
                                    , "i")

function isBotUsername(username) {
    console.log("checking: ", username)
    const crillicRegex = /^\p{Script=Cyrillic}+/u
    const cleanedUsername = username.slice(1).trim()
    if (cleanedUsername.match(crillicRegex)){
        return true;
    }

    console.log("match: ", cleanedUsername.match(femaleNamesRegex))

    return femaleNamesRegex.test(cleanedUsername)
}

function grabBotPFPs(){
    let setOfBotPFPs
    try {
        chrome.runtime.sendMessage(
            { action: "get PFPs"},
             response => setOfBotPFPs = response
        )
    } catch (error) {
        console.log(err)
    }

    return setOfBotPFPs
}

function updateBotPFPs(set){
    try {
        chrome.runtime.sendMessage(
            { action: "update PFPs", set: set },
             response => console.log(response)
        )
    } catch (error) {
        console.log(err)
    }
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

                if (ytInitialData
                    .contents
                    .twoColumnBrowseResultsRenderer
                    .tabs.length > 1) resolve(false); // checks for any posts
                
                let profilePic = ytInitialData.metadata
                        ?.channelMetadataRenderer
                        ?.avatar.thumbnails

                let setOfBotPFPs = grabBotPFPs()

                if (setOfBotPFPs && setOfBotPFPs.has(profilePic)){
                    resolve(true)
                }

                const externalLink = ytInitialData?.header?.pageHeaderRenderer
                        ?.content?.pageHeaderViewModel
                        ?.attribution?.attributionViewModel
                        ?.text?.commandRuns?.[0]
                        ?.onTap?.innertubeCommand
                        ?.urlEndpoint;

                if (externalLink 
                    && !/(?:youtube){2}|tiktok|twitch|discord|twitter|insta|x\.com/i
                    .test(externalLink.url)) {
                    console.log(username, " is bot for sure");
                    if (setOfBotPFPs != null){
                        setOfBotPFPs.add(profilePic)
                        updateBotPFPs(setOfBotPFPs)
                    }
                    resolve(true);
                    return;
                }

                const descriptionRegex = /(link|click|find me|onlyfans|dating|💋|👇|💦|🍓|🍒|🍑)/i;

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
                    if (setOfBotPFPs != null){
                        setOfBotPFPs.add(profilePic)
                        updateBotPFPs(setOfBotPFPs)
                    }
                    resolve(true);
                    return;
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

async function scanComment(comment) {
    // check messages and usernames
    const authorSpan = comment.querySelector('#author-text span');
    if (!authorSpan) {
        console.log("no authorSpan")
        return;
    }

    let message = comment.querySelector("yt-attributed-string#content-text")
    let text = message.childNodes[0].textContent

    const username = authorSpan.textContent.trim();
    if (!isBotUsername(username)){
        console.log(`${username} is not a bot`)
        return
    }
    if (!checkForBotMessage(comment, text)) {
        console.log(`${username} is not a bot`)
        return
    }

    let botProfile = await checkProfile(username)
    if (!botProfile){
        console.log(`${username} might be a bot`)

        // comment.style.border = '2px solid white';
        // comment.style.backgroundColor = '#8B0000';
        return
    }
    else {
        comment.style.border = '2px solid white';
        comment.style.backgroundColor = '#8B0000';
    }
    console.log('🚨 Potential Bot Detected:', username);

    // test
    // comment.style.border = '2px solid white';
    // comment.style.backgroundColor = '#8B0000';

    // comment.remove();
}


let observer
function watchComments(commentsSection) {
    const throttleWithArrayArg = (comments)=>{
        for (const comment of comments){
            if (comment && comment.tagName === "YTD-COMMENT-THREAD-RENDERER") {
                console.log("New comment loaded: ", comment);
                scanComment(comment);
            }
        }
    }

    const throttleWithSingleArg = (comment)=>{
        if (comment && comment.tagName === "YTD-COMMENT-THREAD-RENDERER") {
            console.log("New comment loaded: ", comment);
            scanComment(comment);
        }
    }
    const proccessNewComments = throttle(throttleWithArrayArg, 500)

    let newComments = [];
    observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            newComments.push(...mutation.addedNodes)
        }

        // pause detection
        
        if (isScrolling || document.hidden){
            return
        }
        
        if (newComments.length) {
            // newComments.forEach(comment => proccessNewComments(comment))
            proccessNewComments(newComments)
            newComments = []
        }
    });
  
    observer.observe(commentsSection, { childList: true});
  
    console.log("Watching for new YouTube comments...");
}

function waitForCommentsToLoad(){
    const commentsContainer = document.querySelector("#comments");
    const commentsSection = commentsContainer.querySelector("div#contents")
  
    if (!commentsSection) {
        console.log("No comments section found yet. Retrying...");
        setTimeout(waitForCommentsToLoad, 500);
    }
    else{
        watchComments(commentsSection)
    }
}
  
  
window.addEventListener("yt-navigate-finish", () => {
    console.log("Navigation finished on YouTube");
    // in development
    if (window.location.pathname.includes("watch")){
        waitForCommentsToLoad();
        oldComments == null
    }
});


// pause while scrolling fast
let isScrolling = false
let scrollTimeout = null

window.addEventListener("scroll", () => {
    isScrolling = true

    if (scrollTimeout){
        clearTimeout(scrollTimeout)
    }

    scrollTimeout = setTimeout(() => {
        isScrolling = false
    }, 150)
}, { passive: true })

  


// //common bot comments: 💖💦♥♥, 3 random emojis at end, or emojis with no text
// //ytd-ad-slot-renderer
// //const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{1F004}-\u{1F0CF}\u{2934}\u{2935}]/u;
// // <ytd-comments id="comments" ...> 
// // <div id="replies"> <-- other commenters usually call out bots already


// // common bio --> ʜɪ ʜᴀɴᴅꜱᴏᴍᴇ, ᴡᴀɴᴛ ᴀ ᴅᴀᴛᴇ ᴡɪᴛʜ ᴍᴇ? ɪᴛ’ꜱ ᴇᴀꜱʏ, ꜰɪɴᴅ ᴍᴇ ʙᴇʟᴏᴡ
// //            -->
// // @DianneR.Mullins --> '"Youre dad grips my hair while i give brain💝💘🙏💸"\n -Not me 💀💀'
// // @KaterinaLoveMaker --> 'Clix or me ?!! vote For Me ✨ 🖤!!!🧡!!!😘!!!🫶🏻' <-- ! spam
// // botted likes 
// // @Владислава Лидия Марина <--russain names?
// // @TaylorReed-j7u --> "Can’t get over how genuine you are, this is the kind of content that sticks."
// // @AngelinaBarbara-e7d --> I adore how she simply gets up and exits the water without incident as soon as she receives the life ring 😂.
// // @MinhNgogo-e7f --> what even is this channel and why am i hooked 🧡💖
// // @Phanphuongomuhqhq --> just here like 🍒🧡
// // @ÝTrươngng-w7z --> Thank you so much for your colorful and creative videos. Your videos are a real work of art.💡‍♀️🐡
// // @NgọcCaoao --> Keep on creating great content. Your videos are always neat and informative.😹🥩🥥
// // @AmandaLewis-x3t --> I needed this kind of truth today, thank you.
// // @HannahClark-s7d --> You shine without even trying — that’s rare.
// // @VoVanTuTu --> this is youtube at its finest 😻👅
// // @HaYenNhihi --> % confused, % impressed 🔥😛
// // @BiancaTudore --> Clients are able to write.  You elevated Benjamin to customer even though he was a Case employee. <-- stealing some on else's comment
// // @AmberPhillips-k4b --> Your chill presence is a reminder that realness still exists.
// // @JosephineBrooks-n2z --> Can’t get over how genuine you are, this is the type of content that matters.
// // @AuroraSavannahLucy --> i woke up today feeling sad about a recent break up with my ex of 2 years... your videos have been an emotional crutch to me since I'm a very emotionally dependent person and have a hard time realizing what I am feeling. Your reflections during these videos ressonate a shit ton with me, so thank you, Ken. You are an amazing person 😓😓😔😔
// // @HarperWilson-o9k--> Every second of this felt raw, no filters needed.

// // Reused pfps: structure =
// // <div id='author-thumbnail'>
// //  <button id = 'author-thumbnail-button'>
//         //<yt-img-shadow>
//             //<img height ='40' width ='40' src={reused}>
