from fastapi import FastAPI
from train import trainModel
import pandas as pd
import numpy as np
import joblib

#uvicorn model:app --reload

app = FastAPI()

model = joblib.load("kn-model.joblib") # YoutubeBotDetector/MLmodel/

ORDER = [
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
    "punctuationClusters",
]

@app.get("/")
async def root():
    return { "server": "running" }

@app.get("/train")
def train():
    return { "score": trainModel() }

def single_instance(data):
    return np.array([data[field] for field in ORDER]).reshape(1, -1)

@app.post("/predict")
def root(data: dict):
    features = data["data"]
    
    instance_array = single_instance(features)
    proba = model.predict_proba(instance_array)[0]
    return { "probability": proba.tolist() }

@app.post("/test")
def test(data: dict):
    # Extract the data object
    features = data.get("data", data)
    
    # Convert to proper format
    instance = single_instance(features)
    instance_array = np.array(instance).reshape(1, -1)
    
    # Get prediction
    proba = model.predict_proba(instance_array)[0]
    prediction = model.predict(instance_array)[0]
    
    return {
        "prediction": int(prediction),  # 0 or 1
        "probability_bot": float(proba[1]),  # probability it's a bot
        "probability_real": float(proba[0])  # probability it's real
    }
