from __future__ import annotations

import json
import pathlib

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

ROOT = pathlib.Path(__file__).resolve().parent
MODEL_PATH = ROOT / "model.pkl"
FEATURES_PATH = ROOT / "features.json"
METRICS_PATH = ROOT / "metrics.json"
CONFUSION_MATRIX_PATH = ROOT / "confusion_matrix.png"
ROC_CURVE_PATH = ROOT / "roc_curve.png"

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

_bundle = None
_meta = None


def load_artifacts():
    global _bundle, _meta
    if _bundle is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(f"Missing {MODEL_PATH}. Run: python train.py")
        _bundle = joblib.load(MODEL_PATH)
    if _meta is None:
        if not FEATURES_PATH.is_file():
            raise FileNotFoundError(f"Missing {FEATURES_PATH}. Run: python train.py")
        with open(FEATURES_PATH, encoding="utf-8") as f:
            _meta = json.load(f)
    return _bundle, _meta


def row_from_json(data: dict, feature_names: list[str]) -> pd.DataFrame:
    missing = [k for k in feature_names if k not in data]
    if missing:
        raise ValueError(f"Missing fields: {missing}")
    row = {k: data[k] for k in feature_names}
    return pd.DataFrame([row])


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


@app.route("/metrics.json", methods=["GET"])
def serve_metrics():
    try:
        if METRICS_PATH.exists():
            return send_from_directory(ROOT, "metrics.json")
        else:
            return jsonify({"error": "Metrics not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/confusion_matrix.png", methods=["GET"])
def serve_confusion_matrix():
    try:
        if CONFUSION_MATRIX_PATH.exists():
            return send_from_directory(ROOT, "confusion_matrix.png")
        else:
            return jsonify({"error": "Confusion matrix not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/roc_curve.png", methods=["GET"])
def serve_roc_curve():
    try:
        if ROC_CURVE_PATH.exists():
            return send_from_directory(ROOT, "roc_curve.png")
        else:
            return jsonify({"error": "ROC curve not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/predict", methods=["POST"])
def predict():
    try:
        bundle, meta = load_artifacts()
        pipe = bundle["pipeline"]
        feature_names = meta["feature_names"]

        data = request.get_json(silent=True) or {}
        print("[ml] /predict request received. Body keys:", list(data.keys()) if isinstance(data, dict) else type(data))
        if not isinstance(data, dict):
            return jsonify({"error": "JSON object required"}), 400

        X = row_from_json(data, feature_names)
        print("[ml] /predict payload validated. feature_names:", feature_names)

        pred = pipe.predict(X)[0]
        proba = pipe.predict_proba(X)[0]
        conf = float(np.max(proba))
        level = str(pred)

        label_map = {
            "Low": "Low Burnout",
            "Medium": "Medium Burnout",
            "High": "High Burnout",
        }
        burnout_label = label_map.get(level, f"{level} Burnout")
        severity = {"Low": 3, "Medium": 6, "High": 9}.get(level, 6)
        burnout_score = int(np.clip(round(severity * 0.55 + conf * 4.5), 1, 10))

        response = {
            "burnout_level": level,
            "burnout_label": burnout_label,
            "burnout_score": burnout_score,
            "confidence": round(conf, 4),
        }
        print("[ml] /predict response:", response)
        return jsonify(response)
    except ValueError as e:
        print("[ml] /predict validation error:", str(e))
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print("[ml] /predict error:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    load_artifacts()
    print("[ml] Loaded", MODEL_PATH, "and", FEATURES_PATH)
    print("[ml] http://127.0.0.1:5001  POST /predict")
    app.run(host="127.0.0.1", port=5001, debug=False)
