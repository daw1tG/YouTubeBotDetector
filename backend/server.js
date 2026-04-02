import express from "express"
import Database from "better-sqlite3"
import cors from "cors"
import fs from "fs"

import path from "path";
import { fileURLToPath } from "url";

import crypto from "crypto"
import { parse } from "csv-parse/sync"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express()
const PORT = process.env.PORT || 3000
const mlServer = "http://localhost:8000/"
  

app.use(express.json())
app.use(cors({ origin: "*", methods: ["GET", "POST"] }))

app.get('/', (req, res)=>{
    res.sendStatus(200).json({ status: "running" })
})

// write training data
app.post("/api/collect", async (req, res) =>{
    // const { data, list } = req.body
    // // console.log(data)

    // if (list){
    //     console.log("writing stored comments")
    //     let resultArray = []
    //     for (let comment of data){
    //         resultArray.push(await writeDataToCSV(comment))
    //     }
    //     console.log("writing complete")
    //     // return res.json(resultArray)
    // }
    // else {
    //     const { status, message } = await writeDataToCSV(data)
    //     //return res.status(status).json(message)
    // }

    const comments = req.body.data
    // console.log(comments).slice(0,5)
    if (!comments) return;
    try {
        const unadded = pushToDB(comments)
        console.log(`Successfully stored ${comments.length - unadded.length} comments, failed to add ${unadded.length} comments`)
        res.status(200).json({ message: "Success", inserted: comments.length - unadded.length, unadded: unadded })
    } catch (err) {
        console.log("Failed to store data")
        res.status(500).json({ message: "Failure", error: err })
    }
})

// get prediction
app.post("/api/predict", async (req, res) => {
    try {
        const { Username, Text, Pfp } = req.body

        if (!Text || !Username){ // pfp not vital
            return res.status(400).json({ error: "Missing Data" })
        }

        let botProbability = await mlModel(req.body) // placeholder

        res.json({
            probabilityScore: botProbability,
            bot: botProbability > 0.8
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Server error" })
    }
})

function writeDataToCSV({ Username, Text, Pfp, Bot, data: {hasCyrillicUsername, 
          usernameEntropy,
          hasFemaleNameInUsername,
          hasEmojis,
          endsWithEmojis,
          wordCount, 
          isShortComment, 
          hasFlaggedEmoji, 
          flaggedEmojiCount, 
          isDuplicateComment, 
          hasCommonBotPhrases, 
          commonBotPhrasesCount, 
          hasTimeStamp, 
          exclamationCount, 
          punctuationClusters}}){
    return new Promise((resolve, reject)=> {
        if (!Text || !Username){
            return resolve({ status:400, message:{ error: "Missing Data" }})
        }

        const safe = val => `"${String(val).replace(/"/g, '""')}"`

        const data = [
            safe(Username),
            safe(Text),
            safe(Pfp),
            safe(Bot),
            hasCyrillicUsername,
            usernameEntropy,
          hasFemaleNameInUsername,
          hasEmojis,
          endsWithEmojis,
          wordCount, 
          isShortComment, 
          hasFlaggedEmoji, 
          flaggedEmojiCount, 
          isDuplicateComment, 
          hasCommonBotPhrases, 
          commonBotPhrasesCount, 
          hasTimeStamp, 
          exclamationCount, 
          punctuationClusters
        ].join(",") + "\n"
        //console.log(hasCyrillicUsername)

        fs.appendFile(
            "bot-data.csv",
            data,
            err =>{
                if (err) {
                    console.error('Error writing file:', err);
                    return resolve({ status:500, message:{ error: "Server error" }})
                } else {
                    console.log('File has been written successfully.');
                    return resolve({ status:200, message:{ comment: Username }})
                }
            }
        )
    })
}


function pushToDB(comments){
    const dbPath = path.join(__dirname, "../Mlmodel/training-data.db")
    console.log(dbPath)
    const db = new Database(dbPath)

    const unadded = []

    const insert = db.prepare(`INSERT INTO comments (
        Username,
        Text,
        Pfp,
        Bot,
        hasCyrillicUsername,
        usernameEntropy,
        hasFemaleNameInUsername,
        hasEmojis,
        endsWithEmojis,
        wordCount,
        isShortComment,
        hasFlaggedEmoji,
        flaggedEmojiCount,
        isDuplicateComment,
        hasCommonBotPhrases,
        commonBotPhrasesCount,
        hasTimeStamp,
        exclamationCount,
        punctuationClusters,
        hash) VALUES (
        @Username,
        @Text,
        @Pfp,
        @Bot,
        @hasCyrillicUsername,
        @usernameEntropy,
        @hasFemaleNameInUsername,
        @hasEmojis,
        @endsWithEmojis,
        @wordCount,
        @isShortComment,
        @hasFlaggedEmoji,
        @flaggedEmojiCount,
        @isDuplicateComment,
        @hasCommonBotPhrases,
        @commonBotPhrasesCount,
        @hasTimeStamp,
        @exclamationCount,
        @punctuationClusters,
        @hash)`)

    for (let entry of comments){
        const { data, ...rest } = entry;
        const flatComment = { ...rest, ...data };
        flatComment.hash = hash(flatComment)
        try {
            insert.run(flatComment)
        } catch (err) {
            if (err && err.code != "SQLITE_CONSTRAINT_UNIQUE") {
                console.log(err)
                unadded.push({ data: entry, reason: err})
            }
        }
    }

    db.close()

    return unadded
}

function hash(comment){
    const commentString = JSON.stringify(comment, Object.keys(comment).sort())
    return crypto.createHash("md5").update(commentString).digest("hex")
}

async function mlModel(data){
    return await fetch(mlServer+"predict", {
        method:"POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(data)
    })
}

app.post("/test", (req, res) => {
    res.status(200).json({message: "Success", rows:getCommentDataFromCSV(__dirname + "/bot-data.csv")})
})

const FIELDS = [
    "Username",
    "Text",
    "Bot",
    "hasCyrillicUsername",
    "usernameEntropy",
    "hasFemaleNameInUsername",
    "hasEmojis",
    "endsWithEmojis",
    "wordCount",
    "isShortComment",
    "hasFlaggedEmoji",
    "flaggedEmojiCount",
    "isDuplicateComment",
    "hasCommonBotPhrases",
    "commonBotPhrasesCount",
    "hasTimeStamp",
    "exclamationCount",
    "punctuationClusters"
]
function getCommentDataFromCSV(path){
    const file = fs.readFileSync(path)
    const rows = parse(file, { columns: true, skip_empty_lines: true })
    rows.forEach(row => row.Pfp = "")
    const unadded = pushToDB(rows)
    return { added:rows.length - unadded.length, unadded: unadded }
}

app.listen(PORT, () => {
    console.log(`API running on ${PORT}`)
})