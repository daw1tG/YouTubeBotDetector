import express from "express"
import cors from "cors"
import fs from "fs"

const app = express()
const PORT = process.env.PORT || 3000
  

app.use(express.json())
app.use(cors({ origin: "*", methods: ["GET", "POST"] }))

app.get('/', (req, res)=>{
    res.sendStatus(200).json({ status: "running" })
})

// write training data
app.post("/api/collect", async (req, res) =>{
    const { data, list } = req.body

    if (list){
        console.log("writing stored comments")
        let resultArray = []
        for (let comment of data){
            resultArray.push(await writeDataToCSV(comment))
        }
        console.log("writing complete")
        return res.json(resultArray)
    }
    else {
        const { status, message } = await writeDataToCSV(data)
        return res.status(status).json(message)
    }
})

// get prediction
app.post("/api/predict", (req, res) => {
    try {
        const { username, text, pfp } = req.body

        if (!text || !username){ // pfp not vital
            return res.status(400).json({ error: "Missing Data" })
        }

        let botProbability = mlModel(req.body) // placeholder

        res.json({
            probabilityScore: botProbability,
            bot: botProbability > 0.8
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Server error" })
    }
})

function writeDataToCSV({ username, text, pfp, bot, data: hasCyrillicUsername,
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
          punctuationClusters}){
    return new Promise((resolve, reject)=> {
        if (!text || !username){
            return resolve({ status:400, message:{ error: "Missing Data" }})
        }

        const safe = val => `"${String(val).replace(/"/g, '""')}"`

        const data = [
            safe(username),
            safe(text),
            safe(pfp),
            safe(bot),
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

        fs.appendFile(
            "bot-data.csv",
            data,
            err =>{
                if (err) {
                    console.error('Error writing file:', err);
                    return resolve({ status:500, message:{ error: "Server error" }})
                } else {
                    console.log('File has been written successfully.');
                    return resolve({ status:200, message:{ comment: username }})
                }
            }
        )
    })
}

function mlModel(data){
    return Math.random()
}

app.listen(PORT, () => {
    console.log(`API running on ${PORT}`)
})