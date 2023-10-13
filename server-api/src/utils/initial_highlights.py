from functools import lru_cache
from typing import Union, List, Tuple
import math
import numpy as np
import spacy
from spacy.tokens import Span

# follow installation here - https://github.com/HHousen/TransformerSum#install
from TransformerSum.src.extractive import ExtractiveSummarizer


# https://drive.google.com/uc?id=1xlBJTO1LF5gIfDNvG33q8wVmvUB4jXYx
# download the above link into current directory and name it as below
MODEL_FILE = 'src/models/roberta_base_cnndm_epoch3.ckpt'

# python -m spacy download en_core_web_sm
SPACY_NLP_MODEL = 'en_core_web_sm'


@lru_cache
def get_nlp():
    return spacy.load(SPACY_NLP_MODEL)


@lru_cache
def get_model() -> ExtractiveSummarizer:
    return ExtractiveSummarizer.load_from_checkpoint(MODEL_FILE, strict=False)


def get_saliency_sentence_scores(txt: Union[str, List[Span]]) -> List[Tuple[int, str, int]]:
    nlp = get_nlp()
    model = get_model()

    if isinstance(txt, str):
        sentences = [i for i in nlp(txt).sents]
    else:
        sentences = list(txt)

    scores = model.predict_sentences(
        input_sentences=sentences,
        tokenized=True,
        raw_scores=True,
    )
    # add sentence indices to scores
    scores_with_indices = [(i, sent, score) for i, (sent, score) in enumerate(scores)]

    scores_with_indices.sort(key=lambda x: (-x[2], x[0]))
    topSentences = math.ceil(len(scores_with_indices) / 3)
    final = min(len(scores_with_indices) -1, topSentences)
    scores_with_indices = scores_with_indices[0:max(1, final)]
    result = []
    for i, a, b in scores_with_indices:
        x = [sentences[i].start_char, sentences[i].end_char]
        result.append(x)
    return result
