const fs = require('fs');
const JSZip = require('jszip');

(async () => {
  const path =
    'c:/Users/nurdi/OneDrive/Documents/Manual do utilizador.pedagogico.v1.02.docx';
  const buf = fs.readFileSync(path);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  const texts = [];
  const paras = xml.split(/<\/w:p>/);
  for (const p of paras) {
    let line = '';
    const tre = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tm;
    while ((tm = tre.exec(p))) line += tm[1];
    line = line.replace(/\s+/g, ' ').trim();
    if (line) texts.push(line);
  }
  fs.writeFileSync(
    'd:/Projectos/Outros/peoplecore-api-master/docs/_manual_pedagogico_extract.txt',
    texts.join('\n'),
    'utf8',
  );
  console.log('paras', texts.length);
  console.log(texts.slice(0, 100).join('\n'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
