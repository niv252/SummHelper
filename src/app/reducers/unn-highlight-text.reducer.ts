import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { unnecessaryReset, unnecessarySnapshotHistory, unnecessaryToggleEraseMode, unnecessaryUndo, updateSentencesIndexes, updateSentencesIndexesWithoutInitial } from '../actions/unn-highlight-text.actions'

export const unnecessaryHighlightTextKey = 'unnecessaryHighlightText';

export type UnnecessaryhighlightTextState = {
    lastHighlight: any
    highlightTexts: any[],
    highlightTextsHistory: any[],
    eraseMode: boolean,
    sentencesIndexes: any,
    initialSentencesIndexes: any,
    shouldRegenerate: boolean
}

export const initialState: UnnecessaryhighlightTextState = {
    lastHighlight: null,
    highlightTexts: [],
    highlightTextsHistory: [],
    eraseMode: false,
    sentencesIndexes: null,
    initialSentencesIndexes: null,
    shouldRegenerate: true
};

export const unnecessaryHighlightTextReducer = createReducer(
    initialState,
    on(unnecessaryReset, (state) => ({...state, highlightTexts: [], highlightTextsHistory: [], lastHighlight: null, eraseMode: false, shouldRegenerate: true })),
    on(unnecessaryUndo, (state) => {
        if(state.highlightTextsHistory.length === 0) {
          return state;
        }
        let lastHighlight = [...state.highlightTextsHistory[state.highlightTextsHistory.length-1]];
        let highlightTexts = [...state.highlightTextsHistory[state.highlightTextsHistory.length-2] || []];
        let sentencesIndexes = [...state.highlightTextsHistory[state.highlightTextsHistory.length-2] || []][0]?.sentencesIndexes;
        if(!sentencesIndexes) {
          sentencesIndexes = [...state.initialSentencesIndexes]
        }
        if(highlightTexts.length > 0 && highlightTexts[0].hasOwnProperty('text')) {
          highlightTexts = [...highlightTexts[0].highlightTexts];
        }
        let highlightTextsHistory = [...state.highlightTextsHistory.slice(0, state.highlightTextsHistory.length - 1)]

        return {
          ...state,
          lastHighlight,
          highlightTexts,
          highlightTextsHistory,
          sentencesIndexes,
          shouldRegenerate: false
        }
     }),
     on(unnecessaryToggleEraseMode, (state) => ({...state, eraseMode: !state.eraseMode, shouldRegenerate: false })),
    on(unnecessarySnapshotHistory, (state, { text, sentencesIndexes }) => {
      let highlightTexts: any = [...state.highlightTexts];
      let sentenceIndexes: any = [...state.sentencesIndexes];

      return {
        ...state, 
        highlightTextsHistory: [...state.highlightTextsHistory, [{highlightTexts: [...highlightTexts], text: text.replaceAll(String.fromCharCode(160), String.fromCharCode(32)), sentencesIndexes: [...sentenceIndexes]}]],
        shouldRegenerate: false
      }
    }),
    on(updateSentencesIndexes, (state, { indexes }) => {
      return {
        ...state, 
        sentencesIndexes: indexes,
        initialSentencesIndexes: indexes,
        shouldRegenerate: false
      }
    }),
    on(updateSentencesIndexesWithoutInitial, (state, { indexes }) => {
      return {
        ...state, 
        sentencesIndexes: indexes,
        shouldRegenerate: false
      }
    })
);


export const selectUnnecessaryHighlightText = createFeatureSelector<UnnecessaryhighlightTextState>(unnecessaryHighlightTextKey);
 
export const selectUnnecessaryHighlightTexts = createSelector(
  selectUnnecessaryHighlightText,
  (state: UnnecessaryhighlightTextState) => state.highlightTexts
);
export const selectUnnecessaryIsInEraseMode = createSelector(
  selectUnnecessaryHighlightText,
(state: UnnecessaryhighlightTextState) => state.eraseMode
);
export const selectUnnecessaryLastHighlight = createSelector(
  selectUnnecessaryHighlightText,
(state: UnnecessaryhighlightTextState) => state.lastHighlight
);
export const selectSentencesIndexes = createSelector(
  selectUnnecessaryHighlightText,
(state: UnnecessaryhighlightTextState) => state.sentencesIndexes
);
export const selectUnnecessaryShouldRegenerate = createSelector(
  selectUnnecessaryHighlightText,
(state: UnnecessaryhighlightTextState) => state.shouldRegenerate
);