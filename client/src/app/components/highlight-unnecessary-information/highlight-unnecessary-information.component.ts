import { Component, Input, OnInit, ViewChild, ElementRef, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, take, takeUntil, timer } from 'rxjs';
import { boldOrigin, highlightOrigin, updateSentencesOriginIndexes } from 'src/app/actions/miss-highlight-text.actions';
import { unnecessaryReset, unnecessarySnapshotHistory, updateSentencesIndexesWithoutInitial } from 'src/app/actions/unn-highlight-text.actions';
import { selectHighlightTexts } from 'src/app/reducers/highlight-text.reducrs';
import { UnnecessaryhighlightTextState, selectSentencesIndexes, selectUnnecessaryHighlightTexts, selectUnnecessaryIsInEraseMode, selectUnnecessaryLastHighlight, selectUnnecessaryShouldRegenerate } from 'src/app/reducers/unn-highlight-text.reducer';
import { HighlightTextService } from 'src/app/services/highlight-text.service';

@Component({
  selector: 'app-highlight-unnecessary-information',
  templateUrl: './highlight-unnecessary-information.component.html',
  styleUrls: ['./highlight-unnecessary-information.component.less']
})
export class HighlightUnnecessaryInformationComponent implements OnInit, OnChanges {
  @ViewChild('highlightContainer2', {static: true}) highlightContainer2: ElementRef;
  @ViewChild('mainContainer2', {static: true}) mainContainer2: ElementRef;

  @Input() text: string;
  @Input() originalText: string;

  @Input() highlightColor: string;
  @Input() tempHighlightColor: string;
  @Output() summaryChanged: EventEmitter<string> = new EventEmitter();
  @Output() finishEmitter: EventEmitter<void> = new EventEmitter();

  markMode = true;
  eraseMarkMode = false;
  shouldEditable = false;
  isMouseDown = false;
  textWordsIndexes: number[];
  textSpacesIndexes: number[];
  textEnterIndexes: number[];
  lastTextWordsIndexes: number[];
  lastTextSpacesIndexes: number[];
  lastTextEnterIndexes: number[];

  textHighlightStart: number;
  lastHighlightedWordId: Number;

  newHighlightWordIndexes: number[] = []
  highlightWordIndexesToRemove: number[] = []

  highlightTexts$;
  onDestroy$: Subject<void>;
  isInEraseMode: any;
  isDrag = false;
  textToSnapshot: string;
  isEnter = false;
  sentencesIndexes$;
  sentenceColor = 'rgb(173, 216, 230)';
  selectedSentenceIndex: number = null;
  currentHoveredSentence: number = null;
  sentencesIndexes: any;
  lastTimeEdited: number = 1;
  shouldGetAlignment = false;
  lastCaretPosition: any = null;
  lastText: any = null;
  caretData: any = null;
  constructor(private store:Store<UnnecessaryhighlightTextState>, private highlightService: HighlightTextService) {
    this.onDestroy$ = new Subject();
    this.highlightTexts$ = store.select(selectUnnecessaryHighlightTexts);
    this.sentencesIndexes$ = store.select(selectSentencesIndexes);
    this.sentencesIndexes$.subscribe(sentencesIndexes =>  {this.sentencesIndexes = sentencesIndexes;});
    store.select(selectUnnecessaryLastHighlight).pipe(takeUntil(this.onDestroy$)).subscribe(x => {
      this.store.dispatch(highlightOrigin({index: null}));

      store.select(selectUnnecessaryHighlightTexts).pipe(take(1)).subscribe(y => {
        if(y.length === 0 && this.text) {
          this.clearAllHighlightsInRange([0, this.text?.length || 1000000])
        }
        if(!x) {
          return;
        }
        if(x.length > 0) {
          this.text = x[0].text;
          this.lastCaretPosition = null;
          this.caretData = null;
          this.generateTextToHighlight(false, true);
        }
      })
    })
    store.select(selectUnnecessaryIsInEraseMode).subscribe(x => {if (this.textWordsIndexes)this.clearAllHighlightsInRange([0, 1000000])});
  }

  ngOnInit() {
    this.generateTextToHighlight();
    timer(0, 500).subscribe(() => {
      if(this.shouldGetAlignment) {
        if(Date.now() - this.lastTimeEdited > 1000) {
          this.shouldGetAlignment = false;
          this.text = this.highlightContainer2.nativeElement.innerText.replaceAll('\xa0', ' ').replaceAll('\xAD', '');
          this.store.select(selectHighlightTexts).pipe(take(1)).subscribe(highlightTexts => {
            this.highlightService.getAlignments(this.highlightContainer2.nativeElement.innerText.replaceAll('\xa0', ' ').replaceAll('\xAD', ''), this.originalText, JSON.stringify(highlightTexts)).pipe(take(1)).subscribe(result => {
            this.store.dispatch(updateSentencesIndexesWithoutInitial({indexes: result.alignment.sentencesIndexes}));
            this.store.dispatch(updateSentencesOriginIndexes({indexes: result.alignment.sentencesOriginIndexes}));
            this.text = this.highlightContainer2.nativeElement.innerText.replaceAll('\xa0', ' ').replaceAll('\xAD', '');
            if(!this.isEnter) {
              this.saveCaretPosition();
            }
            this.generateTextToHighlight(false, false);
            });
          });
        }
      }
    })
  }

  ngOnChanges(changes: SimpleChanges) {
    if(!changes['text'].firstChange) {
      this.generateTextToHighlight();
    }
  }

  generateTextToHighlight(shouldReset = true, shouldHistory = true, selectedSentenceToHighlight: number = null) {
    this.markMode = false;
    this.eraseMarkMode = false;
    this.isDrag = false;

    this.highlightContainer2.nativeElement.innerHTML = '';
    let innerHTML = '<span contenteditable id="new" style="outline: 0; z-index: 2000000; position:relative; cursor: text; display:inline-block; word-wrap:break-word !important;">';
    let start = -1;
    let end = 0

    if(this.textWordsIndexes !== undefined && this.textSpacesIndexes !== undefined && shouldHistory ) {
      this.lastTextSpacesIndexes = [...this.textSpacesIndexes];    
      this.lastTextWordsIndexes = [...this.textWordsIndexes];
      this.lastTextEnterIndexes = [...this.textEnterIndexes];
    }
    this.textWordsIndexes =  []
    this.textSpacesIndexes =  []
    this.textEnterIndexes = []
    this.selectedSentenceIndex = null;
    this.currentHoveredSentence = null;
    shouldReset ? this.store.dispatch(unnecessaryReset()) : null
     this.store.dispatch(highlightOrigin( {index: null}))

    this.textHighlightStart = null;
    for (; end < this.text.length; end++) {
      if(this.text[end] === ' ') {
        if(this.text.substring(start, end) !== ' ') {
          if(start+1 === 0) {
            innerHTML += `<span class="word" id=uword${start+1} name=uword${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`

            this.textWordsIndexes.push(start + 1);
          }
          else {
            if(this.text[start] === ' ') {
              innerHTML += `<span class="word" id=uspace${start}>&nbsp</span>`
              this.textSpacesIndexes.push(start)

            }
            if(start+1 <= end-1) {
              innerHTML += `<span class="word" id=uword${start+1} name=uword${end-1}>${this.text.substring(this.text[start] === ' ' ? start : start +1, end).replace(' ', '')}</span>`
              this.textWordsIndexes.push(start + 1);
            }
          }

        } else {
          innerHTML += `<span class="word" id=uspace${end-1}>&nbsp</span>`
          this.textSpacesIndexes.push(end-1)
        }
        start = end;
      }
      if(this.text[end] === '\n') {
        if(start+1 === 0) {
          innerHTML += `<span class="word" id=uword${start+1} name=uword${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
          this.textWordsIndexes.push(start + 1);
        }
        else {
          if(this.text[end-1] === '\n') {
            innerHTML += `<span id=uenter${start+1}><br></span>`
            this.textEnterIndexes.push(start+1);
          } else {
            if(this.text[start] === ' ') {
                innerHTML += `<span class="word" id=uspace${start}>&nbsp</span>`;
                this.textSpacesIndexes.push(start)
            }

            if(start+1 <= end-1) {
              innerHTML += `<span class="word" id=uword${start+1} name=uword${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
              this.textWordsIndexes.push(start + 1);

            }
          innerHTML += `<span id=uenter${end}><br></span>`
          this.textEnterIndexes.push(end);
          }
        }
        start = end
      }
    }
    if(this.text.length !== start + 1) {
      this.textWordsIndexes.push(start + 1);
    }


    innerHTML += (this.text[start] === ' ' ? `<span class="word" id=uspace${start}>&nbsp</span>`: '')+`<span class="test" id=uword${start+1} name=uword${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
    innerHTML += '</span>'
    if(this.lastTextSpacesIndexes === undefined && this.lastTextWordsIndexes === undefined) {
      this.lastTextSpacesIndexes = [...this.textSpacesIndexes];    
      this.lastTextWordsIndexes = [...this.textWordsIndexes]
      this.lastTextEnterIndexes = [...this.textEnterIndexes];
    }
    this.highlightContainer2.nativeElement.innerHTML = innerHTML;
    this.selectedSentenceIndex = selectedSentenceToHighlight;
    this.store.dispatch(highlightOrigin( {index: selectedSentenceToHighlight}))
    this.highlightAllElementsInRange(this.sentencesIndexes[selectedSentenceToHighlight], this.sentenceColor);
    this.summaryChanged.emit(this.highlightContainer2.nativeElement.innerText);
    this.textToSnapshot = this.highlightContainer2.nativeElement.innerText;
    this.text[start] === ' ' ? this.textSpacesIndexes.push(start) : null;
    this.lastText = this.highlightContainer2.nativeElement.innerText.replaceAll('\xa0', ' ');

    this.highlightContainer2.nativeElement.onmouseleave = (e: any) => {
      this.clearAllBoldsInRange([0, 1000000]);
      this.currentHoveredSentence = null;
      this.store.dispatch(boldOrigin({index: null}));
    }

    const newContainer = document.getElementById(`new`);

    newContainer.addEventListener('paste', (event: any) => {
      event.preventDefault();
      const clipboardData = event.clipboardData || (window as any).clipboardData;
      const pastedText = clipboardData.getData('text/plain');
      const sanitizedText = pastedText.slice(0, pastedText.length);
      document.execCommand('insertText', false, sanitizedText);
      this.sentencesIndexes$.pipe(take(1)).subscribe(indexes => this.store.dispatch(unnecessarySnapshotHistory({text: this.textToSnapshot, sentencesIndexes: indexes})));
      this.textToSnapshot = this.highlightContainer2.nativeElement.innerText;
      this.lastTimeEdited = Date.now();
      this.shouldGetAlignment = true;
      });

  newContainer.oninput = (event: any) => {
      event.preventDefault();
      if(event.data === ' ') {
        this.sentencesIndexes$.pipe(take(1)).subscribe(indexes => this.store.dispatch(unnecessarySnapshotHistory({text: this.textToSnapshot, sentencesIndexes: indexes})));
        this.textToSnapshot = this.highlightContainer2.nativeElement.innerText;
      } else {
        if(event.inputType === 'deleteContentBackward') {
          this.sentencesIndexes$.pipe(take(1)).subscribe(indexes => this.store.dispatch(unnecessarySnapshotHistory({text: this.textToSnapshot, sentencesIndexes: indexes})));
          this.textToSnapshot = this.highlightContainer2.nativeElement.innerText;
        } else {
          if(event.inputType === 'deleteContentForward') {
            this.sentencesIndexes$.pipe(take(1)).subscribe(indexes => this.store.dispatch(unnecessarySnapshotHistory({text: this.textToSnapshot, sentencesIndexes: indexes})));
            this.textToSnapshot = this.highlightContainer2.nativeElement.innerText;
          } else {
            if(event.inputType === 'deleteByDrag') {
              this.sentencesIndexes$.pipe(take(1)).subscribe(indexes => this.store.dispatch(unnecessarySnapshotHistory({text: this.textToSnapshot, sentencesIndexes: indexes})));
              this.textToSnapshot = this.highlightContainer2.nativeElement.innerText;
            }
          }
        }
      }
      if(event.inputType === 'insertParagraph') {
        this.isEnter = true;
        this.caretData = null;        
      } else {
        this.isEnter = false;
      }

      this.saveCaretPosition()
      this.lastTimeEdited = Date.now();

      this.shouldGetAlignment = true;
  };

    this.textSpacesIndexes.forEach((spaceIndex: number) => {
      const element = document.getElementById(`uspace${spaceIndex}`);
      element.onclick = (e: any) => {
        this.clearAllHighlightsInRange([0, 1000000000]);
        const sentenceIndex = this.getSentenceIndex(Number(element.id.replace('uspace', '')));
        if(this.selectedSentenceIndex === null || this.selectedSentenceIndex !== sentenceIndex) {
          this.selectedSentenceIndex = sentenceIndex;
          this.highlightAllElementsInRange(this.sentencesIndexes[sentenceIndex], this.sentenceColor);

        } else {
          this.selectedSentenceIndex = null;
          this.clearAllHighlightsInRange([0, 1000000000]);
        }

        this.store.dispatch(highlightOrigin({index: null}));

        if(this.selectedSentenceIndex !== null && this.sentencesIndexes && this.sentencesIndexes[sentenceIndex] !== undefined) {
          this.store.dispatch(highlightOrigin({index: sentenceIndex}));
        }
      };

      element.onmouseenter = (e: any) => {
        this.store.dispatch(boldOrigin({index: null}));
        const sentenceIndex = this.getSentenceIndex(Number(element.id.replace('uspace', '')));
        this.store.dispatch(boldOrigin({index: sentenceIndex}));
        this.currentHoveredSentence = sentenceIndex;
        this.clearAllBoldsInRange([0, 1000000]);
        if(this.sentencesIndexes && this.sentencesIndexes[sentenceIndex] !== undefined) {
          this.boldAllElementsInRange(this.sentencesIndexes[sentenceIndex], null);
        }
      }
    });
    this.textWordsIndexes.forEach((wordIndex: number) => {
      const element = document.getElementById(`uword${wordIndex}`);
      this.registerEventsToElement(element)
    })
    if(this.caretData !== null) {
      setTimeout(() => this.restoreCaretPosition());
    }
  
  }

  boldAllElementsInRange(range: any, color: string) {
    this.textWordsIndexes.forEach((index: number) => {
      if(index >= range[0] && index <= range[1]) {
        if(document.getElementById(`uword${index}`)) {
          document.getElementById(`uword${index}`).style.textShadow = '0 0 0.8px black'; 
        }
      }
    })
  }

  clearAllBoldsInRange(range: any) {
    this.textWordsIndexes.forEach((index: number) => {
      if((index >= range[0] && index <= range[1])) {  
        if(document.getElementById(`uword${index}`)) {
          document.getElementById(`uword${index}`).style.textShadow = 'none'; 

        }
      }
    })
  }

  getSentenceIndex(wordIndex: number): any {
    if(!this.sentencesIndexes) {
      return null;
    }
    for(let i=0; i < this.sentencesIndexes.length;i++) {
      if(wordIndex >= this.sentencesIndexes[i][0] && wordIndex <= this.sentencesIndexes[i][1]) {
        return i;
      }
    }
    return null;
  }

  highlightAllElementsInRange(range: any, color: string) {
    if(!range) {
      return;
    }
    this.textWordsIndexes.forEach((index: number) => {
      if(document.getElementById(`uword${index}`) && index >= range[0] && index <= range[1] && document.getElementById(`uword${index}`).style.background !== this.highlightColor) {
        document.getElementById(`uword${index}`).style.background = color; 
      }
    })

    this.textSpacesIndexes.forEach((index: number) => {
      if(document.getElementById(`uspace${index}`) && index >= range[0] && index <= range[1] && document.getElementById(`uspace${index}`).style.background !== this.highlightColor) {
        document.getElementById(`uspace${index}`).style.background = color; 
      }
    })
  }

  clearAllHighlightsInRange(range: any) {
    this.textWordsIndexes.forEach((index: number) => {
    if((index >= range[0] && index <= range[1])) {
      if(document.getElementById(`uword${index}`)) {
        document.getElementById(`uword${index}`).style.background = ''; 
      }
      }
    })

    this.textSpacesIndexes.forEach((index: number) => {
      if((index >= range[0] && index <= range[1])) {
        if( document.getElementById(`uspace${index}`)) {
          document.getElementById(`uspace${index}`).style.background = ''; 
        }
      }
    })
  }

  ngOnDestroy() {
    this.onDestroy$.next();
  }


  registerEventsToElement(element: HTMLElement) {
    element.onclick = (e: any) => {
      const sentenceIndex = this.getSentenceIndex(Number(element.id.replace('uword', '')));
      this.clearAllHighlightsInRange([0, 1000000000]);

      if(this.selectedSentenceIndex === null || this.selectedSentenceIndex !== sentenceIndex) {
        this.selectedSentenceIndex = sentenceIndex;
        this.highlightAllElementsInRange(this.sentencesIndexes[sentenceIndex], this.sentenceColor);
      } else {
        this.selectedSentenceIndex = null;
        this.clearAllHighlightsInRange([0, 1000000000]);
      }

      this.store.dispatch(highlightOrigin({index: null}));
      
      if(this.selectedSentenceIndex !== null && this.sentencesIndexes && this.sentencesIndexes[sentenceIndex] !== undefined) {
        this.store.dispatch(highlightOrigin({index: sentenceIndex}));
        this.highlightAllElementsInRange(this.sentencesIndexes[sentenceIndex], this.sentenceColor);
      }
 
    };
    element.onmouseenter = (e: any) => {
      this.store.dispatch(boldOrigin({index: null}));
      const sentenceIndex = this.getSentenceIndex(Number(element.id.replace('uword', '')));
      this.store.dispatch(boldOrigin({index: sentenceIndex}));
      this.currentHoveredSentence = sentenceIndex;
      this.clearAllBoldsInRange([0, 1000000]);
      if(this.sentencesIndexes && this.sentencesIndexes[sentenceIndex] !== undefined) {
        this.boldAllElementsInRange(this.sentencesIndexes[sentenceIndex], null);
      }
    }


    element.onmousedown = (e: any) => {
      this.isMouseDown = true;
    }
    element.onmousemove = (e: any) => {
      if(!this.markMode) {
        return;
      }
      if(element.contentEditable !== "false" as any) {
        if(!this.isInEraseMode) {
          this.isDrag = true;
        }
      }
      element.contentEditable = false as any;
    }
    element.onmouseup = (e: any) => {
      this.isMouseDown = false;
    }
  }


  finish() {
    this.finishEmitter.emit();
  }

  saveCaretPosition() {
    const r = document.getSelection().getRangeAt(0)
    const node = r.startContainer
    const offset = r.startOffset
    const pageOffset = {x:window.pageXOffset, y:window.pageYOffset}
    let rect,  r2;

    if (offset > 0) {
        r2 = document.createRange()
        r2.setStart(node, (offset - 1))
        r2.setEnd(node, offset)
        rect = r2.getBoundingClientRect()
        this.caretData = { left:rect.right + pageOffset.x, top:rect.bottom + pageOffset.y -10 };
      }
    }

  restoreCaretPosition() {
    if(this.caretData === null || this.caretData === undefined) {
      return;
    }
    let sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(document.caretRangeFromPoint(this.caretData.left, this.caretData.top));
  }
}