import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { boldOrigin, highlightOrigin, missingReset, missingUndo, updateSentencesOriginIndexes } from '../actions/miss-highlight-text.actions';

export const missingHighlightTextKey = 'missingHighlightText';

export type MissinghighlightTextState = {
    lastHighlight: any
    highlightTexts: any[],
    highlightTextsHistory: any[],
    eraseMode: boolean,
    sentencesOriginIndexes: any,
    currentOriginHighlight: number,
    currentOriginBold: number

}

export const initialState: MissinghighlightTextState = {
    lastHighlight: null,
    highlightTexts: [],
    highlightTextsHistory: [],
    eraseMode: false,
    sentencesOriginIndexes: null,
    currentOriginHighlight: null,
    currentOriginBold: null
};

export const missingHighlightTextReducer = createReducer(
    initialState,
    on(missingReset, (state) => ({...state, highlightTexts: [], highlightTextsHistory: [], lastHighlight: null, eraseMode: false, currentOriginBold: null, currentOriginHighlight: null})),
    on(missingUndo, (state) => {
        if(state.highlightTextsHistory.length === 0) {
          return state;
        }
        let lastHighlight = [...state.highlightTextsHistory[state.highlightTextsHistory.length-1]];
        let highlightTexts = [...state.highlightTextsHistory[state.highlightTextsHistory.length-2] || []]
        let highlightTextsHistory = [...state.highlightTextsHistory.slice(0, state.highlightTextsHistory.length - 1)]
        return {
          ...state,
          lastHighlight,
          highlightTexts,
          highlightTextsHistory
        }
     }),
     on(updateSentencesOriginIndexes, (state, { indexes }) => {
      return {
        ...state, 
        sentencesOriginIndexes: indexes
      }
    }),
    on(highlightOrigin, (state, { index }) => {
      return {
        ...state, 
        currentOriginHighlight: index
      }
    }),
    on(boldOrigin, (state, { index }) => {
      return {
        ...state, 
        currentOriginBold: index
      }
    })
);


export const selectMissingHighlightText = createFeatureSelector<MissinghighlightTextState>(missingHighlightTextKey);
 
export const selectMissingHighlightTexts = createSelector(
  selectMissingHighlightText,
  (state: MissinghighlightTextState) => state.highlightTexts
);
export const selectMissingIsInEraseMode = createSelector(
  selectMissingHighlightText,
(state: MissinghighlightTextState) => state.eraseMode
);

export const selectSentencesOriginIndexes = createSelector(
  selectMissingHighlightText,
(state: MissinghighlightTextState) => state.sentencesOriginIndexes
);
export const selectCurrentOriginHighlight = createSelector(
  selectMissingHighlightText,
(state: MissinghighlightTextState) => state.currentOriginHighlight
);
export const selectCurrentOriginBold = createSelector(
  selectMissingHighlightText,
(state: MissinghighlightTextState) => state.currentOriginBold
);
