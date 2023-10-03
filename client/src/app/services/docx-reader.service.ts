import { Injectable } from '@angular/core';
import Docxtemplater from 'docxtemplater';
import * as PizZip from 'pizzip';

@Injectable({
  providedIn: 'root'
})
export class DocxReaderService {

  constructor() { }

  readDocx(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const arrayBuffer = event.target.result;
        const zip = new PizZip(arrayBuffer);
        const doc = new Docxtemplater().loadZip(zip);
        doc.render(); // Render the document

        const text = doc.getFullText(); // Get the full text content
        resolve(text);
      };
      reader.onerror = (event) => {
        reject(event);
      };
      reader.readAsArrayBuffer(file);
    });
  }
}