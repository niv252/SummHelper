import { createAction, props } from '@ngrx/store';

export const highlightText = createAction('[Highlight Text] Highlight Text', props<{range: any}>());
export const undo = createAction('[Highlight Text] Undo');
export const toggleEraseMode = createAction('[Highlight Text] Toggle Erase mode');
export const activateEraseMode = createAction('[Highlight Text] Activate Erase mode');
export const deactivateEraseMode = createAction('[Highlight Text] Deactivate Erase mode');
export const reset = createAction('[Highlight Text] Reset');
export const removeWordsFromHighlightedText = createAction('[Highlight Text] Remove Words From Highlighted Text', props<{wordsToRemove: number[], wordIndexes: number[]}>());
export const toggleInitialHighlightMode = createAction('[Highlight Text] Toggle Initial Highlight Mode');