from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
import pandas as pd
import joblib

# data = { 
#     hasCyrillicUsername,
#     usernameEntropy,
#     hasFemaleNameInUsername,
#     hasEmojis,
#     endsWithEmojis,
#     wordCount, 
#     isShortComment, 
#     hasFlaggedEmoji, 
#     flaggedEmojiCount, 
#     isDuplicateComment, 
#     hasCommonBotPhrases, 
#     commonBotPhrasesCount, 
#     hasTimeStamp, 
#     exclamationCount, 
#     punctuationClusters
# }

df = pd.read_csv("YoutubeBotDetector/MLmodel/downloaded-bot-data-final.csv")

X = df.drop(columns=["Bot", "Username", "Text"])
#X = df.drop(columns=["Bot"])
y = df["Bot"]

# print(X.shape)
# print(y.shape)

# print(X.dtypes)
# print(y.dtype)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

kn = KNeighborsClassifier()
kn.fit(X_train_scaled, y_train)

print(f"KNeighbors: {kn.score(X_test_scaled, y_test)}")

pass