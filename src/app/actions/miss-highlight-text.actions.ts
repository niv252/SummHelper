import { createAction, props } from '@ngrx/store';

export const missingUndo = createAction('[Missing Highlight Text] Undo');
export const missingReset = createAction('[Missing Highlight Text] Reset');
export const missingToggleEraseMode = createAction('[Missing Highlight Text] Toggle Erase mode');
export const updateSentencesOriginIndexes = createAction('[Missing Highlight Text] Update Sentences Origin Indexes', props<{indexes: any}>());
export const highlightOrigin = createAction('[Missing Highlight Text] Highlight Origin', props<{index: number}>());
export const boldOrigin = createAction('[Missing Highlight Text] Bold Origin', props<{index: number}>());