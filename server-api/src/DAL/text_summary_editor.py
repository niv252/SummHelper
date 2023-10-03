from utils.settings import SETTINGS
import logging
import json

def save_summary(doc_text, summary_text, highlight_spans, summary_id, is_good, unnecessary_information_in_summary, missing_spans_in_text):
    summary = {
        "doc_text": doc_text,
        "summary_text": summary_text,
        "highlight_spans": highlight_spans,
        "summary_id": summary_id,
        "is_good": is_good

    }
    if(unnecessary_information_in_summary != None):
        summary["unnecessary_information_in_summary"] = unnecessary_information_in_summary
    if(missing_spans_in_text != None):
        summary["missing_spans_in_text"] = missing_spans_in_text
    logging.debug("Summary id: %s. Saving summary to DB: %s" % (summary_id, str(summary)))
    # currently using file record instead of saving to a db
    with open(SETTINGS.file_path, "a", encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=4)
        f.write(',\n')