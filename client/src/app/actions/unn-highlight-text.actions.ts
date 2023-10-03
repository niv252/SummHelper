import { createAction, props } from '@ngrx/store';

export const unnecessaryUndo = createAction('[Unnecessary Highlight Text] Undo');
export const unnecessaryReset = createAction('[Unnecessary Highlight Text] Reset');
export const unnecessaryToggleEraseMode = createAction('[Unnecessary Highlight Text] Toggle Erase mode');
export const unnecessarySnapshotHistory = createAction('[Unnecessary Highlight Text] Snapshot History', props<{text: string, sentencesIndexes: any}>());
export const updateSentencesIndexes = createAction('[Unnecessary Highlight Text] Update Sentences Indexes', props<{indexes: any}>());
export const updateSentencesIndexesWithoutInitial = createAction('[Unnecessary Highlight Text] Update Sentences Indexes Without Initials', props<{indexes: any}>());
