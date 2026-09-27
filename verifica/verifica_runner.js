/* Verifica ESTERNA di TolISO: confronta il modulo con i dataset trascritti da fonti indipendenti.
   Ogni casella è provata in 3 punti della fascia (appena oltre il limite inferiore, centro, limite superiore incluso).
   Esito per confronto: ok · noto (differenza attesa e spiegata) · ERRORE. */
function tolVerify(TolISO, datasets) {
  var rep = { datasets: [], caselle: 0, confronti: 0, ok: 0, noti: 0, errori: 0 };
  datasets.forEach(function (ds) {
    var r = { id: ds.id, fonte: ds.fonte, note: ds.note || '', caselle: 0, confronti: 0, ok: 0, noti: 0, errori: 0, dettagli: [] };
    Object.keys(ds.classi).forEach(function (cls) {
      var pc = TolISO.parseClass(cls);
      ds.classi[cls].forEach(function (pair, i) {
        var a = ds.fasce[i][0], b = ds.fasce[i][1];
        if (pair === null) {            /* casella assente sulla fonte: se è una classe non prevista dalla norma, anche il modulo deve rifiutarla */
          return;
        }
        r.caselle++;
        [a === 0 ? Math.min(1.5, b) : a + 0.001, (a + b) / 2, b].forEach(function (D) {
          r.confronti++;
          var o = pc ? TolISO.limits(ds.tipo, pc.letter, pc.grade, D) : { ok: false, err: 'classe?' };
          if (o.ok && o.up === pair[0] && o.lo === pair[1]) { r.ok++; return; }
          var isJs = pc && pc.letter.toLowerCase() === 'js';
          if (o.ok && isJs && ds.jsVecchioArrotondamento && o.up % 1 !== 0 && pair[0] === Math.floor(o.up) && pair[1] === -Math.floor(o.up)) {
            r.noti++;
            if (D === b) r.dettagli.push('noto   ' + cls + ' ' + a + '…' + b + ': fonte ±' + pair[0] + ' · modulo ±' + o.up + ' (la fonte arrotonda js al micron intero, vecchie edizioni; ISO 286:2010 = ±IT/2 esatto)');
            return;
          }
          r.errori++;
          r.dettagli.push('ERRORE ' + cls + ' Ø' + D + ' (' + a + '…' + b + '): fonte ' + pair[0] + '/' + pair[1] + ' · modulo ' + (o.ok ? o.up + '/' + o.lo : 'rifiutata: ' + o.err));
        });
      });
    });
    ['caselle', 'confronti', 'ok', 'noti', 'errori'].forEach(function (k) { rep[k] += r[k]; });
    rep.datasets.push(r);
  });
  return rep;
}
function tolVerifyText(rep) {
  var L = [];
  rep.datasets.forEach(function (r) {
    L.push('■ ' + r.id + ' — ' + r.caselle + ' caselle, ' + r.confronti + ' confronti: ' + r.ok + ' ok · ' + r.noti + ' noti · ' + r.errori + ' ERRORI');
    L.push('  fonte: ' + r.fonte);
    r.dettagli.forEach(function (d) { L.push('    ' + d); });
  });
  L.push('');
  L.push('TOTALE: ' + rep.caselle + ' caselle da fonti esterne, ' + rep.confronti + ' confronti → ' + rep.ok + ' ok · ' + rep.noti + ' differenze note · ' + rep.errori + ' ERRORI');
  return L.join('\n');
}
