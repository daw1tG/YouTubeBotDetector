CREATE TABLE comments (
    id INTEGER PRIMARY KEY,
    Username TEXT,
    "Text" TEXT,
    Pfp TEXT,
    "Bot" INTEGER,
    "hasCyrillicUsername" INTEGER,
    "usernameEntropy" INTEGER,
    "hasFemaleNameInUsername" INTEGER,
    "hasEmojis" INTEGER,
    "endsWithEmojis" INTEGER,
    "wordCount" INTEGER,
    "isShortComment" INTEGER,
    "hasFlaggedEmoji" INTEGER,
    "flaggedEmojiCount" INTEGER,
    "isDuplicateComment" INTEGER,
    "hasCommonBotPhrases" INTEGER,
    "commonBotPhrasesCount" INTEGER,
    "hasTimeStamp" INTEGER,
    "exclamationCount" INTEGER,
    "punctuationClusters" INTEGER,
    hash TEXT UNIQUE
);

SELECT COUNT(*) FROM comments WHERE Bot = 1;