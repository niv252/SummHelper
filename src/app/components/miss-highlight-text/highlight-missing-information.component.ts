import { Component, Input, OnInit, ViewChild, ElementRef, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, take } from 'rxjs';
import { missingReset } from 'src/app/actions/miss-highlight-text.actions';
import { highlightTextState, selectHighlightTexts } from 'src/app/reducers/highlight-text.reducrs';
import { MissinghighlightTextState, selectCurrentOriginBold, selectCurrentOriginHighlight, selectMissingHighlightTexts, selectMissingIsInEraseMode, selectSentencesOriginIndexes } from 'src/app/reducers/miss-highlight-text.reducer';
import { selectUnnecessaryIsInEraseMode } from 'src/app/reducers/unn-highlight-text.reducer';

@Component({
  selector: 'app-highlight-missing-information',
  templateUrl: './highlight-missing-information.component.html',
  styleUrls: ['./highlight-missing-information.component.less']
})
export class HighlightMissingInformationComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('highlightContainer3', {static: true}) highlightContainer3: ElementRef;
  @ViewChild('mainContainer3', {static: true}) mainContainer3: ElementRef;

  @Input() text: string;
  @Input() highlightColor: string;
  @Input() tempHighlightColor: string;
  @Input() summaryHighlightColor: string;
  @Input() alignSentIndexes: any;
  @Input() alignOriginIndexes: any;

  markMode = true;
  eraseMarkMode = false;

  textWordsIndexes: number[];
  textSpacesIndexes: number[];
  textHighlightStart: number;
  lastHighlightedWordId: Number;

  newHighlightWordIndexes: number[] = []
  highlightWordIndexesToRemove: number[] = []

  highlightTexts$;
  summaryHighlightTexts$;
  onDestroy$: Subject<void>;
  isInEraseMode: any;
  originColor = 'rgb(173, 216, 230)';
  constructor(private store:Store<MissinghighlightTextState | highlightTextState>) {
    this.onDestroy$ = new Subject();
    this.summaryHighlightTexts$ = this.store.select(selectHighlightTexts)
    this.highlightTexts$ = store.select(selectMissingHighlightTexts);
    store.select(selectMissingIsInEraseMode).subscribe(x => this.isInEraseMode = x);
    store.select(selectCurrentOriginHighlight).subscribe(currentIndex => {
      if(currentIndex === null) {
        if(this.textSpacesIndexes) {
          this.clearAllHighlightsInRange([0, 1000000]);
        }
        return;
      }
      store.select(selectSentencesOriginIndexes).pipe(take(1)).subscribe(indexes => {
        this.summaryHighlightTexts$.pipe(take(1)).subscribe(highlightTexts => {
          this.clearAllHighlightsInRange([0, 1000000])
          indexes[currentIndex].forEach((range: any) => this.highlightAllElementsInRange(range, this.originColor));
          let found = false;
          indexes[currentIndex].forEach((range: any) => {
            if(this.intersecting(range, highlightTexts)) {
              let temp = this.textWordsIndexes.find(x => x >= range[0]);
              if(temp !== null && temp >= 0) {
                found = true;
                document.getElementById(`mword${temp}`).scrollIntoView({behavior: 'smooth', block: 'center'});
                return;
              }
            }
          });
          if(!found) {
            const temp = this.textWordsIndexes.find(x => x >= indexes[currentIndex]?.[0]?.[0]);
            if(temp !== null && temp >= 0) {
              document.getElementById(`mword${temp}`).scrollIntoView({behavior: 'smooth', block: 'center'})
            }
          }     
        });
      })
    });
    store.select(selectCurrentOriginBold).subscribe(currentIndex => {
      if(currentIndex === null) {
        if(this.textSpacesIndexes) {
          this.clearAllBoldsInRange([0, 1000000]);
        }
        return;
      }
      store.select(selectSentencesOriginIndexes).pipe(take(1)).subscribe(indexes => {
        this.clearAllBoldsInRange([0, 10000000])
        indexes[currentIndex].forEach((range: any) => this.boldAllElementsInRange(range, this.originColor));
      })
    });
    store.select(selectUnnecessaryIsInEraseMode).subscribe(x => {if (this.textWordsIndexes) {          
      this.clearAllHighlightsInRange([0, 1000000]);
    }});
  }

  intersecting(targetRange: [number, number], ranges: [number, number][]): boolean {
      for (const range of ranges) {
        if (targetRange[0] <= range[1] && targetRange[1] >= range[0]) {
          // Ranges intersect
          return true;
        }
      }
  
    // No intersection found
    return false;
  }

  ngOnInit() {
    this.generateTextToHighlight();
  }

  ngOnChanges(changes: SimpleChanges) {
    if(!changes['text'].firstChange) {
    this.generateTextToHighlight();
    }
  }

  generateTextToHighlight() {
    this.markMode = false;
    this.eraseMarkMode = false;

    this.highlightContainer3.nativeElement.innerHTML = '';
    let innerHTML = '';
    let start = -1;
    let end = 0
    this.textWordsIndexes =  []
    this.textSpacesIndexes =  []
    this.store.dispatch(missingReset())
    this.textHighlightStart = null;

    for (; end < this.text.length; end++) {
      if(this.text[end] === ' ') {
        if(this.text.substring(start, end) !== ' ') {
          if(start+1 === 0) {
            innerHTML += `<span class="editable-span" id=mword${start+1} name=mword${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
          }
          else {
            if(this.text[start] === ' ') {
              this.textSpacesIndexes.push(start)
              innerHTML += `<span id=mspace${start}>&nbsp</span>`

            }
            innerHTML += `<span class="editable-span" id=mword${start+1} name=mword${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
          }
          this.textWordsIndexes.push(start + 1);

        } else {
          innerHTML += `<span id=mspace${end-1}>&nbsp</span>`
          this.textSpacesIndexes.push(end-1)
        }
        start = end;
      }
      if(this.text[end] === '\n') {
        if(start+1 === 0) {
          innerHTML += `<span class="editable-span" id=mword${start+1} name=mword${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
          this.textWordsIndexes.push(start + 1);
        }
        else {
          if(this.text[end-1] === '\n') {
            innerHTML += '<br>'
          } else {
            if(this.text[start] === ' ') {
                innerHTML += `<span id=mspace${start}>&nbsp</span>`;
                this.textSpacesIndexes.push(start)
            }
          innerHTML += `<span class="editable-span" id=mword${start+1} name=mword${end-1}>${this.text.substring(start, end).replace(' ', '')}</span><br>`
          this.textWordsIndexes.push(start + 1);
          }
        }
        start = end
      }
    }
    if(this.text.length !== start + 1) {
      this.textWordsIndexes.push(start + 1);
    }


    innerHTML += (this.text[start] === ' ' ? `<span id=mspace${start}>&nbsp</span>`: '')+`<span class="editable-span" id=mword${start+1} name=word${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
    this.highlightContainer3.nativeElement.innerHTML = innerHTML;
    this.text[start] === ' ' ? this.textSpacesIndexes.push(start) : null;
    this.summaryHighlightTexts$.pipe(take(1)).subscribe(x => {
      x.forEach(range => this.highlightAllElementsInRange(range, this.summaryHighlightColor))
    })
    this.mainContainer3.nativeElement.onmouseup = (e: any) => { 
      e.stopPropagation();
      if(this.lastHighlightedWordId && this.markMode && !this.isInEraseMode) {
        this.markMode = false;
        let range;
        if (Number(this.textHighlightStart) < Number(document.getElementById(`mword${this.lastHighlightedWordId}`).getAttribute('name').replace('mword', ''))) {
          range = [Number(this.textHighlightStart), Number(document.getElementById(`mword${this.lastHighlightedWordId}`).getAttribute('name').replace('mword', ''))];
        } else {
          range = [Number(this.lastHighlightedWordId), Number(document.getElementById(`mword${this.textHighlightStart}`).getAttribute('name').replace('mword', ''))];
        }
      } else {
        if(this.isInEraseMode) {
          this.eraseMarkMode = false;
          this.summaryHighlightTexts$.pipe(take(1)).subscribe(x => 
            {
                x.forEach((range: any) => {
                  this.highlightAllElementsInRange(range, this.summaryHighlightColor)
                })
            });
        }
      }
    }

    this.highlightContainer3.nativeElement.onmouseup = (e: any) => {
      if(this.lastHighlightedWordId && this.markMode && !this.isInEraseMode) {
        this.markMode = false;
        let range;
        if (Number(this.textHighlightStart) < Number(document.getElementById(`mword${this.lastHighlightedWordId}`).getAttribute('name').replace('mword', ''))) {
          range = [Number(this.textHighlightStart), Number(document.getElementById(`mword${this.lastHighlightedWordId}`).getAttribute('name').replace('mword', ''))];
        } else {
          range = [Number(this.lastHighlightedWordId), Number(document.getElementById(`mword${this.textHighlightStart}`).getAttribute('name').replace('mword', ''))];
        }
      } else {
        if(this.isInEraseMode) {
          this.eraseMarkMode = false;
          this.summaryHighlightTexts$.pipe(take(1)).subscribe(x => 
            {
                x.forEach((range: any) => {
                  this.highlightAllElementsInRange(range, this.summaryHighlightColor)
                })
            });
        }
      }
    }
  }

  highlightAllElementsInRange(range: any, color: string) {
    this.textWordsIndexes.forEach((index: number) => {
      if(index >= range[0] && index <= range[1]) {
        document.getElementById(`mword${index}`).style.background = color; 
      }
    })

    this.textSpacesIndexes.forEach((index: number) => {
      if(index >= range[0] && index <= range[1]) {
        document.getElementById(`mspace${index}`).style.background = color; 
      }
    })
  }

  boldAllElementsInRange(range: any, color: string) {
    this.textWordsIndexes.forEach((index: number) => {
      if(index >= range[0] && index <= range[1]) {
        document.getElementById(`mword${index}`).style.textShadow = '0 0 0.8px black'; 
      }
    })
  }

  isWordIdAlreadyHighlighted(highlightTexts: any, wordId: number): boolean {
    let isHighlighted = false;
    highlightTexts.forEach((range: any)=> {
      if(wordId >= range[0] && wordId <= range[1]) {
        isHighlighted = true;
      }
    });
    return isHighlighted;
  }

  clearAllHighlightsInRange(range: any) {
    this.summaryHighlightTexts$.pipe(take(1)).subscribe(highlightText => {
      this.textWordsIndexes.forEach((index: number) => {
        if((index >= range[0] && index <= range[1]) && (document.getElementById(`mword${index}`).style.background === this.highlightColor || document.getElementById(`mword${index}`).style.background === this.originColor)) {  
          if(this.isWordIdAlreadyHighlighted(highlightText, index)) {
              document.getElementById(`mword${index}`).style.background = this.summaryHighlightColor; 
            }
            else {
              document.getElementById(`mword${index}`).style.background = ''; 
            }  
          }
      })
  
      this.textSpacesIndexes.forEach((index: number) => {
        if((index >= range[0] && index <= range[1]) && (document.getElementById(`mspace${index}`).style.background === this.highlightColor || document.getElementById(`mspace${index}`).style.background === this.originColor)) {
          if(this.isWordIdAlreadyHighlighted(highlightText, index)) {
            document.getElementById(`mspace${index}`).style.background = this.summaryHighlightColor; 
          }
          else {
            document.getElementById(`mspace${index}`).style.background = ''; 
          }  
        }
      })
    });
  }


  clearAllBoldsInRange(range: any) {
    this.textWordsIndexes.forEach((index: number) => {
      if((index >= range[0] && index <= range[1])) {  
        document.getElementById(`mword${index}`).style.textShadow = 'none'; 
      }
    })
  }

  ngOnDestroy() {
    this.onDestroy$.next();
  }
}
