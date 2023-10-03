import { Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import {FormBuilder, FormControl} from '@angular/forms';
import { HighlightTextService } from './services/highlight-text.service';
import { highlightTextState, selectHighlightTexts, selectIsInEraseMode, selectIsInInitalHighlightMode } from './reducers/highlight-text.reducrs';
import { Store } from '@ngrx/store';
import { reset, undo, toggleInitialHighlightMode, deactivateEraseMode, activateEraseMode } from './actions/highlight-text.actions';
import { take } from 'rxjs';
import { unnecessaryReset, unnecessaryUndo, updateSentencesIndexes } from './actions/unn-highlight-text.actions';
import { boldOrigin, highlightOrigin, missingReset, updateSentencesOriginIndexes } from './actions/miss-highlight-text.actions';
import { selectMissingHighlightTexts, selectMissingIsInEraseMode } from './reducers/miss-highlight-text.reducer';
import { selectUnnecessaryHighlightTexts, selectUnnecessaryIsInEraseMode } from './reducers/unn-highlight-text.reducer';
import { DocxReaderService } from './services/docx-reader.service';
import { saveAs } from 'file-saver';
import { MatStepper } from '@angular/material/stepper';
import { CdkStepper } from '@angular/cdk/stepper';
import Swal from 'sweetalert2'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
  providers: [CdkStepper]
})
export class AppComponent {
  @ViewChild('next', {static: false}) next: ElementRef;
  @ViewChild('stepper', {static: false}) stepper!: MatStepper;

  started = false;
  textFormGroup = this._formBuilder.group({
    text: [''],
  });
  highlightFormGroup = this._formBuilder.group({});
  editSummaryControl: FormControl = new FormControl('');

  goodSummary = true;
  summary: {summaryText: string, summaryId: string, alignment: any}
  done = false;
  editSummary = false;
  isInEraseMode$: any;
  isInInitialHighlightMode$: any;
  missingIsInEraseMode$: any;
  unnIsInEraseMode$: any;
  startedHighlighting = false;
  finalSummary = '';
  initialHighlights: any;
  shouldSeeSummary = true;
  shouldSummary = true;
  flag = false;
  highlight = true;
  constructor(private docxReaderService: DocxReaderService, private cdr: ChangeDetectorRef, private _formBuilder: FormBuilder, private highlightTextService: HighlightTextService, private store:Store<highlightTextState>) {
    this.isInEraseMode$ = store.select(selectIsInEraseMode);
    this.isInInitialHighlightMode$ = store.select(selectIsInInitalHighlightMode);

    this.missingIsInEraseMode$ = store.select(selectMissingIsInEraseMode);
    this.unnIsInEraseMode$ = store.select(selectUnnecessaryIsInEraseMode);
    store.select(selectHighlightTexts).subscribe(() => {
      this.shouldSummary = true;
    })
    this.textFormGroup.valueChanges.subscribe(() => {
      this.initialHighlights = null;
    })
  }

  undo() {
    this.store.dispatch(undo())
  }

  startHighlighting() {
    if(this.textFormGroup.value.text !== '') {
      this.startedHighlighting = true;
      if(this.initialHighlights === null) {
        // fix server offset
        this.highlightTextService.initialHighlight(this.textFormGroup.value.text).pipe(take(1)).subscribe((x: any) => this.initialHighlights = x.indexes.map((y:any) => [y[0], y[1]-1]));
      }
    }
  }

  stopHighlighting() {
    this.startedHighlighting = false;
  }

  unnecessaryUndo() {
    this.store.dispatch(unnecessaryUndo())
  }

  deactivateEraseMode() {
    this.store.dispatch(deactivateEraseMode())
  }

  activateEraseMode() {
    this.store.dispatch(activateEraseMode())
  }

  toggleInitialHighlightMode() {
    this.store.dispatch(toggleInitialHighlightMode())
  }


  reset() {
    this.textFormGroup.value.text = '';
    this.textFormGroup.reset();
    this.goodSummary = false;
    this.summary = null;
    this.store.dispatch(reset())
    this.store.dispatch(missingReset())
    this.store.dispatch(unnecessaryReset())
    this.done = false;
    this.editSummary = false;
    this.startedHighlighting = false;
    this.initialHighlights = null;
    this.shouldSummary = true;
    this.flag = false;
  }

  resetAllBeforeSummary() {
    Swal.fire({
      title: 'Do you want to start a new session?',
      showDenyButton: false,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      icon: 'warning',
      cancelButtonText: `No`,
      html: 'Starting a new session will delete the current one.<br/>Do you want to proceed?',
    }).then((result) => {
      if (result.isConfirmed) {
        this.stepper.reset();
        this.reset();
         this.started = true;
      }
    })

  }

  resetAllAfterSummary() {
    Swal.fire({
      html: '<b>You are about to start a new session.</b><br/><br/>Do you wish to download the current summary before starting over?',
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      denyButtonText: `No`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.stepper.reset();
        this.reset();
        this.saveToDB();
        this.saveToFile();
        this.started = true;
      } else if (result.isDenied) {
        this.stepper.reset();
        this.reset();
        this.started = false;
      }
    })

  }

  resetHighlightStage() {
    Swal.fire({
      title: 'Are you sure you want to reset all highlights?',
      showDenyButton: false,
      showCancelButton: true,
      confirmButtonText: 'Reset',
      icon: 'warning',
      cancelButtonText: `Cancel`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.store.dispatch(reset())

      }
    })
  }

  resetSummaryStage() {
    Swal.fire({
      title: 'Are you sure you want to reset all the changes you have done in the summary?',
      showDenyButton: false,
      showCancelButton: true,
      confirmButtonText: 'Reset',
      icon: 'warning',
      cancelButtonText: `Cancel`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.shouldSeeSummary = false;
        this.store.dispatch(unnecessaryReset())
        this.store.dispatch(boldOrigin({index: null}));
        this.store.dispatch(highlightOrigin({index: null}));
        setTimeout(() => this.shouldSeeSummary = true)
      }
    })
  }


  summarizeText() {
    if(!this.shouldSummary) {
      return;
    }
    this.goodSummary = true;
    this.summary = null;

    this.store.select(selectHighlightTexts).pipe(take(1)).subscribe(highlightTexts => {
      this.highlightTextService.summarizeText(this.textFormGroup.value.text, JSON.stringify(highlightTexts)).pipe(take(1)).subscribe((summary: {summaryText: string, summaryId: string, alignment: any} )=> {
        const temp = this.removeUnrelevantSentencesFromSummary(highlightTexts, {...summary});
        this.summary = temp;
        this.store.dispatch(updateSentencesIndexes({indexes: temp.alignment.sentencesIndexes}));
        this.store.dispatch(updateSentencesOriginIndexes({indexes: temp.alignment.sentencesOriginIndexes}));
        this.shouldSummary = false;
      });
    })
  }

  removeUnrelevantSentencesFromSummary(highlightTexts: any, summary: any) {
    let lastIndex = -1;
    for(let i=0; i < summary.alignment.sentencesOriginIndexes.length; i++) {
      if(this.intersecting(summary.alignment.sentencesOriginIndexes[i], highlightTexts)) {
        lastIndex = i;
      }
    }
    if(lastIndex  < 0) {
      return summary;
    }
    const lastChar = summary.alignment.sentencesIndexes[lastIndex][1]
    summary.summaryText = summary.summaryText.slice(0, lastChar+1);
    summary.alignment.sentencesIndexes.splice(lastIndex+1)
    summary.alignment.sentencesOriginIndexes.splice(lastIndex+1)
    return summary;
  }

  intersecting(targetRanges: [number, number][], ranges: [number, number][]): boolean {
    for (const targetRange of targetRanges) {
      for (const range of ranges) {
        if (targetRange[0] <= range[1] && targetRange[1] >= range[0]) {
          // Ranges intersect
          return true;
        }
      }
    }
  
    // No intersection found
    return false;
  }

  saveToDB() {
    this.store.select(selectHighlightTexts).pipe(take(1)).subscribe(highlightTexts => {
      this.store.select(selectMissingHighlightTexts).pipe(take(1)).subscribe(missingHighlightTexts => {
        this.store.select(selectUnnecessaryHighlightTexts).pipe(take(1)).subscribe(unnecessaryHighlightTexts => {
          this.highlightTextService.saveToDB(this.textFormGroup.value.text, JSON.stringify(highlightTexts), this.summary.summaryText, this.summary.summaryId, this.goodSummary, JSON.stringify(unnecessaryHighlightTexts), JSON.stringify(missingHighlightTexts)).pipe(take(1)).subscribe(x=> this.done = true);
        })
      })  
    })
  }

  startWriting() {
    this.started = true;
    setTimeout(() => {
      const element = document.getElementById('droppable')
      element.addEventListener("dragenter", (event) => {
        event.preventDefault();
      });
    
      element.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
    
      element.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if(files.length == 0 ){
          return;
        }
        e.preventDefault();

        const reader = new FileReader();
        const x = this.textFormGroup
        reader.onload = function (event) {
          // The file content will be available in event.target.result
          const fileContent = event.target.result;
          x.setValue({text: fileContent.toString().replaceAll('\xa0', ' ')})
          // You can perform further operations with the file content here
        };
    
        reader.onerror = function (event) {
          console.error("Error reading the file:", event.target.error);
        };
    
        // Start reading the file as text

        reader.readAsText(files[0]);
      })

      const element2 = document.getElementById('droppable2')
      element2.addEventListener("dragenter", (event) => {
        event.preventDefault();
      });
    
      element2.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
    
      element2.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if(files.length == 0 ){
          return;
        }
        e.preventDefault();

        const reader = new FileReader();
        const x = this.textFormGroup
        reader.onload = function (event) {
          // The file content will be available in event.target.result
          const fileContent = event.target.result;
          x.setValue({text: fileContent.toString().replaceAll('\xa0', ' ')})
          // You can perform further operations with the file content here
        };
    
        reader.onerror = function (event) {
          console.error("Error reading the file:", event.target.error);
        };
    
        // Start reading the file as text

        reader.readAsText(files[0]);
    
      })
    }, 500);

  }

  async handleFileInput(files: any) {
    const file = files.target.files.item(0) as File;

    let text;
    if(this.isDocxFile(file.name)) {
      text = await this.docxReaderService.readDocx(file);
    } else {
      text = await file.text();

    }
    this.textFormGroup.get('text').setValue(text.replaceAll('\xa0', ' '));
    this.cdr.detectChanges();
    
  }

  isDocxFile(fileName: string): boolean {
    const fileExtension = fileName.split('.').pop().toLowerCase();
    return fileExtension === 'docx';
  }

  saveToFile() {
    const fileName = `summary-${new Date().toDateString()}`;
    const text =  this.finalSummary;
    const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    saveAs(blob, fileName);
  }

  saveSummaryText(summary: string) {
    this.finalSummary = summary;
  }

  logoReset() {
    if(!this.started) {

    } else {
      if(this.startedHighlighting && !this.flag) {
        this.resetAllBeforeSummary();
      } else {
        if(this.summary) {
          this.resetAllAfterSummary();
        } else {
          this.started = false;
        }
      }
    }
  }

  finish() {
    this.resetAllAfterSummary();
  }
}
