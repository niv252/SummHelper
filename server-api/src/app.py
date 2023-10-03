from flask import Flask, request
from flask_cors import CORS, cross_origin
import json
from controllers.text_summary_controller import summarize_text, save_summary_controller, initial_highlight, alignment
from utils.settings import SETTINGS
import logging
import uuid

logging.basicConfig(level=SETTINGS.logging_level, filename="logging.txt", filemode="w", format="Date-Time : %(asctime)s : Line No. : %(lineno)d - %(message)s")
logging.getLogger().addHandler(logging.StreamHandler())

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"


@app.route("/summarizeText", methods=["POST"])
@cross_origin()
def summarize_text_api():
    summary_id = uuid.uuid4()
    json_data = json.loads(str(request.data, encoding="utf-8"))
    doc_text = json_data["doc_text"]
    highlight_spans = json_data["highlight_spans"]
    highlight_spans = json.loads(highlight_spans)
    logging.info("Summary id: %s. Got a request to summarize text" % summary_id)
    logging.debug(
        "Summary id: %s. Doc to summarize: %s. Highlight spans: %s"
        % (summary_id, doc_text, highlight_spans)
    )

    temp = summarize_text(doc_text, highlight_spans, summary_id)
    result = {"summaryText": temp[0], "alignment": {"sentencesIndexes": temp[1], "sentencesOriginIndexes": temp[2]}, "summaryId": summary_id}

    logging.info("Summary id: %s. Finished handling request" % summary_id)
    logging.debug(
        "Summary id: %s. Finished handling request with the result: %s"
        % (summary_id, result["summaryText"])
    )
    return result

@app.route("/alignment", methods=["POST"])
@cross_origin()
def alignment_api():
    json_data = json.loads(str(request.data, encoding="utf-8"))
    doc_text = json_data["doc_text"]
    summary_text = json_data["summary_text"]

    highlight_spans = json_data["highlight_spans"]
    highlight_spans = json.loads(highlight_spans)

    temp = alignment(doc_text, highlight_spans, summary_text)
    result = { "alignment": {"sentencesIndexes": temp[1], "sentencesOriginIndexes": temp[0]}}
    return result

@app.route("/saveToDB", methods=["POST"])
@cross_origin()
def save_to_db_api():
    missing_spans_in_text = None
    unnecessary_information_in_summary = None
    json_data = json.loads(str(request.data, encoding="utf-8"))
    doc_text = json_data["doc_text"]
    highlight_spans = json_data["highlight_spans"]
    highlight_spans = json.loads(highlight_spans)
    summary_text = json_data["summary_text"]
    is_good = json_data["is_good"]
    summary_id = json_data["summary_id"]
    if not is_good:
        unnecessary_information_in_summary = json_data["unnecessary_information_in_summary"]
        missing_spans_in_text = json_data["missing_spans_in_text"]
    save_summary_controller(doc_text, summary_text, highlight_spans, summary_id, is_good, unnecessary_information_in_summary, missing_spans_in_text)
    return {}

@app.route("/initialHighlight", methods=["POST"])
@cross_origin()
def initial_highlight_api():
    json_data = json.loads(str(request.data, encoding="utf-8"))
    doc_text = json_data["doc_text"]

    result = {"indexes": initial_highlight(doc_text)}

    return result

@app.route("/health", methods=["GET"])
@cross_origin()
def health_api():
    return "OK"

logging.info("Server Started at %s:%s" % (SETTINGS.host, SETTINGS.port))
if __name__ == "__main__":
    app.run(host=SETTINGS.host, port=SETTINGS.port)