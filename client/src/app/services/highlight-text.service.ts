import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, share, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HighlightTextService {

  private baseURL: string = "https://nlp.biu.ac.il/~sloboda1/summarizer-server/";

  constructor(private http: HttpClient) { }

  initialHighlight(documentText: string) {
    const headers = { 'content-type': 'application/json' }
    const body = JSON.stringify({ doc_text: documentText });
    return this.http.post<{indexes: number[]}>(this.baseURL + 'initialHighlight', body,{'headers':headers}).pipe(share());
  }

  getAlignments(summary: string, documentText: string, highlightSpans: string) {
    const headers = { 'content-type': 'application/json' }
    const body = JSON.stringify({ doc_text: documentText, highlight_spans: highlightSpans, summary_text: summary });
    return this.http.post<{alignment: {sentencesIndexes: any, sentencesOriginIndexes: any}}>(this.baseURL + 'alignment', body,{'headers':headers}).pipe(share());
  }

  summarizeText(documentText: string, highlightSpans: string) {
    const headers = { 'content-type': 'application/json' }
    const body = JSON.stringify({ doc_text: documentText, highlight_spans: highlightSpans });
    return this.http.post<{summaryText: string, summaryId: string, alignment: any}>(this.baseURL + 'summarizeText', body,{'headers':headers}).pipe(share()).pipe(tap(x => console.log(x)));
  }

  saveToDB(documentText: string, highlightSpans: string, summaryText: string, summaryId: string, isSummaryGood: boolean, unnecessaryInformationInSummary: string, missingSpansInText: string) {
    const headers = { 'content-type': 'application/json' }
    let body: any = { doc_text: documentText, highlight_spans: highlightSpans, summary_text: summaryText, is_good: isSummaryGood, summary_id: summaryId }
    if (!isSummaryGood) {
      body.unnecessary_information_in_summary = unnecessaryInformationInSummary
      body.missing_spans_in_text = missingSpansInText
    }
    body = JSON.stringify(body);
    return this.http.post(this.baseURL + 'saveToDB', body, { 'headers': headers }).pipe(share());
  }
} 
