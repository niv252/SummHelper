import torch
from utils.preprocessor import Preprocessor
from transformers import (
    AutoConfig,
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
)
from utils.settings import SETTINGS
from utils.parser import parseAlignmentSentence
from functools import lru_cache
import spacy
from utils.only_lemma_matching_alignment import add_lemma_str_matching_spans 

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
config = AutoConfig.from_pretrained(saved_model_path)

tokenizer = AutoTokenizer.from_pretrained(saved_model_path,use_fast=True)

model = AutoModelForSeq2SeqLM.from_pretrained(
                saved_model_path,
                from_tf=bool(".ckpt" in saved_model_path),
                config=config
            ).to("cuda:0")

# prefixes
best_cat_tkn = "_TREE_TOKEN_00000" # best category token
instructions = 'Instruction: In this task, you are presented with a passage, where some parts are "highlighted" (namely, there are <extra_id_1> and <extra_id_2> tokens before and after each such span). Your job is to generate a summary that covers all and only the "highlighted" spans.'
passage_prefix = "Passage:"


def summarize_text(doc_text, highlight_spans):
    prep_input = preprocessor.preprocess_input(doc_text, highlight_spans).strip()
    input_text = f"{best_cat_tkn} {instructions} {passage_prefix} {prep_input}"

    encodings_dict = tokenizer(input_text, return_tensors="pt") 
    encodings_dict = {key:value.to(model.device) for key,value in encodings_dict.items()}
    model_kwargs = {
                    "max_length":max_target_length,
                    "num_beams":num_beams,
                    "no_repeat_ngram_size":no_repeat_ngram_size,
                    "length_penalty":length_penalty,
                    "top_p":top_p,
                    "do_sample":do_sample
                    }
    with torch.no_grad():
        generated_tokens = model.generate(**encodings_dict, **model_kwargs).tolist()[0]

    result = tokenizer.decode(generated_tokens, skip_special_tokens=True)
    nlp = get_nlp()
    sentences = [i for i in nlp(result).sents]
    indexes = []
    for sent in sentences:
        x = [sent.start_char, sent.end_char-1]
        indexes.append(x)
    
    alignments = alignment_model(doc_text, highlight_spans, sentences)
    return [result, indexes, alignments]

def alignment_model(orig_doc, highlight_span, summary):
    nlp = get_nlp()
    sentences = [i for i in nlp(orig_doc).sents]
    sentences_indexes = []
    for sent in sentences:
            x = [sent.start_char, sent.end_char]
            sentences_indexes.append(x)
    prep_input = preprocessor.preprocess_input(orig_doc, highlight_span).strip()
    input_texts = []
    for summary_sentence in summary:
        input_texts.append(str(summary_sentence))
    results = add_lemma_str_matching_spans(input_texts, str(prep_input), nlp)
    finalResult = []
    for result in results:
        finalResult.append(parseAlignmentSentence(result))
    return finalResult