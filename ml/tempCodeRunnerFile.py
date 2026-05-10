from __future__ import annotations

import json
import pathlib

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, roc_curve, auc,
                             precision_score, recall_score, f1_score)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, label_binarize

ROOT = pathlib.Path(__file__).resolve().parent
MODEL_PATH = ROOT / "model.pkl"
FEATURES_JSON_PATH = ROOT / "features.json"
METRICS_JSON_PATH = ROOT / "metrics.json"
CONFUSION_MATRIX_PATH = ROOT / "confusion_matrix.png"
ROC_CURVE_PATH = ROOT / "roc_curve.png"

DATA_CANDIDATES = [
    ROOT / "student_burnout_dataset_5000.csv",
    ROOT.parent / "student_burnout_dataset_5000.csv",
]
DATA_PATH = next((p for p in DATA_CANDIDATES if p.is_file()), None)
if DATA_PATH is None:
    raise FileNotFoundError(
        "student_burnout_dataset_5000.csv not found. Place it in ml/ or project root."
    )

ID_COL = "student_id"
TARGET_COL = "burnout_level"

df = pd.read_csv(DATA_PATH)
print("Columns:", list(df.columns))

if ID_COL not in df.columns or TARGET_COL not in df.columns:
    raise ValueError(f"Expected columns {ID_COL} and {TARGET_COL}")

X = df.drop(columns=[ID_COL, TARGET_COL]).copy()


y_raw = df[TARGET_COL].astype(float)
q1, q2 = y_raw.quantile([1 / 3, 2 / 3]).values
y = pd.cut(
    y_raw,
    bins=[-np.inf, q1, q2, np.inf],
    labels=["Low", "Medium", "High"],
    include_lowest=True,
).astype(str)

cat_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
num_cols = [c for c in X.columns if c not in cat_cols]

ohe_kwargs = {"handle_unknown": "ignore"}
try:
    ohe = OneHotEncoder(**ohe_kwargs, sparse_output=False)
except TypeError:
    ohe = OneHotEncoder(**ohe_kwargs, sparse=False)

if cat_cols:
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", num_cols),
            ("cat", ohe, cat_cols),
        ],
        remainder="drop",
    )
else:
    preprocessor = ColumnTransformer(
        transformers=[("num", "passthrough", num_cols)],
        remainder="drop",
    )

pipe = Pipeline(
    steps=[
        ("prep", preprocessor),
        (
            "clf",
            RandomForestClassifier(
                n_estimators=200,
                max_depth=16,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ]
)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
pipe.fit(X_train, y_train)
y_pred = pipe.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print("Holdout accuracy:", round(accuracy, 4))
print(classification_report(y_test, y_pred))


cm = confusion_matrix(y_test, y_pred, labels=["Low", "Medium", "High"])
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=["Low", "Medium", "High"],
            yticklabels=["Low", "Medium", "High"])
plt.title('Confusion Matrix')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.tight_layout()
plt.savefig(CONFUSION_MATRIX_PATH, dpi=300, bbox_inches='tight')
plt.close()
print("Saved confusion matrix to", CONFUSION_MATRIX_PATH)


y_test_binarized = label_binarize(y_test, classes=["Low", "Medium", "High"])
y_pred_proba = pipe.predict_proba(X_test)

plt.figure(figsize=(8, 6))
colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
for i, (class_name, color) in enumerate(zip(["Low", "Medium", "High"], colors)):
    fpr, tpr, _ = roc_curve(y_test_binarized[:, i], y_pred_proba[:, i])
    roc_auc = auc(fpr, tpr)
    plt.plot(fpr, tpr, color=color, lw=2,
             label=f'{class_name} (AUC = {roc_auc:.2f})')

plt.plot([0, 1], [0, 1], 'k--', lw=2)
plt.xlim([0.0, 1.0])
plt.ylim([0.0, 1.05])
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('Multi-class ROC Curve')
plt.legend(loc="lower right")
plt.tight_layout()
plt.savefig(ROC_CURVE_PATH, dpi=300, bbox_inches='tight')
plt.close()
print("Saved ROC curve to", ROC_CURVE_PATH)


precision = precision_score(y_test, y_pred, average='weighted', labels=["Low", "Medium", "High"])
recall = recall_score(y_test, y_pred, average='weighted', labels=["Low", "Medium", "High"])
f1 = f1_score(y_test, y_pred, average='weighted', labels=["Low", "Medium", "High"])


metrics = {
    "accuracy": round(accuracy, 3),
    "precision": round(precision, 3),
    "recall": round(recall, 3),
    "f1_score": round(f1, 3)
}
with open(METRICS_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2)
print("Saved metrics to", METRICS_JSON_PATH)

joblib.dump({"pipeline": pipe, "feature_names": list(X.columns)}, MODEL_PATH)
print("Saved", MODEL_PATH)


fields = []
defaults_row = X.iloc[0].to_dict()
for col in X.columns:
    if col in cat_cols:
        opts = sorted(X[col].astype(str).unique().tolist())
        fields.append(
            {
                "name": col,
                "kind": "categorical",
                "options": opts,
                "default": str(defaults_row[col]),
            }
        )
    else:
        ser = X[col]
        step = 0.01 if pd.api.types.is_float_dtype(ser) else 1
        fields.append(
            {
                "name": col,
                "kind": "numeric",
                "min": float(ser.min()),
                "max": float(ser.max()),
                "step": float(step),
                "default": float(ser.iloc[0]) if pd.api.types.is_float_dtype(ser) else int(ser.iloc[0]),
            }
        )

meta = {
    "source_csv": str(DATA_PATH.resolve()),
    "target_column": TARGET_COL,
    "target_note": "Original numeric burnout_level binned into Low/Medium/High for classification",
    "feature_names": list(X.columns),
    "fields": fields,
}

with open(FEATURES_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)
print("Saved", FEATURES_JSON_PATH)
