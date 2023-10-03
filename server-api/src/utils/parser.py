#import copy
#mock = "<extra_id_3> Debi Thomas' dream of Olympic gold turned into disappointment Saturday as East Germany's Katarina Witt won her second straight Olympic championship and Canadian Elizabeth Manley took home the silver<extra_id_4> before a crowd of cheering countrymen. over. Back to school, said <extra_id_3> Thomas<extra_id_4>, who won the bronze medal despite three faulty landings."

def parseAlignmentSentence(sentence):
    sent = (sentence+'.')[:-1]
    start_token = '<extra_id_3>'
    end_token = '<extra_id_4>'
    searchStart = True
    results = []
    tempResult = [0,0]
    while True:
        if searchStart:
            index = sent.find(start_token)
            if index == -1:
                return results
            tempResult = [0,0]
            tempResult[0] = index
            sent = sent.replace(start_token, '', 1)
            searchStart = False
        else:
            index = sent.find(end_token)
            if index == -1:
                return results
            tempResult[1] = index
            results.append(tempResult)
            sent = sent.replace(end_token, '', 1)
            searchStart = True

def check_intersection(sentence, span):
    if (sentence[0] >= span[0] and sentence[1] >= span[1] and span[1] >= sentence[0] and span[0] <= sentence[1]) or \
       (sentence[0] <= span[0] and span[1] >= sentence[1] and span[0] <= sentence[1] and span[1] >= sentence[0]) or \
       (span[0] <= sentence[0] and span[1] >= sentence[1]):
        return True
    else:
        return False
        
def split_span(sentences_indexes, span):
    new_spans = []

    relevant_sentences = []
    for sentence in sentences_indexes:
        if(check_intersection(sentence, span)):
            relevant_sentences.append(sentence)
    if(len(relevant_sentences) <= 1):
        return span, False
    result = [[span[0], relevant_sentences[0][1]]]
    for sentence in relevant_sentences[1:-1]:
        result.append(sentence)
    result.append([relevant_sentences[len(relevant_sentences) - 1][0], span[1]])
    return result, True

def get_splitted_spans(sentences_indexes, spans):
    results = []
    for span in spans:
        temp, should_flat = split_span(sentences_indexes, span)
        if should_flat:
            for t in temp:
                results.append(t)
        else:
            results.append(temp)
    final_results = []
    for i, result in enumerate(results):
        final_results.append([result[0], result[1]])
    return final_results