import json
from utils.preprocessor import Preprocessor
from DAL.text_summary_editor import save_summary
from utils.initial_highlights import get_saliency_sentence_scores
from utils.settings import SETTINGS
from utils.parser import parseAlignmentSentence
import logging
from functools import lru_cache
import spacy
from utils.only_lemma_matching_alignment import add_lemma_str_matching_spans 
import time
import os

SPACY_NLP_MODEL = 'en_core_web_sm'

@lru_cache
def get_nlp():
    return spacy.load(SPACY_NLP_MODEL)

preprocessor = Preprocessor(
    "",
    SETTINGS.nlp_special_cases,
    should_add_highlights=True,
    only_sents_with_highlights=False,
)

saved_model_path = "src/models/Flan-T5_large-distilled-Quark/ckp_5500"
max_source_length = 1400
max_target_length = 512
num_beams = 2
no_repeat_ngram_size = 3
length_penalty = 2.0
top_p = 0.9
do_sample=False

# prefixes
best_cat_tkn = "_TREE_TOKEN_00000" # best category token
instructions = 'Instruction: In this task, you are presented with a passage, where some parts are "highlighted" (namely, there are <extra_id_1> and <extra_id_2> tokens before and after each such span). Your job is to generate a summary that covers all and only the "highlighted" spans.'
passage_prefix = "Passage:"

total_time = 30
interval = 0.1
num_iterations = int(total_time/interval)

def summarize_text(doc_text, highlight_spans, summary_id):
    json_to_write = {
        "doc_text": doc_text,
        "highlight_spans": highlight_spans
    }
    json_object = json.dumps(json_to_write, indent=4)
    file_name = "../files/"+str(summary_id)+".json"
    with open(file_name, 'w+') as outfile:
        outfile.write(json_object)
    result_file_name = '../files/'+str(summary_id)+"_result.json"
    logging.info("file path %s." % result_file_name)
    for i in range(num_iterations):
        os.listdir('../files')
        if os.path.exists(result_file_name):
            logging.info("exists %s." % result_file_name)
            with open(result_file_name, 'r') as file:
                json_content = json.load(file)
            os.remove(file_name)
            os.remove(result_file_name)
            logging.info("removed %s" % result_file_name)
            return [json_content["result"], json_content["indexes"], json_content["alignments"]]
        time.sleep(interval)
    return "error"


def save_summary_controller(doc_text, summary_text, highlight_spans, summary_id, is_good, unnecessary_information_in_summary, missing_spans_in_text):
    save_summary(doc_text, summary_text, highlight_spans, summary_id, is_good, unnecessary_information_in_summary, missing_spans_in_text)
    logging.info("Summary id: %s. summary saved to DB" % summary_id)
    return

def initial_highlight(doc):  
    return get_saliency_sentence_scores(doc)

def alignment(orig_doc, highlight_span, summary):
    nlp = get_nlp()
    prep_input = preprocessor.preprocess_input(orig_doc, highlight_span).strip()

    sentences = [i for i in nlp(summary).sents]
    input_texts = []
    for summary_sentence in sentences:
        input_texts.append(str(summary_sentence))
    results = add_lemma_str_matching_spans(input_texts, str(prep_input), nlp)

    indexes = []
    for sent in sentences:
        x = [sent.start_char, sent.end_char-1]
        indexes.append(x)

    finalResult = []
    for result in results:
        finalResult.append(parseAlignmentSentence(result))
    return [finalResult, indexes]