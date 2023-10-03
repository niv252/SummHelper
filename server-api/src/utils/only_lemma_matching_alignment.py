import json
import spacy
from copy import deepcopy
from string import punctuation, whitespace

MAX_NUM_TOKENS_NOT_HIGHLIGHT = 3
MIN_HIGHLIGHT_OVERLAP_RATIO = 0.25
MAX_LCS_ITER_PER_SENT = 4 # to make sure this iteration doesn't enter an infinite loop
HIGHLIGHT_START_TOKEN = "<extra_id_1>"
HIGHLIGHT_END_TOKEN = "<extra_id_2>"
ALIGNMENT_START_TOKEN = "<extra_id_3>"
ALIGNMENT_END_TOKEN = "<extra_id_4>"
MATCH_HIGHLIGHTS = True

def longest_common_subsequence(list1, list2):
    m = len(list1)
    n = len(list2)

    # Initializing the matrix
    dp = [[None]*(n+1) for i in range(m+1)]
    
    # Building dp matrix in bottom-up way
    for i in range(m+1):
        for j in range(n+1):
            if i == 0 or j == 0 :
                dp[i][j] = 0
            elif list1[i-1] == list2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])

    # Following the backtrack from the bottom-right to find the LCS
    i = m
    j = n
    lcs = []
    indices1 = []
    indices2 = []

    while i > 0 and j > 0:
        if list1[i-1] == list2[j-1]:
            lcs.insert(0, list1[i-1])
            indices1.insert(0, i-1)
            indices2.insert(0, j-1)
            i -= 1
            j -= 1
        elif dp[i-1][j] > dp[i][j-1]:
            i -= 1
        else:
            j -= 1

    return lcs, indices1, indices2


def remove_alignment_tokens(curr_output, a_start_word, a_end_word):
    # get indice of highlighted spans
    highlights_indice = []
    output_copy = deepcopy(curr_output)
    h_start_ind = output_copy.find(a_start_word)

    while(h_start_ind != -1):
        output_copy = output_copy[:h_start_ind] + output_copy[h_start_ind+len(a_start_word):]
        h_end_ind = output_copy.find(a_end_word)
        highlights_indice.append((h_start_ind, h_end_ind))
        output_copy = output_copy[:h_end_ind] + output_copy[h_end_ind+len(a_end_word):]
        h_start_ind = output_copy.find(a_start_word)
    return highlights_indice, output_copy

def get_consecutive_subspans(i_list):
    if not i_list:
        return []
    subspans = []
    low_lim, up_lim = -1, -1
    for i in range(len(i_list)-1):
        if low_lim == -1:
            low_lim = i_list[i]
            up_lim = -1
        if i_list[i+1] > i_list[i]+1:
            up_lim = i_list[i]
            subspans.append([low_lim, up_lim])
            low_lim = -1
    if low_lim == -1:
        subspans.append([i_list[-1], i_list[-1]])
    else:
        subspans.append([low_lim, i_list[-1]])
    return subspans

def tkn_list_to_idx_subspans(tkn_list, tokenized_input):
    tkn_lst_i = sorted([tkn.i for tkn in tkn_list])
    if not tkn_lst_i:
        return []
    tkn_subspans = get_consecutive_subspans(tkn_lst_i)
    idx_subspans = []
    for span in tkn_subspans:
        curr_tokens = [tokenized_input[i] for i in list(range(span[0],span[1]+1))]
        # clean spans that consist of only stop words and punctuations.
        if any(not tkn.is_stop and not tkn.pos_ in ['PUNCT', 'SPACE'] for tkn in curr_tokens):
            start_idx = curr_tokens[0].idx
            end_idx = curr_tokens[-1].idx+len(curr_tokens[-1].text)
            idx_subspans.append((start_idx, end_idx))
    return idx_subspans


def get_sent_id(tkn):
    sentence = [i for i, sent in enumerate(tkn.doc.sents) if sent == tkn.sent]
    if len(sentence) > 1:
        print("ERROR: identical sentences!")
        exit()
    return sentence[0]

def separate_highlighted_tkns_by_sentences(tkn_list):
    sent_id_tkn_lst = [(tkn, get_sent_id(tkn)) for tkn in tkn_list]
    unique_sent_ids = sorted(list(set([tpl[1] for tpl in sent_id_tkn_lst])))
    new_tkn_lists = []
    for sent_id in unique_sent_ids:
        curr_list = [tpl[0] for tpl in sent_id_tkn_lst if tpl[1]==sent_id]
        curr_list = sorted(curr_list, key=lambda x: x.i)
        new_tkn_lists.append(curr_list)
    return new_tkn_lists


def get_tokens_in_spans(tkns, idx_spans):
    idx_spans =  sorted(idx_spans, key=lambda x: x[0])
    highlighted_tkns = []
    for span in idx_spans:
        curr_span_indices = range(span[0], span[1])
        curr_tkns = [tkn for tkn in tkns if tkn.idx in curr_span_indices]
        highlighted_tkns.extend(separate_highlighted_tkns_by_sentences(curr_tkns))

    return highlighted_tkns

def overlap_with_highlight(sentences_tkns, highlights_tkns_lst):
    for i,lst in enumerate(highlights_tkns_lst):
        if len(lst) == 0: # in case the highlight only contains stop words and punctuation, so the lst is empty here (because we passed to this function on the non-punctuation and non-stop words tokens)
            continue
        overlapping_tkns = set(sentences_tkns).intersection(set(lst))
        if len(overlapping_tkns)/len(lst) >= MIN_HIGHLIGHT_OVERLAP_RATIO:
            return i
    return -1

def get_lemma_matching_spans_idx(cleaned_input_text_tokenized, input_highlights_indice, s_sentence, nlp):
    # per_sentence_lemma_matching_idx_spans = []
    # for s_sentence in example_summary_sentences:
    input_highlighted_tokens = get_tokens_in_spans(cleaned_input_text_tokenized, input_highlights_indice)
    # take only content tokens (not stop words and not punctuation/spaces)
    input_highlighted_content_tokens = [[tkn for tkn in tkn_lst if not tkn.is_stop and not tkn.pos_ in ['PUNCT', 'SPACE']] for tkn_lst in input_highlighted_tokens]
    s_sentence_lemmas = [elem.lemma_.lower() for elem in nlp(s_sentence)]
    lemma_matching_tkns = []
    for d_sentence in cleaned_input_text_tokenized.sents:
        d_sentence_lemmas = [tkn.lemma_.lower() for tkn in d_sentence]
        s_sentence_lemmas_copy = deepcopy(s_sentence_lemmas)
        for iter in range(MAX_LCS_ITER_PER_SENT):
            lcs, indices1, indices2 = longest_common_subsequence(s_sentence_lemmas_copy, d_sentence_lemmas)
            curr_d_tokens = [d_sentence[ind] for ind in indices2]
            curr_content_tokens = [tkn for tkn in curr_d_tokens if not tkn.is_stop and not tkn.pos_ in ['PUNCT', 'SPACE']]
            overlapping_highlight_span_i = overlap_with_highlight(curr_content_tokens, input_highlighted_content_tokens)
            if len(curr_content_tokens) >= MAX_NUM_TOKENS_NOT_HIGHLIGHT or overlapping_highlight_span_i != -1:
                lemma_matching_tkns.extend(curr_d_tokens)
                s_sentence_lemmas_copy = [lemma for lemma_i,lemma in enumerate(s_sentence_lemmas_copy) if not lemma_i in indices1] # remove the already aligned to lemmas from the summary sentence
            else:
                break
        # lcs, indices1, indices2 = longest_common_subsequence(s_sentence_lemmas, d_sentence_lemmas)
        # curr_d_tokens = [d_sentence[ind] for ind in indices2]
        # curr_content_tokens = [tkn for tkn in curr_d_tokens if not tkn.is_stop and not tkn.pos_ in ['PUNCT', 'SPACE']]
        # overlapping_highlight_span_i = overlap_with_highlight(curr_content_tokens, input_highlighted_content_tokens)
        # if len(curr_content_tokens) >= MAX_NUM_TOKENS_NOT_HIGHLIGHT or overlapping_highlight_span_i != -1:
        #     lemma_matching_tkns.extend(curr_d_tokens)

    lemma_matching_idx_spans = tkn_list_to_idx_subspans(lemma_matching_tkns, cleaned_input_text_tokenized)
    return lemma_matching_idx_spans

def get_string_matching_spans_idx(cleaned_input_text_tokenized, input_highlights_indice, s_sentence, nlp):
    # per_sentence_str_matching_idx_spans = []
    # for s_sentence in example_summary_sentences:
    input_highlighted_tokens = get_tokens_in_spans(cleaned_input_text_tokenized, input_highlights_indice)
    # take only content tokens (not stop words and not punctuation/spaces)
    input_highlighted_content_tokens = [[tkn for tkn in tkn_lst if not tkn.is_stop and not tkn.pos_ in ['PUNCT', 'SPACE']] for tkn_lst in input_highlighted_tokens]
    s_sentence_strs = [elem.text.lower() for elem in nlp(s_sentence)]
    str_matching_tkns = []
    for d_sentence in cleaned_input_text_tokenized.sents:
        d_sentence_strs = [tkn.text.lower() for tkn in d_sentence]
        lcs, indices1, indices2 = longest_common_subsequence(s_sentence_strs, d_sentence_strs)
        curr_d_tokens = [d_sentence[ind] for ind in indices2]
        curr_content_tokens = [tkn for tkn in curr_d_tokens if not tkn.is_stop and not tkn.pos_ in ['PUNCT', 'SPACE']]
        overlapping_highlight_span_i = overlap_with_highlight(curr_content_tokens, input_highlighted_content_tokens)
        if len(curr_content_tokens) >= MAX_NUM_TOKENS_NOT_HIGHLIGHT or overlapping_highlight_span_i != -1:
            str_matching_tkns.extend(curr_d_tokens)

    str_matching_idx_spans = tkn_list_to_idx_subspans(str_matching_tkns, cleaned_input_text_tokenized)
    return str_matching_idx_spans


def add_alignment_token(clean_input, alignment_spans):
    alignment_spans = sorted(alignment_spans, key=lambda x: x[0])
    final_output = ""
    prev_end = 0
    for span in alignment_spans:
        # add text between previous alignment and curr alignment
        final_output = final_output + clean_input[prev_end:span[0]]
        
        # add curr alignment
        final_output = final_output + ALIGNMENT_START_TOKEN + clean_input[span[0]:span[1]] + ALIGNMENT_END_TOKEN
        prev_end = span[1]
    
    # add the remaining text after the last alignment
    final_output = final_output + clean_input[prev_end:]
    return final_output



def merge_punctuation_delimeted_consecutive_spans(curr_text, start_tkn, end_tkn):
    for w in f"{whitespace} ":
        curr_text = curr_text.replace(f"{end_tkn}{w}{start_tkn}", f"{w}")
        for p in punctuation:
            curr_text = curr_text.replace(f"{end_tkn}{w}{p}{start_tkn}", f"{w}{p}")
            curr_text = curr_text.replace(f"{end_tkn}{p}{w}{start_tkn}", f"{p}{w}")
            curr_text = curr_text.replace(f"{end_tkn}{w}{p}{w}{start_tkn}", f"{w}{p}{w}")
    return curr_text

def remove_redundant_spans(cleaned_input_text_tokenized, combined_spans, input_highlights_indice):
    tkns_sublists = get_tokens_in_spans(cleaned_input_text_tokenized, combined_spans)
    sentwise_span_clusters, sentwise_content_lemmas_clusters = dict(), dict()
    sent_num = len(list(cleaned_input_text_tokenized.sents))
    for sent_i in range(sent_num):
        curr_sent_tkns = [tkn_lst for tkn_lst in tkns_sublists if any(get_sent_id(tkn)==sent_i for tkn in tkn_lst)]
        if curr_sent_tkns:
            sentwise_span_clusters[sent_i] = curr_sent_tkns
            sentwise_content_lemmas_clusters[sent_i] = [tkn.lemma_ for tkn_lst in curr_sent_tkns for tkn in tkn_lst if not tkn.is_stop and not tkn.pos_ in ['PUNCT', 'SPACE']]
    filtered_sent_i_spans = list()
    for sent_i, span_cluster in sentwise_span_clusters.items():
        curr_content_lemmas = sentwise_content_lemmas_clusters[sent_i]
        # check if curr content lemmas are a sub list of another lemma cluster
        if any(all(lemma in lemma_lst for lemma in curr_content_lemmas) and sent_i!=sent_j for sent_j,lemma_lst in sentwise_content_lemmas_clusters.items()):
            continue
        filtered_sent_i_spans.extend([tkn for tkn_lst in sentwise_span_clusters[sent_i] for tkn in tkn_lst])
        
    return tkn_list_to_idx_subspans(filtered_sent_i_spans, cleaned_input_text_tokenized)


def add_lemma_str_matching_spans(summary_sentences, input_text, nlp):
    input_highlights_indice, cleaned_input_text = remove_alignment_tokens(input_text, HIGHLIGHT_START_TOKEN, HIGHLIGHT_END_TOKEN)
    cleaned_input_text_tokenized = nlp(cleaned_input_text)

    inputs_with_alignments = []
    for i,s_sentence in enumerate(summary_sentences):
        lemma_matching_idx_spans = get_lemma_matching_spans_idx(cleaned_input_text_tokenized, input_highlights_indice, s_sentence, nlp)
        
        # sometimes the lemmas are not similar for the same strings, because of the strings' location in the summary/doc sentence
        # e.g.: summary sentence: The only engraving mistake was in 1938 when the best actor trophy given to Spencer Tracy for "Boy's Town" read \"Best Actor: Dick Tracy.\"
        #       document sentence: According to the Academy of Motion Pictures Arts and Sciences, the only engraving mistake was in 1938 when the best actor trophy given to Spencer Tracy for "Boy\'s Town"
        # in the summary - "engraving"'s lemma was "engraving", whereas in the doc - the lemma was "engrave"
        string_matching_idx_spans = get_string_matching_spans_idx(cleaned_input_text_tokenized, input_highlights_indice, s_sentence, nlp)

        combined_indice = [i for span in lemma_matching_idx_spans for i in range(span[0],span[1]+1)] + [i for span in string_matching_idx_spans for i in range(span[0],span[1]+1)]
        combined_indice = sorted(list(set(combined_indice)))
        combined_spans = get_consecutive_subspans(combined_indice)

        # remove redundant alignments (where sentences with alignments to lemmas that are sub-lemmas of other spans)
        cleaned_combined_spans = remove_redundant_spans(cleaned_input_text_tokenized, combined_spans, input_highlights_indice)


        # add the alignment tokens
        final_output = add_alignment_token(cleaned_input_text, cleaned_combined_spans)

        # merge punctuation-separated spans
        final_output = merge_punctuation_delimeted_consecutive_spans(final_output, ALIGNMENT_START_TOKEN, ALIGNMENT_END_TOKEN)
        inputs_with_alignments.append(final_output)

    # for i,result in enumerate(results):
    #     curr_s_sentence = summary_sentences[i]
    #     alignments_indice, cleaned_input_text = remove_alignment_tokens(result, ALIGNMENT_START_TOKEN, ALIGNMENT_END_TOKEN)

    #     # tokenized text (without alignment tokens), separate into sentences
    #     cleaned_input_text_tokenized = nlp(cleaned_input_text)
    #     cleaned_input_text_lemmas = [tkn.lemma_ for tkn in cleaned_input_text_tokenized]

    #     lemma_matching_idx_spans = get_lemma_matching_spans_idx(cleaned_input_text_tokenized, curr_s_sentence, nlp)

    #     # combine the alignment model and the lemma matching spans
    #     combined_indice = [i for span in lemma_matching_idx_spans for i in range(span[0],span[1]+1)] + [i for span in alignments_indice for i in range(span[0],span[1]+1)]
    #     combined_indice = sorted(list(set(combined_indice)))
    #     combined_spans = get_consecutive_subspans(combined_indice)
        
    #     # add the alignment tokens
    #     final_output = add_alignment_token(cleaned_input_text, combined_spans)
    #     inputs_with_alignments.append(final_output)
    return inputs_with_alignments