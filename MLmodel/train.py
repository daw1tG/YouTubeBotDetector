from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import pandas as pd
import joblib
import helpers
import os


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
def trainModel():
    df = helpers.get_data()

    X = df.drop(columns=["Bot", "Username", "Text"])
    #X = df.drop(columns=["Bot"])
    y = df["Bot"]

    # vectorizer = TfidfVectorizer()
    # comments = df["Text"]
    # usernames = df["Username"]

    #vectorizer

    # print(X.shape)
    # print(y.shape)

    # print(X.dtypes)
    # print(y.dtype)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print(X_train.copy().var())

    model_path = os.path.join(os.path.dirname(__file__), "kn-model.joblib")

    model = joblib.load(model_path)

    current_score = model.score(X_test_scaled, y_test)
    model.fit(X_train_scaled, y_train)

    new_score = model.score(X_test_scaled, y_test)

    if new_score > current_score:
        joblib.dump(model, model_path)

    score = max(new_score, current_score)

    print(f"KNeighbors model score: { score }")

     

    return score
# trainModel()


