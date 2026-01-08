import express from "express"
import cors from "cors"
import fs from "fs"

const app = express()
const PORT = 3000

app.use(express.json())
app.use(cors({ origin: "*", methods: ["GET", "POST"] }))

app.get("/", (req, res) => {
    res.json({status: "running" })
})

// write training data
app.post("/api/collect", (req, res) =>{
    try {
        const { username, text, pfp, bot} = req.body

        if (!text || !username){
            return res.status(400).json({ error: "Missing Data" })
        }

        const safe = val => `"${String(val).replace(/"/g, '""')}"`

        const data = [
            safe(username),
            safe(text),
            safe(pfp),
            safe(bot)
        ].join(",") + "\n"

        fs.appendFile(
            "bot-data.csv",
            data,
            err =>{
                if (err) {
                    console.error('Error writing file:', err);
                    res.status(500).json({ error: "Server error" })
                } else {
                    console.log('File has been written successfully.');
                    res.json({ status: "success" })
                }
            }
        )

        // const bot 
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "Server error" })
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

function mlModel(data){
    return Math.random()
}

app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`)
})