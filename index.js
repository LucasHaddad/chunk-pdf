import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const run = async (pathToRead, pathToWrite, sizeInBytes) => {
  const file = fs.readFileSync(path.resolve(pathToRead));
  const pdf = await PDFDocument.load(file);
  
  let actualSize = 0;
  let filesIndex = 0;
  let doc = await PDFDocument.create();
  const pages = pdf.getPages();
  for (const index of pages.keys()) {
    const tempPdf = await PDFDocument.create();
    const [tempPageCopy] = await tempPdf.copyPages(pdf, [index]);
    tempPdf.addPage(tempPageCopy);
    const tempBuffer = await tempPdf.save();
    const pageSize = tempBuffer.byteLength;

    if (actualSize + pageSize < +sizeInBytes && pages.length - 1 > index) {
      actualSize += pageSize;
      const [pageCopied] = await doc.copyPages(pdf, [index]);
      doc.addPage(pageCopied);
    } else {
      if (actualSize + pageSize < +sizeInBytes && pages.length - 1 === index) {
        const [pageCopied] = await doc.copyPages(pdf, [index]);
        doc.addPage(pageCopied);
      }

      const buffer = await doc.save();
      fs.writeFileSync(path.resolve(`${pathToWrite}${path.sep}${filesIndex}.pdf`), buffer);
      doc = await PDFDocument.create();
      filesIndex++;
      
      if (actualSize + pageSize >= +sizeInBytes && pages.length - 1 === index) {
        const [pageCopied] = await doc.copyPages(pdf, [index]);
        doc.addPage(pageCopied);
        const buffer = await doc.save();
        fs.writeFileSync(path.resolve(`${pathToWrite}${path.sep}${filesIndex}.pdf`), buffer);
      }

      actualSize = 0;
    }
  }

  if (!filesIndex)
    console.log('The file is smaller than the maximum chunk size');
};

if (!fs.existsSync(path.resolve(process.argv[2]))) console.error('The source path must be valid');
else if (!fs.existsSync(path.resolve(process.argv[3]))) console.error('The destination path must be valid');
else if (Number.isNaN(process.argv[4])) console.error('The size must be a valid number');
else await run(process.argv[2], process.argv[3], process.argv[4]);