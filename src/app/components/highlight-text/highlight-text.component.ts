import { Component, Input, OnInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { highlightText, removeWordsFromHighlightedText, reset, toggleInitialHighlightMode } from 'src/app/actions/highlight-text.actions';
import { highlightTextState, selectHighlightTexts, selectIsInEraseMode, selectIsInInitalHighlightMode, selectLastHighlight, selectShouldRegenerate } from 'src/app/reducers/highlight-text.reducrs';

@Component({
  selector: 'app-highlight-text',
  templateUrl: './highlight-text.component.html',
  styleUrls: ['./highlight-text.component.less']
})
export class HighlightTextComponent implements OnInit, OnChanges {
  @ViewChild('highlightContainer', {static: true}) highlightContainer: ElementRef;
  @ViewChild('mainContainer', {static: true}) mainContainer: ElementRef;

  @Input() text: string;
  @Input() highlightColor: string;
  @Input() tempHighlightColor: string;
  @Input() initialHighlightColor: string;
  @Input() initialHighlightIndexes: any;

  markMode = true;
  eraseMarkMode = false;
  origInitialHighlightIndexes: any;
  textWordsIndexes: number[];
  textSpacesIndexes: number[];
  textHighlightStart: number;
  lastHighlightedWordId: Number;

  newHighlightWordIndexes: number[] = []
  highlightWordIndexesToRemoveStart: number = null;
  lastWordToRemove: number = null;
  highlightTexts$;
  isInEraseMode: any;
  isInInitalHighlightMode: any;
  badgesToDelete: any = [];
  constructor(private store:Store<highlightTextState>) {
    this.highlightTexts$ = store.select(selectHighlightTexts);
    store.select(selectShouldRegenerate).subscribe(x => {
      if(x && this.textWordsIndexes) {
        this.clearAllHighlightsInRange([0, 1000000000])
      }
    });
    this.highlightTexts$.subscribe(x => 
      {
          x.forEach((range: any) => {
            this.highlightAllElementsInRange(range, this.highlightColor)
          })
      });
    store.select(selectLastHighlight).subscribe(x => {
      store.select(selectHighlightTexts).pipe(take(1)).subscribe(y => {
        if(!x) {
          return;
        }
        this.getElementsNotInBothArrays(x, y).forEach((range: any) => this.clearAllHighlightsInRange(range));
        y.forEach((range: any) => this.highlightAllElementsInRange(range, this.highlightColor))
      })

    })
    store.select(selectIsInEraseMode).subscribe(x => this.isInEraseMode = x);
    store.select(selectIsInInitalHighlightMode).subscribe(x => {
      if(this.origInitialHighlightIndexes) {
        this.initialHighlightIndexes = this.origInitialHighlightIndexes;

      }
      this.isInInitalHighlightMode = x;
      if(x === true) {
        this.badgesToDelete = [];
        this.initialHighlightIndexes.forEach((element: any) => {
          this.highlightAllElementsInRange(element, this.initialHighlightColor)
        });
      } else {
        if(this.textWordsIndexes) {
          this.clearAllInitalHighlightsInRange([0, 10000000]);
        }
      }
    })
  }

  ngOnInit() {
    this.origInitialHighlightIndexes = this.initialHighlightIndexes;

    this.generateTextToHighlight();
  }

  ngOnChanges(changes: SimpleChanges) {
    if(changes['text'].currentValue === '') {
      return;
    }
    this.generateTextToHighlight();
  }

  generateTextToHighlight() {
    this.markMode = false;
    this.eraseMarkMode = false;
    this.highlightContainer.nativeElement.innerHTML = '';
    let innerHTML = '';
    let start = -1;
    let end = 0
    this.textWordsIndexes =  []
    this.textSpacesIndexes =  []
    this.store.dispatch(reset())
    this.textHighlightStart = null;
    for (; end < this.text.length; end++) {
      if(this.text[end] === ' ') {
        if(this.text.substring(start, end) !== ' ') {
          if(start+1 === 0) {
            innerHTML += `<span class='editable-span' id=word${start+1} name=word${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
          }
          else {
            if(this.text[start] === ' ') {
              this.textSpacesIndexes.push(start)
              innerHTML += `<span id=space${start}>&nbsp</span>`
            }
            innerHTML += `<span class='editable-span' id=word${start+1} name=word${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
          }
          this.textWordsIndexes.push(start + 1);

        } else {
          innerHTML += `<span id=space${end-1}>&nbsp</span>`
          this.textSpacesIndexes.push(end-1)
        }
        start = end;
      }
      if(this.text[end] === '\n') {
          if(start+1 === 0) {
            innerHTML += `<span class='editable-span' id=word${start+1} name=word${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
            this.textWordsIndexes.push(start + 1);
          }
          else {
            if(this.text[end-1] === '\n') {
              innerHTML += '<br>'
            } else {
              if(this.text[start] === ' ') {
                  innerHTML += `<span id=space${start}>&nbsp</span>`;
                  this.textSpacesIndexes.push(start)
              }
            innerHTML += `<span class='editable-span' id=word${start+1} name=word${end-1}>${this.text.substring(start, end).replace(' ', '')}</span><br>`
            this.textWordsIndexes.push(start + 1);
            }
          }
          start = end
        }
    }
    if(this.text.length !== start + 1) {
      this.textWordsIndexes.push(start + 1);
    }

    innerHTML += (this.text[start] === ' ' ? `<span id=space${start}>&nbsp</span>`: '')+`<span class="editable-span" id=word${start+1} name=word${end-1}>${this.text.substring(start, end).replace(' ', '')}</span>`
    this.highlightContainer.nativeElement.innerHTML = innerHTML;
    this.text[start] === ' ' ? this.textSpacesIndexes.push(start) : null;

    this.mainContainer.nativeElement.onmouseup = (e: any) => { 
      e.stopPropagation();
      if(this.lastHighlightedWordId !== null && this.lastHighlightedWordId !== undefined && this.markMode && !this.isInEraseMode) {
        this.markMode = false;
        let range;
        if (Number(this.textHighlightStart) < Number(document.getElementById(`word${this.lastHighlightedWordId}`).getAttribute('name').replace('word', ''))) {
          range = [Number(this.textHighlightStart), Number(document.getElementById(`word${this.lastHighlightedWordId}`).getAttribute('name').replace('word', ''))];
        } else {
          range = [Number(this.lastHighlightedWordId), Number(document.getElementById(`word${this.textHighlightStart}`).getAttribute('name').replace('word', ''))];
        }
        this.store.dispatch(highlightText({range}))
      } else {
        if(this.isInEraseMode && this.highlightWordIndexesToRemoveStart && this.lastWordToRemove) {
          this.eraseMarkMode = false;
          this.store.dispatch(removeWordsFromHighlightedText({wordsToRemove: [Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)], wordIndexes: this.textWordsIndexes}));
          this.clearAllHighlightsInRange([Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)]);
          if(this.isInInitalHighlightMode) {
            this.initialHighlightIndexes.forEach((element: any) => {
              this.highlightAllElementsInRange(element, this.initialHighlightColor)
            });
          }
        }
      }
    }

    this.highlightContainer.nativeElement.onmouseup = (e: any) => {
      if(this.lastHighlightedWordId !== null && this.lastHighlightedWordId !== undefined && this.markMode && !this.isInEraseMode) {
        this.markMode = false;
        let range;
        if (Number(this.textHighlightStart) < Number(document.getElementById(`word${this.lastHighlightedWordId}`).getAttribute('name').replace('word', ''))) {
          range = [Number(this.textHighlightStart), Number(document.getElementById(`word${this.lastHighlightedWordId}`).getAttribute('name').replace('word', ''))];
        } else {
          range = [Number(this.lastHighlightedWordId), Number(document.getElementById(`word${this.textHighlightStart}`).getAttribute('name').replace('word', ''))];
        }
        this.store.dispatch(highlightText({range}));
      } else {
        if(this.isInEraseMode) {
          this.eraseMarkMode = false;
          this.store.dispatch(removeWordsFromHighlightedText({wordsToRemove: [Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)], wordIndexes: this.textWordsIndexes}));
          this.clearAllHighlightsInRange([Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)]);
          if(this.isInInitalHighlightMode) {
            this.initialHighlightIndexes.forEach((element: any) => {
              this.highlightAllElementsInRange(element, this.initialHighlightColor)
            });
          }
        }
      }
    }

    this.textSpacesIndexes.forEach((spaceIndex: number) => {
      document.getElementById(`space${spaceIndex}`).onmouseup = (e: any) => {
        e.stopPropagation();
        if(!this.isInEraseMode) {
          this.markMode = false;
        
          let range;
          if (Number(this.textHighlightStart) < spaceIndex) {
            let wordIndex = Math.max(...this.textWordsIndexes.filter(id => id < spaceIndex))
            range = [Number(this.textHighlightStart), Number(document.getElementById(`word${wordIndex}`).getAttribute('name').replace('word', ''))];
          } else {
            let wordIndex = Math.min(...this.textWordsIndexes.filter(id => id > spaceIndex))
            range = [Number(this.textHighlightStart), Number(document.getElementById(`word${wordIndex}`).getAttribute('name').replace('word', ''))];
            range = [Number(wordIndex), Number(document.getElementById(`word${this.textHighlightStart}`).getAttribute('name').replace('word', ''))];
          }
          this.store.dispatch(highlightText({range}))
        } else {
            this.eraseMarkMode = false;
            this.store.dispatch(removeWordsFromHighlightedText({wordsToRemove: [Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)], wordIndexes: this.textWordsIndexes}));
            this.clearAllHighlightsInRange([Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)]);
            if(this.isInInitalHighlightMode) {
              this.initialHighlightIndexes.forEach((element: any) => {
                this.highlightAllElementsInRange(element, this.initialHighlightColor)
              });
            }
          }
      }

      document.getElementById(`space${spaceIndex}`).onmouseenter = (e: any) => {
        this.badgesToDelete.forEach((element: any) => {
          if(spaceIndex >= element.range[0] && spaceIndex <= element.range[1]) {
            if(!this.isInEraseMode) {
              element.badge.style.visibility = 'visible';

            }
          }
        });
      }

      document.getElementById(`space${spaceIndex}`).onmouseleave = (e: any) => {
        this.badgesToDelete.forEach((element: any) => {
          if(spaceIndex >= element.range[0] && spaceIndex <= element.range[1]) {
            element.badge.style.visibility = 'hidden';
          }
        });
      }
    });

    this.textWordsIndexes.forEach((wordIndex: number) => {
      document.getElementById(`word${wordIndex}`).onmouseenter = (e: any) => {
          let range1:any = null;
          for(let i=0;i < this.initialHighlightIndexes.length; i++) {
            if(this.intersecting(wordIndex, this.initialHighlightIndexes[i] as any)) {
              range1 = this.initialHighlightIndexes[i];
            }
          }
          
          if(document.getElementById(`word${wordIndex}`).style.background === this.initialHighlightColor && !this.markMode) {
            let badge = document.getElementById(`badge`).cloneNode(true) as HTMLElement;
            this.badgesToDelete.push({badge, range: range1});
            (badge.childNodes[2] as HTMLElement).onclick = ((e) => {
              e.stopPropagation();


              function isRangeIntersecting(subArray: number[], range: number[]): boolean {
                const [start1, end1] = subArray;
                const [start2, end2] = range;
              
                return start1 <= end2 && end1 >= start2;
              }
              function deleteIntersectingRanges(arr: number[][], range: number[]): number[][] {
                return arr.filter((subArray) => !isRangeIntersecting(subArray, range));
              }

              const highlightsCopy = [...this.initialHighlightIndexes];
              highlightsCopy.sort(compareRanges);
              const y = highlightsCopy.findIndex((x: any) => x[0] === range1[0] && x[1] === range1[1]);
              function compareRanges(a: any, b: any): number {
                return a[0] - b[0];
              }
              const ranges = []
              ranges.push(range1);
              // Sort the ranges array using the custom comparison function
              for(let i=y;i<highlightsCopy.length-1;i++) {
                const temp = [highlightsCopy[i][1], highlightsCopy[i+1][0]]
                const words =  this.textWordsIndexes.filter((x: any) => x > temp[0] && x < temp[1]);
                if (words.length < 1 ) {
                  ranges.push(highlightsCopy[i+1])
                } else {
                  break;
                }
              }
              for(let i=y;i > 0;i--) {
                const temp = [highlightsCopy[i-1][1], highlightsCopy[i][0]]
                const words =  this.textWordsIndexes.filter((x: any) => x > temp[0] && x < temp[1]);
                if (words.length < 1 ) {
                  ranges.push(highlightsCopy[i-1])
                } else {
                  break;
                }
              }
              ranges.sort(compareRanges)
              this.clearAllInitalHighlightsInRange([ranges[0][0], ranges[ranges.length-1][1]]); 

              this.initialHighlightIndexes = [...deleteIntersectingRanges(this.initialHighlightIndexes, [ranges[0][0], ranges[ranges.length-1][1]])];

              badge.remove();
            });
            (badge.childNodes[0] as HTMLElement).onclick = ((e) => {
              e.stopPropagation();
              const highlightsCopy = [...this.initialHighlightIndexes];
              highlightsCopy.sort(compareRanges);
              const y = highlightsCopy.findIndex((x: any) => x[0] === range1[0] && x[1] === range1[1]);
              function compareRanges(a: any, b: any): number {
                return a[0] - b[0];
              }
              const ranges = []
              ranges.push(range1);
              // Sort the ranges array using the custom comparison function
              for(let i=y;i<highlightsCopy.length-1;i++) {
                const temp = [highlightsCopy[i][1], highlightsCopy[i+1][0]]
                const words =  this.textWordsIndexes.filter((x: any) => x > temp[0] && x < temp[1]);
                if (words.length < 1 ) {
                  ranges.push(highlightsCopy[i+1])
                } else {
                  break;
                }
              }
              for(let i=y;i > 0;i--) {
                const temp = [highlightsCopy[i-1][1], highlightsCopy[i][0]]
                const words =  this.textWordsIndexes.filter((x: any) => x > temp[0] && x < temp[1]);
                if (words.length < 1 ) {
                  ranges.push(highlightsCopy[i-1])
                } else {
                  break;
                }
              }
              ranges.sort(compareRanges)
              this.store.dispatch(highlightText({range: [ranges[0][0], ranges[ranges.length-1][1]]}));


              function deleteIntersectingRanges(arr: number[][], range: number[]): number[][] {
                return arr.filter((subArray) => !isRangeIntersecting(subArray, range));
              }
              
              function isRangeIntersecting(subArray: number[], range: number[]): boolean {
                const [start1, end1] = subArray;
                const [start2, end2] = range;
              
                return start1 <= end2 && end1 >= start2;
              }
              this.initialHighlightIndexes = [...deleteIntersectingRanges(this.initialHighlightIndexes, [ranges[0][0], ranges[ranges.length-1][1]])];


              badge.remove();
            });
      
            const element = document.getElementById(`word${wordIndex}`);
            element.classList.add('mat-badge');

            element.appendChild(badge);
          }

          this.badgesToDelete.forEach((element: any) => {
            if(wordIndex >= element.range[0] && wordIndex <= element.range[1]) {
              if(!this.isInEraseMode) {
                element.badge.style.visibility = 'visible';

              }
            }
          });
          if(!this.isInEraseMode) {
            this.lastHighlightedWordId = wordIndex;
            if(!this.markMode) {
              if(e.srcElement.style.background === '') {
                e.srcElement.style.background = this.tempHighlightColor; 
                this.clearAllTempHighlightsNotInRange([Number(wordIndex) -1, Number(wordIndex) + 1])
              }
            }
            else {
              this.lastWordToRemove = wordIndex;
              this.highlightTexts$.pipe(take(1)).subscribe(highlightText => {
                e.srcElement.style.background = this.highlightColor; 
                if(this.textHighlightStart < wordIndex) {
                  this.newHighlightWordIndexes = [... new Set([...this.newHighlightWordIndexes, ...this.textWordsIndexes.filter((id: number) => id >= this.textHighlightStart && id <= wordIndex && !this.isWordIdAlreadyHighlighted(highlightText, id))])]
                  this.highlightAllElementsInRange([Number(this.textHighlightStart), Number(wordIndex)+1], this.highlightColor);
                  this.clearAllNewHighlightsNotInRange([Number(this.textHighlightStart), Number(wordIndex)+1])
      
                } else {
                  this.highlightAllElementsInRange([Number(wordIndex) - 1, Number(this.textHighlightStart)], this.highlightColor);
                  this.newHighlightWordIndexes = [...this.newHighlightWordIndexes, ...this.textWordsIndexes.filter((id: number) => id >= wordIndex && id <= this.textHighlightStart && !this.isWordIdAlreadyHighlighted(highlightText, id))]
                  this.clearAllNewHighlightsNotInRange([Number(wordIndex) - 1, Number(this.textHighlightStart)]);
      
                }
              });
            }
          } else {
            if(this.eraseMarkMode) {
              this.lastWordToRemove = wordIndex;
              if(e.srcElement.style.background === this.highlightColor) { 
                this.clearAllHighlightsInRange([Number(wordIndex) -1, Number(wordIndex) + 1]);
                this.clearAllSpaceHighlightsInWordsToRemove();
                this.store.select(selectHighlightTexts).pipe(take(1)).subscribe(y => {

                  y.forEach((range: any) => this.highlightAllElementsInRange(range, this.highlightColor))
                })
                  this.clearAllHighlightsInRange([Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)]);
              } else {
                this.store.select(selectHighlightTexts).pipe(take(1)).subscribe(y => {

                  y.forEach((range: any) => this.highlightAllElementsInRange(range, this.highlightColor))
                })
                  this.clearAllHighlightsInRange([Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)]);
              }
            }
          } 
      
      }

      document.getElementById(`word${wordIndex}`).onmouseleave = (e: any) => {
        if(document.getElementById(`word${wordIndex}`).style.background === this.tempHighlightColor) {
          document.getElementById(`word${wordIndex}`).style.background = ''; 
        }
        this.badgesToDelete.forEach((element: any) => {
          if(wordIndex >= element.range[0] && wordIndex <= element.range[1]) {
            document.getElementById(`word${wordIndex}`).classList.remove('mat-badge')
            element.badge.remove();
          }
        });
      }

      document.getElementById(`word${wordIndex}`).onmousedown = (e: any) => {
        if(!this.isInEraseMode) {
          this.textHighlightStart = wordIndex;
          e.srcElement.style.background = this.highlightColor; 
          this.markMode = true;
          this.newHighlightWordIndexes = []
        } else {
          this.eraseMarkMode = true;
          this.clearAllHighlightsInRange([Number(wordIndex) -1, Number(wordIndex) + 1]);
          this.highlightWordIndexesToRemoveStart = wordIndex;
          this.clearAllSpaceHighlightsInWordsToRemove();
        }
      }

      document.getElementById(`word${wordIndex}`).onmouseup = (e: any) => {
        e.stopPropagation();
        if(!this.isInEraseMode) {
          this.markMode = false;
          let range;
          if (Number(this.textHighlightStart) < Number(e.srcElement.getAttribute('name').replace('word', ''))) {
            range = [Number(this.textHighlightStart), Number(e.srcElement.getAttribute('name').replace('word', ''))];
          } else {
            range = [Number(e.srcElement.id.replace('word', '')), Number(document.getElementById(`word${this.textHighlightStart}`).getAttribute('name').replace('word', ''))];
          }
          this.store.dispatch(highlightText({range}))
        } else {
          this.eraseMarkMode = false;
          this.store.dispatch(removeWordsFromHighlightedText({wordsToRemove: [Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)], wordIndexes: this.textWordsIndexes}));
            this.clearAllHighlightsInRange([Math.min(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove), Math.max(this.highlightWordIndexesToRemoveStart, this.lastWordToRemove)]);
          if(this.isInInitalHighlightMode) {
            this.initialHighlightIndexes.forEach((element: any) => {
              this.highlightAllElementsInRange(element, this.initialHighlightColor)
            });
          }
        }

      }
    })
    if(this.isInInitalHighlightMode) {
      this.initialHighlightIndexes.forEach((element: any) => {
        this.highlightAllElementsInRange(element, this.initialHighlightColor)
      });
    }
  }

  highlightAllElementsInRange(range: number[], color: string) {
    if(!this.textWordsIndexes) {
      return;
    }
    this.textWordsIndexes.forEach((index: number) => {
      if(index >= range[0] && index <= range[1] && document.getElementById(`word${index}`).style.background !== this.highlightColor) {
        document.getElementById(`word${index}`).style.background = color; 
      }
    })

    this.textSpacesIndexes.forEach((index: number) => {
      if(index >= range[0] && index <= range[1] && document.getElementById(`space${index}`).style.background !== this.highlightColor) {
        document.getElementById(`space${index}`).style.background = color; 
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

  clearAllTempHighlightsNotInRange(range: any) {
    this.textWordsIndexes.forEach((index: number) => {
    if((index < range[0] || index > range[1]) && document.getElementById(`word${index}`).style.background === this.tempHighlightColor) {
      if(this.isWordIdAlreadyHighlighted(this.initialHighlightIndexes, index) && this.isInInitalHighlightMode) {
        document.getElementById(`word${index}`).style.background = this.initialHighlightColor; 
      }
      else {
        document.getElementById(`word${index}`).style.background = ''; 
      }       
      }
    })

    this.textSpacesIndexes.forEach((index: number) => {
      if((index < range[0] || index > range[1]) && document.getElementById(`space${index}`).style.background === this.tempHighlightColor) {
      if(this.isWordIdAlreadyHighlighted(this.initialHighlightIndexes, index) && this.isInInitalHighlightMode) {
        document.getElementById(`space${index}`).style.background = this.initialHighlightColor; 
      }
      else {
        document.getElementById(`space${index}`).style.background = ''; 
      } 
    }
    })
  }

  clearAllInitalHighlightsInRange(range: any) {
    this.textWordsIndexes.forEach((index: number) => {
    if((index >= range[0] && index <= range[1])  && document.getElementById(`word${index}`).style.background === this.initialHighlightColor) {

        document.getElementById(`word${index}`).style.background = '';      
      }
    })

    this.textSpacesIndexes.forEach((index: number) => {
      if((index >= range[0] && index <= range[1])  && document.getElementById(`space${index}`).style.background === this.initialHighlightColor) {
        document.getElementById(`space${index}`).style.background = ''; 
    }
    })
  }

  clearAllHighlightsInRange(range: any) {
    if(!this.textWordsIndexes) {
      return;
    }
    this.textWordsIndexes.forEach((index: number) => {
      if((index >= range[0] && index <= range[1]) && document.getElementById(`word${index}`).style.background === this.highlightColor) {
      if(this.isWordIdAlreadyHighlighted(this.initialHighlightIndexes, index) && this.isInInitalHighlightMode) {
        document.getElementById(`word${index}`).style.background = this.initialHighlightColor; 
      }
      else {
        document.getElementById(`word${index}`).style.background = ''; 
      }  
  }})
    

    this.textSpacesIndexes.forEach((index: number) => {
      if((index >= range[0] && index <= range[1]) && document.getElementById(`space${index}`).style.background === this.highlightColor) {
      if(this.isWordIdAlreadyHighlighted(this.initialHighlightIndexes, index) && this.isInInitalHighlightMode) {
        document.getElementById(`space${index}`).style.background = this.initialHighlightColor; 
      }
      else {
        document.getElementById(`space${index}`).style.background = ''; 
      } 
    }})
  }

  clearAllSpaceHighlightsInRange(range: any) {
    this.textSpacesIndexes.forEach((index: number) => {
      if((index >= range[0] && index <= range[1]) && document.getElementById(`space${index}`).style.background === this.highlightColor) {
        document.getElementById(`space${index}`).style.background = ''; 
      }
    })
  }

  clearAllSpaceHighlightsInWordsToRemove() {
      let lastWordIndex = this.lastWordToRemove;
      let closest = this.findClosestElements(lastWordIndex, this.textWordsIndexes);
      this.clearAllSpaceHighlightsInRange([closest.lowerBound, closest.upperBound]);
  }


  clearAllNewHighlightsNotInRange(range: any) {
    let min = Math.min(...this.newHighlightWordIndexes);
    let max = Math.max(...this.newHighlightWordIndexes);
    this.newHighlightWordIndexes.forEach((index: number) => {
      if((index < range[0] || index > range[1])) {
        if(this.isWordIdAlreadyHighlighted(this.initialHighlightIndexes, index) && this.isInInitalHighlightMode) {
          document.getElementById(`word${index}`).style.background = this.initialHighlightColor; 
        }
        else {
          document.getElementById(`word${index}`).style.background = ''; 
        }  
      }
    })

    this.highlightTexts$.pipe(take(1)).subscribe(highlightText => {
      this.textSpacesIndexes.forEach((index: number) => {
        let wordIndex = Math.min(...this.textWordsIndexes.filter(id => id >= index))
        if(index >= range[1] && index <= max) {
          if(this.isWordIdAlreadyHighlighted(highlightText, index)) {
            document.getElementById(`space${index}`).style.background = this.highlightColor; 
          }
          else {
            if(this.isWordIdAlreadyHighlighted(this.initialHighlightIndexes, index) && this.isInInitalHighlightMode) {
              document.getElementById(`space${index}`).style.background = this.initialHighlightColor; 
            }
            else {
              document.getElementById(`space${index}`).style.background = ''; 
            }            }         
        }
  
        wordIndex = Math.max(...this.textWordsIndexes.filter(id => id <= index))
        if((index <= range[0] && index >= min -1)) {
          if(this.isWordIdAlreadyHighlighted(highlightText, index)) {
            document.getElementById(`space${index}`).style.background = this.highlightColor; 
          }
          else {
            if(this.isWordIdAlreadyHighlighted(this.initialHighlightIndexes, index) && this.isInInitalHighlightMode) {
              document.getElementById(`space${index}`).style.background = this.initialHighlightColor; 
            }
            else {
              document.getElementById(`space${index}`).style.background = ''; 
            }            }         
        }
      })
    })
  }

  getElementsNotInBothArrays<T>(arr1: T[], arr2: T[]): T[] {
    const uniqueElements = new Set([...arr1, ...arr2]);
    const intersection = arr1.filter((x) => arr2.includes(x));
    const result = [...uniqueElements].filter((x) => !intersection.includes(x));
    return result;
  }


  findClosestElements(x: number, a: number[]) {
    let lowerBound = -Infinity;
    let upperBound = Infinity;
    
    for (let i = 0; i < a.length; i++) {
      const currentElement = a[i];
  
      if (currentElement < x && currentElement > lowerBound) {
        lowerBound = currentElement;
      }
  
      if (currentElement > x && currentElement < upperBound) {
        upperBound = currentElement;
      }
    }
  
    return { lowerBound: lowerBound !== -Infinity ? lowerBound : undefined, upperBound: upperBound !== Infinity ? upperBound : undefined };
  }



  intersecting(index: number, range: [number, number]): boolean {
        if (index <= range[1] && index >= range[0]) {
          // Ranges intersect
          return true;
        }
    
  
    // No intersection found
    return false;
  }
}
