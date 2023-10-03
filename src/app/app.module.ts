import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialExampleModule } from '../material.module'
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HighlightTextComponent } from './components/highlight-text/highlight-text.component';
import { StoreModule } from '@ngrx/store';
import { highlightTextKey, highlightTextReducer } from './reducers/highlight-text.reducrs';
import { HighlightUnnecessaryInformationComponent } from './components/highlight-unnecessary-information/highlight-unnecessary-information.component';
import { unnecessaryHighlightTextKey, unnecessaryHighlightTextReducer } from './reducers/unn-highlight-text.reducer';
import { HighlightMissingInformationComponent } from './components/miss-highlight-text/highlight-missing-information.component';
import { missingHighlightTextKey, missingHighlightTextReducer } from './reducers/miss-highlight-text.reducer';

@NgModule({
  declarations: [
    AppComponent,
    HighlightTextComponent,
    HighlightUnnecessaryInformationComponent,
    HighlightMissingInformationComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MaterialExampleModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    StoreModule.forRoot({[highlightTextKey]: highlightTextReducer, [unnecessaryHighlightTextKey]: unnecessaryHighlightTextReducer, [missingHighlightTextKey]: missingHighlightTextReducer}),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
