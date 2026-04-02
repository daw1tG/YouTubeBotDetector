import regex as re
from arrays import femaleNames, flagged_emojis
import csv
import pandas as pd
import sqlite3
import os

CSV_HEADER = "Username,Text,PFP,Bot,hasCyrillicUsername,usernameEntropy,hasFemaleNameInUsername,hasEmojis,endsWithEmojis,wordCount,isShortComment,hasFlaggedEmoji,flaggedEmojiCount,isDuplicateComment,hasCommonBotPhrases,commonBotPhrasesCount,hasTimeStamp,exclamationCount,punctuationClusters\n"
ORDER = [
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
    "punctuationClusters",
]


flagged_emojis_set = set(flagged_emojis)
def build_female_names_regex():
    escaped_names = [re.escape(name) for name in femaleNames]
    pattern = "|".join(escaped_names)
    return re.compile(pattern, re.IGNORECASE)

def is_bot_username(username, message_data):

    CYRILLIC_REGEX = re.compile(r"\p{Script=Cyrillic}+", re.UNICODE)
    message_data["hasCyrillicUsername"] = 1 if bool(CYRILLIC_REGEX.search(username)) else 0

    if username:
        unique_chars = len(set(username))
        message_data["usernameEntropy"] = unique_chars / len(username)
    else:
        message_data["usernameEntropy"] = 0.0

    cleaned_username = username.strip()

    femaleNamesRegex = build_female_names_regex()
    message_data["hasFemaleNameInUsername"] = 1 if bool(
        femaleNamesRegex.search(cleaned_username)
    )else 0

def reformat_data(username, text, is_bot, **extra):
    message_data = {}

    # Emoji checks
    emoji_regex = re.compile(
        r"\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*",
        re.UNICODE
    )

    emojis = emoji_regex.findall(text)

    message_data["hasEmojis"] = 1 if len(emojis) > 0 else 0
    message_data["emojiCount"] = len(emojis)

    emoji_end_regex = re.compile(
        r"\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*$",
        re.UNICODE
    )
    message_data["endsWithEmojis"] = 1 if bool(emoji_end_regex.search(text)) else 0

    message_data["flaggedEmojiCount"] = 0
    message_data["hasFlaggedEmoji"] = 0

    for emoji in emojis:
        if emoji in flagged_emojis_set:
            message_data["flaggedEmojiCount"] += 1
            message_data["hasFlaggedEmoji"] = 1

    is_bot_username(username, message_data)

    # Word
    words = re.split(r"\s+", text.strip())
    message_data["wordCount"] = len(words)
    message_data["isShortComment"] = 1 if len(words) <= 4 else 0

    # Duplicate comments
    message_data["isDuplicateComment"] = 1 if extra.get("duplicate") == True else 0


    # Common bot phrases
    common_bot_phrases = re.compile(
        r"(genuine|i needed th(is|at)|ress?onate|emotionally|that'?s rare|"
        r"colorful|adore|just being(?: so)? real|confident|hits?( me)? deep)",
        re.IGNORECASE
    )

    phrase_matches = common_bot_phrases.findall(text)

    message_data["hasCommonBotPhrases"] = 1 if len(phrase_matches) > 0 else 0
    message_data["commonBotPhrasesCount"] = len(phrase_matches)

    # Timestamp
    message_data["hasTimeStamp"] = 1 if bool(
        re.search(r"\b\d?\d:\d\d\b", text)
    ) else 0

    # Punctuation spam
    message_data["exclamationCount"] = len(re.findall(r"!", text))
    message_data["punctuationClusters"] = len(
        re.findall(r"[!?]{2,}", text)
    )

    message_data["Username"], message_data["Text"] = username, text
    try:
        message_data['Bot'] = int(is_bot)
    except Exception:
        is_bot = 1 if (is_bot == "true" or is_bot == "1") else 0
        message_data['Bot'] = is_bot

    return message_data


#kaggle dataset
def import_kaggle_dataset():
    with open('YouTubeBotDetector/MLmodel/Youtube-Spam-Dataset.csv', newline='') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=',')
        new_lines =[]
        for row in reader:
            user, text, is_bot = row["AUTHOR"], row["CONTENT"], row["CLASS"]
            if not user:
                continue
            data = reformat_data(user, text, is_bot)
            data["Username"], data["Text"],data["Bot"] = user, text, is_bot
            new_lines.append(data)

        df = pd.DataFrame(new_lines)[ORDER]
        df.to_csv("YoutubeBotDetector/MLmodel/downloaded-bot-data-final.csv", index=False, mode="a")
        pass


def update_final_data():
    new_lines = []
    with open("YoutubeBotDetector/backend/bot-data.csv", "r") as csvfile:
        reader = csv.DictReader(csvfile, delimiter=',')
        for row in reader:
            user, text, is_bot = row["Username"], row["Text"], 1 if row["Bot"] == "true" else 0
            row["Bot"] = is_bot
            if not user:
                continue
            data = reformat_data(user, text, is_bot) if len(list(row.keys())) < 5 else row
            
            new_lines.append(data)


    df = pd.DataFrame(new_lines)[ORDER]
    df.to_csv("YoutubeBotDetector/MLmodel/downloaded-bot-data-final.csv", index=False, mode="a")

    with open("YoutubeBotDetector/backend/bot-data.csv", "w") as f:
        f.write(CSV_HEADER)
    return

# import_kaggle_dataset()
#update_final_data()

def get_data():
    db_path = os.path.join(os.path.dirname(__file__), "training-data.db")
    with sqlite3.connect(db_path) as database:
        database.row_factory = sqlite3.Row
        db = database.cursor()
        db.execute("SELECT * FROM comments")
        rows = db.fetchall()

        return pd.DataFrame([dict(row) for row in rows])[ORDER]
# get_data()
pass