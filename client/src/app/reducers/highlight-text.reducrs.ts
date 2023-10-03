import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { activateEraseMode, deactivateEraseMode, highlightText, removeWordsFromHighlightedText, reset, toggleEraseMode, toggleInitialHighlightMode, undo } from '../actions/highlight-text.actions'

export const highlightTextKey = 'highlightText';

export type highlightTextState = {
    lastHighlight: any
    highlightTexts: any[],
    highlightTextsHistory: any[],
    text: string,
    eraseMode: boolean,
    initialHighlightMode: boolean,
    shouldRegenerate: boolean
}

export const initialState: highlightTextState = {
    lastHighlight: null,
    highlightTexts: [],
    highlightTextsHistory: [],
    text: '',
    eraseMode: false,
    initialHighlightMode: false,
    shouldRegenerate: true
};

export const highlightTextReducer = createReducer(
  initialState,
  on(highlightText, (state, {range}) => {
    let highlightTexts = mergeRangesWithGap(state.highlightTexts, range)
    return {
      ...state, highlightTexts,
      highlightTextsHistory: [...state.highlightTextsHistory, highlightTexts],
      shouldRegenerate: false
    }
  }),
  on(reset, (state) => ({...state, highlightTexts: [], highlightTextsHistory: [], lastHighlight: null, eraseMode: false, initialHighlightMode: false, shouldRegenerate: true})),
  on(undo, (state) => {
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
      highlightTextsHistory,
      shouldRegenerate: false
    }
  }),
  on(toggleEraseMode, (state) => ({...state, eraseMode: !state.eraseMode, shouldRegenerate: false })),
  on(toggleInitialHighlightMode, (state) => ({...state, initialHighlightMode: !state.initialHighlightMode, shouldRegenerate: false })),
  on(removeWordsFromHighlightedText, (state, { wordsToRemove, wordIndexes }) => {
    let wordsToRemoveCopy = [...wordsToRemove];
    if(wordsToRemoveCopy.length > 1) {
      wordsToRemoveCopy.sort((a, b) => a - b);
      function createNumberArray(start: number, end: number): number[] {
        const result: number[] = [];
        for (let i = start; i <= end; i++) {
          result.push(i);
        }
        return result;
      }
      wordsToRemoveCopy = createNumberArray(wordsToRemoveCopy[0], wordsToRemoveCopy[wordsToRemoveCopy.length-1]);
    }


    let highlightTexts: any = removeWordsFromHiglights([...state.highlightTexts], [...wordsToRemoveCopy], [...wordIndexes]);
    return {
      ...state, 
      highlightTexts,
      highlightTextsHistory: [...state.highlightTextsHistory, highlightTexts],
      shouldRegenerate: false
    }
  }),
  on(activateEraseMode, (state) => ({...state, eraseMode: true, shouldRegenerate: false })),
  on(deactivateEraseMode, (state) => ({...state, eraseMode: false, shouldRegenerate: false })),
);

export const selectHighlightText = createFeatureSelector<highlightTextState>(highlightTextKey);
 
export const selectHighlightTexts = createSelector(
    selectHighlightText,
  (state: highlightTextState) => state.highlightTexts
);
export const selectIsInEraseMode = createSelector(
  selectHighlightText,
(state: highlightTextState) => state.eraseMode
);
export const selectIsInInitalHighlightMode = createSelector(
  selectHighlightText,
(state: highlightTextState) => state.initialHighlightMode
);
export const selectLastHighlight = createSelector(
  selectHighlightText,
(state: highlightTextState) => state.lastHighlight
);
export const selectShouldRegenerate = createSelector(
  selectHighlightText,
(state: highlightTextState) => state.shouldRegenerate
);
function mergeRangesWithGap(arr: any[], newVal: any) {
  let arrCopy = [...arr]
  arrCopy.push(newVal)
  let mergedArr = [];

  arrCopy.sort((a: any, b: any) => a[0] - b[0]);

  for (let i = 0; i < arrCopy.length; i++) {
    let currentRange = arrCopy[i];

    if (mergedArr.length === 0 || currentRange[0] > mergedArr[mergedArr.length - 1][1] + 2) {
      mergedArr.push(currentRange);
    } else {
      let lastMergedRange: any = mergedArr[mergedArr.length - 1];
      mergedArr[mergedArr.length - 1] = [lastMergedRange[0], Math.max(lastMergedRange[1], currentRange[1])];
    }
  }
  return [...mergedArr];
}

function removeWordsFromHiglights(highlightTexts: any[], wordsToRemove: number[], wordIndexes: number[]) {
  wordsToRemove.forEach(wordToRemove => {
    const relevantRangeIndex: any = highlightTexts.findIndex(x => x[0] <= wordToRemove && x[1] >= wordToRemove);
    if(relevantRangeIndex >= 0) {
      const relevantRange = [...highlightTexts[relevantRangeIndex]];
      let newRange;
      if(relevantRange[0] === wordToRemove) {
          const nextWordIndex = wordIndexes.findIndex(x => x === wordToRemove) + 1;
          if(nextWordIndex === wordIndexes.length || wordIndexes[nextWordIndex] > relevantRange[1]) {
            highlightTexts.splice(relevantRangeIndex, 1);
          } else {
            newRange = [wordIndexes[nextWordIndex], relevantRange[1]];
            highlightTexts.splice(relevantRangeIndex, 1);
            highlightTexts = [...mergeRangesWithGap(highlightTexts, newRange)];
          }
      } else {
        const end = Number(document.getElementById(`word${wordToRemove}`).getAttribute('name').replace('word', ''));
        if(relevantRange[1] === end) {
          const previousWordIndex = wordIndexes.findIndex(x => x === wordToRemove) - 1;
          if(previousWordIndex === -1 || wordIndexes[previousWordIndex] < relevantRange[0]) {
            highlightTexts.splice(relevantRangeIndex, 1);
          } else {
            const newEnd = Number(document.getElementById(`word${wordIndexes[previousWordIndex]}`).getAttribute('name').replace('word', ''));
            newRange = [relevantRange[0], newEnd];
            highlightTexts.splice(relevantRangeIndex, 1);
            highlightTexts = [...mergeRangesWithGap(highlightTexts, newRange)];
          }
        } else {
          highlightTexts.splice(relevantRangeIndex, 1);
          const previousWordIndex = wordIndexes.findIndex(x => x === wordToRemove) - 1;
          const newEnd = Number(document.getElementById(`word${wordIndexes[previousWordIndex]}`).getAttribute('name').replace('word', ''));

          const nextWordIndex = wordIndexes.findIndex(x => x === wordToRemove) + 1;

          highlightTexts = [...mergeRangesWithGap(highlightTexts, [relevantRange[0], newEnd])];
          highlightTexts = [...mergeRangesWithGap(highlightTexts, [wordIndexes[nextWordIndex], relevantRange[1]])];

        }
      }
    }
  });
  return highlightTexts;
}