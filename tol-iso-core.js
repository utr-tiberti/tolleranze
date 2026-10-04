/* Generato da Tolleranze_ISO_UTR_4.7.html con estrai_core.py — NON modificare a mano */
/* ══════════ TOL-ISO:JS START — da copiare nel calcolatore ══════════
   Modulo autonomo: unica variabile globale = TolISO. Nessuna dipendenza.
   API:  TolISO.limits(kind, letter, grade, D)  → scostamenti/limiti di una classe
         TolISO.fit(D, 'H7', 'g6')              → accoppiamento
         TolISO.dim('25 k6')                    → quota tollerata per disegni/sketch (scostamenti in mm)
         TolISO.parse('25 H7/g6')               → {D, hole, shaft}
         TolISO.mount()                         → aggancia la UI a #view-tol
         TolISO.setLang('it'|'en')              → da chiamare in applyLang()
         TolISO.selfTest()                      → {pass, fail, failures}            */
var TolISO = (function () {
  'use strict';

  /* ══════════ PROVENIENZA DEI DATI ══════════
     Le tabelle qui sotto non sono numeri «messi nel codice»: ognuna dichiara norma, edizione, quale tabella della norma,
     unità, come viene usata (algoritmo) e come è provata (test). `stato` distingue tre cose diverse:
       verificato-esterno = i valori sono stati confrontati con fonti indipendenti (vedi verifica/)
       derivato           = non è una tabella: è calcolato con la regola della norma dai valori delle altre tabelle
       da-verificare      = riportato a memoria e non ancora confrontato con niente                                        */
  var NORME = {
    ISO_286_1: { sigla: 'ISO 286-1', edizione: '2010', titolo: 'Geometrical product specifications (GPS) — ISO code system for tolerances on linear sizes — Part 1: Basis of tolerances, deviations and fits',
                 stato: 'corrente (ultima conferma 2021); Technical Corrigendum 1:2013 LETTO e applicato (unica modifica numerica fino a 500 mm: ef 18…30 = \u221228)', fonte: 'iso.org/standard/45975.html · Tab. 4 letta su copia PDF il 24/09/2026', verificato_il: '2026-09-24',
                 nota: 'da qui: gradi IT, scostamenti fondamentali, regola di derivazione dei fori (ES = \u2212ei + \u0394) e definizione degli accoppiamenti. Tabella 4 (scostamenti fondamentali degli alberi a…j) letta il 24/09/2026: cd, ef, fg sono tabulate fino a 50 mm e vuote oltre. Il resto delle formule è il sistema ISO come lo conosco, i valori sono verificati contro fonti esterne.' },
    ISO_286_2: { sigla: 'ISO 286-2', edizione: '2010', titolo: 'Geometrical product specifications (GPS) — ISO code system for tolerances on linear sizes — Part 2: Tables of standard tolerance classes and limit deviations for holes and shafts',
                 stato: 'corrente (ultima conferma 2021); esiste il Technical Corrigendum 1:2013, NON confrontato', fonte: 'iso.org/standard/54915.html', verificato_il: '2026-09-20',
                 nota: 'da qui: le tabelle degli scostamenti limite. Nel modulo i valori dei fori sono DERIVATI dalle tabelle degli alberi con la regola della parte 1, non trascritti.' }
  };
  var PROVENIENZA = {
    IT: { norma: 'ISO_286_1', tabella: 'gradi di tolleranza normalizzati IT01…IT18 per le 13 fasce dimensionali principali fino a 500 mm',
          unita: '\u00B5m (micrometri)', stato: 'verificato-esterno',
          algoritmo: 'itVal(fascia, grado) = IT[fascia][grado+1]; l\'ampiezza della zona di tolleranza è questo valore, usato da tutte le classi.',
          test: ['IT righe', 'IT crescente per grado', 'IT non decrescente per fascia', '80 h11 = 0/-190'] },
    FD_MAIN: { norma: 'ISO_286_1', tabella: 'scostamenti fondamentali degli alberi per le lettere d, e, f, g, h, cd, ef, fg (queste tre fino a 50 mm, Tab. 4 + Cor.1:2013), k, m, n, p (fasce principali)',
          unita: '\u00B5m', stato: 'verificato-esterno',
          algoritmo: 'lettere a…h: lo scostamento è quello SUPERIORE (es), l\'inferiore è es \u2212 IT. Lettere k…zc: è l\'INFERIORE (ei), il superiore è ei + IT. k vale solo per IT4…IT7, altrimenti 0.',
          test: ['25 k6 = 15/2', '47 p6 = 42/26', '30 f7 = -20/-41', 'monotonia', 'ordine a<b<c…'] },
    FD_FINE: { norma: 'ISO_286_1', tabella: 'scostamenti fondamentali degli alberi per a, b, c, r, s, t, u, v, x, y, z, za, zb, zc (25 fasce intermedie)',
          unita: '\u00B5m', stato: 'verificato-esterno',
          algoritmo: 'come FD_MAIN, ma su fasce più fitte; null = posizione non prevista dalla norma per quella dimensione → la classe viene rifiutata invece di interpolare.',
          test: ['26 a11 = -300/-430', '40 s6 = 59/43', '28 t6 = 54/41', 'v6 Ø12 non prevista'] },
    J_SHAFT: { norma: 'ISO_286_2', tabella: 'scostamenti tabellati della posizione j per alberi (j5, j6, j7 e j8 fino a 3 mm)',
          unita: '\u00B5m', stato: 'verificato-esterno',
          algoritmo: 'valore tabellato = scostamento INFERIORE (ei); il superiore è ei + IT. La posizione j non segue una formula: fuori da questi gradi la classe è rifiutata.',
          test: ['25 j5 = 5/-4', '25 j6 = 9/-4', '25 j7 = 13/-8', 'j9 errore'] },
    J_HOLE: { norma: 'ISO_286_2', tabella: 'scostamenti tabellati della posizione J per fori (J6, J7, J8)',
          unita: '\u00B5m', stato: 'verificato-esterno',
          algoritmo: 'valore tabellato = scostamento SUPERIORE (ES); l\'inferiore è ES \u2212 IT.',
          test: ['170 J6 = 18/-7', '170 J7 = 26/-14', '170 J8 = 41/-22'] },
    FORI: { norma: 'ISO_286_1', tabella: 'nessuna: i fori sono DERIVATI dagli alberi con la regola della norma',
          unita: '\u00B5m', stato: 'derivato',
          algoritmo: 'A…H: EI = \u2212es. K, M, N fino a IT8 e P…ZC fino a IT7: ES = \u2212ei + \u0394, con \u0394 = IT(grado) \u2212 IT(grado\u22121). Oltre quei gradi \u0394 = 0. Eccezione di norma: M6 oltre 250 fino a 315 = \u22129. js/JS = \u00B1IT/2 esatto (i vecchi regoli arrotondano al micron).',
          test: ['20 K7 = 6/-15', '20 P7 = -14/-35', '280 M6 = -9/-41', 'simmetria a…h', '5 N9 = 0/-30'] },
    FASCE: { norma: 'ISO_286_1', tabella: 'fasce dimensionali: 13 principali e 25 intermedie, da 0 a 500 mm',
          unita: 'mm', stato: 'verificato-esterno',
          algoritmo: 'fineIdx(D) trova la fascia col limite superiore INCLUSO («oltre X fino a Y»): Ø18 sta nella fascia 10…18, Ø18,001 in quella 18…30. Oltre 500 mm il modulo rifiuta.',
          test: ['D=18 → IT7 18', 'D=18.001 → IT7 21', 'D=500 ok', 'D=500.1 errore'] }
  };
  function provenienza(tab) { return tab ? (PROVENIENZA[tab] ? { tabella: tab, dati: PROVENIENZA[tab], norma: NORME[PROVENIENZA[tab].norma] } : null) : { norme: NORME, tabelle: PROVENIENZA }; }

  /* ── Fasce dimensionali (limite superiore incluso: "oltre X fino a Y") ── */
  var R_MAIN = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];
  var R_FINE = [3, 6, 10, 14, 18, 24, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500];
  /* indice fascia fine → indice fascia principale */
  var F2M = [0, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12];

  /* ── Gradi IT [µm] per fascia principale: IT01, IT0, IT1 … IT18 (ISO 286-1 tab. 1) ── */
  var IT = [
    [0.3, 0.5, 0.8, 1.2, 2,   3,  4,  6,  10, 14, 25,  40,  60,  100, 140, 250,  400,  600,  1000, 1400],
    [0.4, 0.6, 1,   1.5, 2.5, 4,  5,  8,  12, 18, 30,  48,  75,  120, 180, 300,  480,  750,  1200, 1800],
    [0.4, 0.6, 1,   1.5, 2.5, 4,  6,  9,  15, 22, 36,  58,  90,  150, 220, 360,  580,  900,  1500, 2200],
    [0.5, 0.8, 1.2, 2,   3,   5,  8,  11, 18, 27, 43,  70,  110, 180, 270, 430,  700,  1100, 1800, 2700],
    [0.6, 1,   1.5, 2.5, 4,   6,  9,  13, 21, 33, 52,  84,  130, 210, 330, 520,  840,  1300, 2100, 3300],
    [0.6, 1,   1.5, 2.5, 4,   7,  11, 16, 25, 39, 62,  100, 160, 250, 390, 620,  1000, 1600, 2500, 3900],
    [0.8, 1.2, 2,   3,   5,   8,  13, 19, 30, 46, 74,  120, 190, 300, 460, 740,  1200, 1900, 3000, 4600],
    [1,   1.5, 2.5, 4,   6,   10, 15, 22, 35, 54, 87,  140, 220, 350, 540, 870,  1400, 2200, 3500, 5400],
    [1.2, 2,   3.5, 5,   8,   12, 18, 25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300],
    [2,   3,   4.5, 7,   10,  14, 20, 29, 46, 72, 115, 185, 290, 460, 720, 1150, 1850, 2900, 4600, 7200],
    [2.5, 4,   6,   8,   12,  16, 23, 32, 52, 81, 130, 210, 320, 520, 810, 1300, 2100, 3200, 5200, 8100],
    [3,   5,   7,   9,   13,  18, 25, 36, 57, 89, 140, 230, 360, 570, 890, 1400, 2300, 3600, 5700, 8900],
    [4,   6,   8,   10,  15,  20, 27, 40, 63, 97, 155, 250, 400, 630, 970, 1550, 2500, 4000, 6300, 9700]
  ];
  var IT_NAMES = ['IT01', 'IT0', 'IT1', 'IT2', 'IT3', 'IT4', 'IT5', 'IT6', 'IT7', 'IT8', 'IT9', 'IT10', 'IT11', 'IT12', 'IT13', 'IT14', 'IT15', 'IT16', 'IT17', 'IT18'];
  function itVal(m, grade) { return IT[m][grade + 1]; }

  /* ── Scostamenti fondamentali ALBERI [µm] (ISO 286-1 tab. 2 e 3).
        a…h = scostamento superiore es (≤0) · k…zc = scostamento inferiore ei (≥0).
        FD_MAIN: 13 valori per fascia principale · FD_FINE: 25 valori per fascia fine · null = non prevista ── */
  var FD_MAIN = {
    d:  [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230],
    e:  [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135],
    f:  [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68],
    g:  [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
    h:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    cd: [-34, -46, -56, -70, -85, -100, null, null, null, null, null, null, null],   /* ISO 286-1:2010 Tab. 4: cd, ef, fg tabulate fino a 50 mm, vuote oltre */
    ef: [-10, -14, -18, -23, -28, -35, null, null, null, null, null, null, null],     /* 18…30: −28 per ISO 286-1:2010/Cor.1:2013 (il testo 2010 stampava −25) */
    fg: [-4, -6, -8, -10, -12, -15, null, null, null, null, null, null, null],
    k:  [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5],          /* valido per IT4…IT7; altrimenti 0 */
    m:  [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23],
    n:  [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
    p:  [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]
  };
  var FD_FINE = {
    a:  [-270, -270, -280, -290, -290, -300, -300, -310, -320, -340, -360, -380, -410, -460, -520, -580, -660, -740, -820, -920, -1050, -1200, -1350, -1500, -1650],
    b:  [-140, -140, -150, -150, -150, -160, -160, -170, -180, -190, -200, -220, -240, -260, -280, -310, -340, -380, -420, -480, -540, -600, -680, -760, -840],
    c:  [-60, -70, -80, -95, -95, -110, -110, -120, -130, -140, -150, -170, -180, -200, -210, -230, -240, -260, -280, -300, -330, -360, -400, -440, -480],
    r:  [10, 15, 19, 23, 23, 28, 28, 34, 34, 41, 43, 51, 54, 63, 65, 68, 77, 80, 84, 94, 98, 108, 114, 126, 132],
    s:  [14, 19, 23, 28, 28, 35, 35, 43, 43, 53, 59, 71, 79, 92, 100, 108, 122, 130, 140, 158, 170, 190, 208, 232, 252],
    t:  [null, null, null, null, null, null, 41, 48, 54, 66, 75, 91, 104, 122, 134, 146, 166, 180, 196, 218, 240, 268, 294, 330, 360],
    u:  [18, 23, 28, 33, 33, 41, 48, 60, 70, 87, 102, 124, 144, 170, 190, 210, 236, 258, 284, 315, 350, 390, 435, 490, 540],
    v:  [null, null, null, null, 39, 47, 55, 68, 81, 102, 120, 146, 172, 202, 228, 252, 284, 310, 340, 385, 425, 475, 530, 595, 660],
    x:  [20, 28, 34, 40, 45, 54, 64, 80, 97, 122, 146, 178, 210, 248, 280, 310, 350, 385, 425, 475, 525, 590, 660, 740, 820],
    y:  [null, null, null, null, null, 63, 75, 94, 114, 144, 174, 214, 254, 300, 340, 380, 425, 470, 520, 580, 650, 730, 820, 920, 1000],
    z:  [26, 35, 42, 50, 60, 73, 88, 112, 136, 172, 210, 258, 310, 365, 415, 465, 520, 575, 640, 710, 790, 900, 1000, 1100, 1250],
    za: [32, 42, 52, 64, 77, 98, 118, 148, 180, 226, 274, 335, 400, 470, 535, 600, 670, 740, 820, 920, 1000, 1150, 1300, 1450, 1600],
    zb: [40, 50, 67, 90, 108, 136, 160, 200, 242, 300, 360, 445, 525, 620, 700, 780, 880, 960, 1050, 1200, 1300, 1500, 1650, 1850, 2100],
    zc: [60, 80, 97, 130, 150, 188, 218, 274, 325, 405, 480, 585, 690, 800, 900, 1000, 1150, 1250, 1350, 1550, 1700, 1900, 2100, 2400, 2600]
  };
  /* j (albero): scostamento inferiore ei · J (foro): scostamento superiore ES — valori tabellati, non da formula */
  var J_SHAFT = {
    5: [-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20],
    6: [-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20],
    7: [-4, -4, -5, -6, -8, -10, -12, -15, -18, -21, -26, -28, -32],
    8: [-6, null, null, null, null, null, null, null, null, null, null, null, null]
  };
  var J_HOLE = {
    6: [2, 5, 5, 6, 8, 10, 13, 16, 18, 22, 25, 29, 33],
    7: [4, 6, 8, 10, 12, 14, 18, 22, 26, 30, 36, 39, 43],
    8: [6, 10, 12, 15, 20, 24, 28, 34, 41, 47, 55, 60, 66]
  };

  var LETTERS = ['a', 'b', 'c', 'cd', 'd', 'e', 'ef', 'f', 'fg', 'g', 'h', 'js', 'j', 'k', 'm', 'n', 'p', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z', 'za', 'zb', 'zc'];
  var UPPER_DEV = { a: 1, b: 1, c: 1, cd: 1, d: 1, e: 1, ef: 1, f: 1, fg: 1, g: 1, h: 1 };   /* lettere con es come scostamento fondamentale */

  function fineIdx(D) { for (var i = 0; i < R_FINE.length; i++) if (D <= R_FINE[i]) return i; return -1; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function rangeBounds(fi, fine) {
    var arr = fine ? R_FINE : R_MAIN;
    return [fi === 0 ? 0 : arr[fi - 1], arr[fi]];
  }
  /* scostamento fondamentale dell'albero per lettera e fascia fine (null se non prevista) */
  function shaftFD(L, fi) {
    if (FD_MAIN[L]) return FD_MAIN[L][F2M[fi]];
    if (FD_FINE[L]) return FD_FINE[L][fi];
    return null;
  }

  /* ── NUCLEO: scostamenti limite di una classe di tolleranza ──
     kind 'hole'|'shaft' · letter (maiuscole/minuscole indifferenti) · grade 1…18 · D mm
     → {ok:true, up, lo, it, max, min, mean, from, to}  oppure {ok:false, err:<codice>} */
  function limits(kind, letter, grade, D) {
    var L = String(letter).toLowerCase();
    grade = parseInt(grade, 10);
    D = Number(D);
    if (!(D > 0) || D > 500 || !isFinite(D)) return { ok: false, err: 'range' };
    if (LETTERS.indexOf(L) < 0) return { ok: false, err: 'letter' };
    if (!(grade >= 1 && grade <= 18)) return { ok: false, err: 'grade' };
    if (grade <= 2 && L !== 'h' && L !== 'js') return { ok: false, err: 'gradelow' };
    if (grade >= 14 && D <= 1) return { ok: false, err: 'it14' };
    if ((L === 'a' || L === 'b') && D <= 1) return { ok: false, err: 'ab1' };

    var fi = fineIdx(D), m = F2M[fi], it = itVal(m, grade), up, lo;
    var delta = (m === 0 || grade < 3 || grade > 8) ? 0 : itVal(m, grade) - itVal(m, grade - 1);

    if (L === 'js') { up = it / 2; lo = -it / 2; }
    else if (L === 'j') {
      var tab = kind === 'hole' ? J_HOLE[grade] : J_SHAFT[grade];
      if (!tab || tab[m] === null) return { ok: false, err: 'jgrade' };
      if (kind === 'hole') { up = tab[m]; lo = up - it; } else { lo = tab[m]; up = lo + it; }
    }
    else if (kind === 'shaft') {
      if (L === 'k') { lo = (grade >= 4 && grade <= 7) ? FD_MAIN.k[m] : 0; up = lo + it; }
      else {
        var fd = shaftFD(L, fi);
        if (fd === null) return { ok: false, err: 'size' };
        if (UPPER_DEV[L]) { up = fd; lo = up - it; } else { lo = fd; up = lo + it; }
      }
    }
    else { /* FORO */
      if (UPPER_DEV[L]) {                       /* A…H: EI = −es */
        var fdh = shaftFD(L, fi);
        if (fdh === null) return { ok: false, err: 'size' };
        lo = -fdh; up = lo + it;
      } else if (L === 'k') {
        if (grade <= 8) up = (m === 0) ? 0 : -FD_MAIN.k[m] + delta;
        else { if (m !== 0) return { ok: false, err: 'kgrade' }; up = 0; }
        lo = up - it;
      } else if (L === 'm') {
        if (grade <= 8) up = (m === 0) ? -2 : -FD_MAIN.m[m] + delta;
        else up = -FD_MAIN.m[m];
        if (grade === 6 && m === 10) up = -9;   /* eccezione di norma: M6, oltre 250 fino a 315 */
        lo = up - it;
      } else if (L === 'n') {
        if (grade <= 8) up = (m === 0) ? -4 : -FD_MAIN.n[m] + delta;
        else { if (D <= 1) return { ok: false, err: 'n1' }; up = (m === 0) ? -4 : 0; }
        lo = up - it;
      } else {                                   /* P…ZC: ES = −ei (+Δ fino a IT7) */
        var fdp = shaftFD(L, fi);
        if (fdp === null) return { ok: false, err: 'size' };
        up = -fdp + (grade <= 7 ? delta : 0);
        lo = up - it;
      }
    }
    up = r1(up); lo = r1(lo);
    var rb = FD_FINE[L] ? rangeBounds(fi, true) : rangeBounds(m, false);   /* fascia realmente usata dalla norma per questa lettera */
    /* SCOSTAMENTO FONDAMENTALE (ISO 286-1): è quello dei due che sta più vicino alla linea dello zero, ed è
       quello che la LETTERA della classe determina; l'altro esce dal grado IT. Finora il modulo restituiva i due
       scostamenti senza dire quale fosse il fondamentale, e chi lo voleva doveva ricavarselo dalla lettera.
       a…h (e A…H) hanno es/EI come fondamentale, j…zc (e J…ZC) hanno ei/ES. js/JS sono simmetriche: la norma
       le dà come ±IT/2, quindi non c'è UN fondamentale e lo si dichiara. */
    var fdSym = (L === 'js'), fdUp = fdSym ? false : (kind === 'hole' ? !UPPER_DEV[L] : !!UPPER_DEV[L]);
    var fdTipo = fdSym ? (kind === 'hole' ? 'JS' : 'js') : (kind === 'hole' ? (fdUp ? 'ES' : 'EI') : (fdUp ? 'es' : 'ei'));
    return { ok: true, kind: kind, letter: kind === 'hole' ? L.toUpperCase() : L, grade: grade, D: D,
             up: up, lo: lo, it: it, max: D + up / 1000, min: D + lo / 1000, mean: D + (up + lo) / 2000,
             from: rb[0], to: rb[1],
             fd: fdSym ? up : (fdUp ? up : lo), fdTipo: fdTipo, fdSimmetrico: fdSym };
  }

  /* "H7" / "g6" → {kind, letter, grade} (maiuscola = foro, minuscola = albero) */
  function parseClass(s) {
    var mt = /^\s*([A-Za-z]{1,2})\s*(\d{1,2})\s*$/.exec(s || '');
    if (!mt) return null;
    var let_ = mt[1], isUp = let_ === let_.toUpperCase(), isLo = let_ === let_.toLowerCase();
    if (!isUp && !isLo) return null;
    if (LETTERS.indexOf(let_.toLowerCase()) < 0) return null;
    return { kind: isUp ? 'hole' : 'shaft', letter: let_, grade: parseInt(mt[2], 10) };
  }
  /* "25 H7/g6" · "Ø25 g6" · "12,5 H8" → {D, hole, shaft} */
  function parse(str) {
    var mt = /^\s*[Øø⌀]?\s*(\d+(?:[.,]\d+)?)\s*([A-Za-z]{1,2}\s*\d{1,2})\s*(?:\/\s*([A-Za-z]{1,2}\s*\d{1,2}))?\s*$/.exec(str || '');
    if (!mt) return null;
    var out = { D: parseFloat(mt[1].replace(',', '.')), hole: null, shaft: null };
    var c1 = parseClass(mt[2]), c2 = mt[3] ? parseClass(mt[3]) : null;
    if (!c1 || (mt[3] && !c2)) return null;
    if (c2 && c1.kind === c2.kind) return null;
    [c1, c2].forEach(function (c) { if (c) out[c.kind] = c; });
    return out;
  }

  /* ── Accoppiamento foro/albero: giochi e interferenze in µm ── */
  function fit(D, holeCls, shaftCls) {
    var h = typeof holeCls === 'string' ? parseClass(holeCls) : holeCls;
    var s = typeof shaftCls === 'string' ? parseClass(shaftCls) : shaftCls;
    if (!h || !s) return { ok: false, err: 'class' };
    var H = limits('hole', h.letter, h.grade, D), S = limits('shaft', s.letter, s.grade, D);
    if (!H.ok) return H; if (!S.ok) return S;
    var gmax = r1(H.up - S.lo), gmin = r1(H.lo - S.up);
    var type = gmin >= 0 ? 'clearance' : (gmax <= 0 ? 'interference' : 'transition');
    return { ok: true, hole: H, shaft: S, type: type, gmax: gmax, gmin: gmin,
             clrMax: gmax > 0 ? gmax : 0, clrMin: gmin > 0 ? gmin : 0,
             intMax: gmin < 0 ? -gmin : 0, intMin: gmax < 0 ? -gmax : 0 };
  }

  /* ── GLOSSARIO (v4.5): significato delle lettere di posizione, dei gradi IT e dei termini, in parole semplici.
        Le lettere sono descritte per l'ALBERO (minuscole); per il FORO (maiuscole) il senso è speculare e il testo lo dice.
        type: clr = dalla parte del gioco · base = scostamento zero · trn = a cavallo dello zero · itf = dalla parte dell'interferenza. ── */
  var GLOSS = {
    letters: [
      ['a', 'clr', 'Gioco molto grande', 'Very large clearance', 'parti grezze o che lavorano molto calde; raro', 'rough parts or parts running very hot; rare'],
      ['b', 'clr', 'Gioco molto grande', 'Very large clearance', 'come a, un po\' meno', 'as a, slightly less'],
      ['c', 'clr', 'Gioco grande', 'Large clearance', 'perni e cerniere grezze, parti smontabili a mano (H11/c11)', 'rough pins and hinges, hand-removable parts (H11/c11)'],
      ['cd', 'clr', 'Gioco grande', 'Large clearance', 'tra c e d; solo fino a 50 mm, uso raro', 'between c and d; only up to 50 mm, rare'],
      ['d', 'clr', 'Gioco ampio', 'Wide clearance', 'parti che ruotano libere, macchine agricole (H9/d9)', 'free-running parts, agricultural machinery (H9/d9)'],
      ['e', 'clr', 'Gioco medio', 'Medium clearance', 'alberi lunghi su più supporti, temperatura variabile (H8/e8)', 'long shafts on several supports, varying temperature (H8/e8)'],
      ['ef', 'clr', 'Gioco medio', 'Medium clearance', 'tra e e f; solo fino a 50 mm, meccanica fine', 'between e and f; only up to 50 mm, fine mechanics'],
      ['f', 'clr', 'Gioco normale', 'Normal clearance', 'alberi che girano in supporti e bronzine (H8/f7, H7/f7)', 'shafts turning in supports and bushes (H8/f7, H7/f7)'],
      ['fg', 'clr', 'Gioco piccolo', 'Small clearance', 'tra f e g; solo fino a 50 mm, meccanica fine', 'between f and g; only up to 50 mm, fine mechanics'],
      ['g', 'clr', 'Gioco piccolo', 'Small clearance', 'scorrevole di precisione: perni, guide lubrificate (H7/g6)', 'precision sliding: pins, lubricated guides (H7/g6)'],
      ['h', 'base', 'Scostamento zero (pezzo base)', 'Zero deviation (basic member)', 'H = FORO BASE, il sistema più usato: il foro resta fisso e si sceglie l\'albero (H7/g6, H7/k6, H7/p6). h = ALBERO BASE, speculare; con H7 si monta a mano senza gioco apprezzabile (H7/h6)', 'H = HOLE BASIS, the most used system: the hole stays fixed and the shaft is chosen (H7/g6, H7/k6, H7/p6). h = SHAFT BASIS, mirror image; with H7 it is hand-assembled with no appreciable clearance (H7/h6)'],
      ['js', 'trn', 'Simmetrica, ±IT/2', 'Symmetrical, ±IT/2', 'incerto leggero: metà sopra e metà sotto il nominale (H7/js6)', 'light transition: half above and half below nominal (H7/js6)'],
      ['j', 'trn', 'Quasi simmetrica', 'Nearly symmetrical', 'incerto leggero, valori tabellati; esiste solo per pochi gradi', 'light transition, tabulated values; only a few grades exist'],
      ['k', 'trn', 'Incerto', 'Transition', 'si monta con un mazzuolo di gomma: sedi cuscinetti sull\'albero, pulegge (H7/k6)', 'rubber-mallet assembly: bearing seats on shafts, pulleys (H7/k6)'],
      ['m', 'trn', 'Incerto stretto', 'Tight transition', 'si monta con mazzuolo, si smonta senza danni (H7/m6)', 'mallet assembly, removable without damage (H7/m6)'],
      ['n', 'trn', 'Incerto forzato', 'Tight transition', 'ingranaggi e boccole che non devono girare; smontaggio a pressa (H7/n6)', 'gears and bushes that must not turn; press removal (H7/n6)'],
      ['p', 'itf', 'Forzato leggero', 'Light interference', 'boccole e ruote dentate montate a pressa (H7/p6)', 'bushes and gears pressed in (H7/p6)'],
      ['r', 'itf', 'Forzato medio', 'Medium interference', 'alberi nei mozzi, a pressa o a caldo (H7/r6)', 'shafts in hubs, press or shrink fit (H7/r6)'],
      ['s', 'itf', 'Forzato pesante', 'Heavy interference', 'montaggio a caldo, trasmette coppia senza chiavetta (H7/s6)', 'shrink fit, transmits torque without a key (H7/s6)'],
      ['t', 'itf', 'Forzato molto pesante', 'Very heavy interference', 'calettamenti permanenti', 'permanent shrink fits'],
      ['u', 'itf', 'Forzato molto pesante', 'Very heavy interference', 'calettamenti permanenti, pezzi che non si smontano più (H7/u6)', 'permanent shrink fits, parts never taken apart (H7/u6)'],
      ['v', 'itf', 'Forzato estremo', 'Extreme interference', 'raro', 'rare'], ['x', 'itf', 'Forzato estremo', 'Extreme interference', 'raro', 'rare'], ['y', 'itf', 'Forzato estremo', 'Extreme interference', 'raro', 'rare'],
      ['z', 'itf', 'Forzato estremo', 'Extreme interference', 'raro', 'rare'], ['za', 'itf', 'Forzato estremo', 'Extreme interference', 'raro', 'rare'], ['zb', 'itf', 'Forzato estremo', 'Extreme interference', 'raro', 'rare'], ['zc', 'itf', 'Forzato estremo', 'Extreme interference', 'raro', 'rare']
    ],
    grades: [
      [1, 4, 'Calibri e strumenti di misura', 'Gauges and measuring instruments', 'lappatura, rettifica finissima', 'lapping, very fine grinding'],
      [5, 5, 'Precisione molto alta', 'Very high precision', 'rettifica fine; cuscinetti di precisione', 'fine grinding; precision bearings'],
      [6, 7, 'Precisione normale per accoppiamenti', 'Normal precision for fits', 'rettifica, alesatura, tornitura fine (H7, g6, k6, p6…)', 'grinding, reaming, fine turning (H7, g6, k6, p6…)'],
      [8, 9, 'Meccanica corrente', 'General machining', 'tornitura e fresatura accurate (H8/f7, H9/d9)', 'accurate turning and milling (H8/f7, H9/d9)'],
      [10, 11, 'Meccanica grossolana', 'Coarse machining', 'tornitura e fresatura normali, foratura (H11/c11)', 'ordinary turning and milling, drilling (H11/c11)'],
      [12, 14, 'Parti non accoppiate', 'Non-mating parts', 'quote generali, lamiera, grezzi lavorati', 'general dimensions, sheet metal, machined blanks'],
      [15, 18, 'Molto grossolano', 'Very coarse', 'fusione, stampaggio, saldatura', 'casting, forging, welding']
    ],
    terms: {
      it: [['Dimensione nominale', 'La quota scritta sul disegno (es. Ø25): da lì si misurano gli scostamenti.'],
           ['Linea dello zero', 'Il nominale visto come riga di riferimento: sopra = scostamenti positivi, sotto = negativi.'],
           ['Scostamento superiore / inferiore', 'Quanto il limite massimo (ES, es) e il limite minimo (EI, ei) distano dal nominale, in µm. Maiuscolo per il foro, minuscolo per l\'albero.'],
           ['Tolleranza', 'La differenza fra limite massimo e minimo: quanto può variare il pezzo e restare buono. Non ha segno.'],
           ['µm (micron)', 'Un millesimo di millimetro. 21 µm = 0,021 mm.'],
           ['Grado IT', 'Il numero della classe (il 7 di H7): dice quanto è larga la tolleranza. Più il numero è basso, più la lavorazione è precisa.'],
           ['Lettera di posizione', 'La lettera della classe (la H di H7): dice dove sta la tolleranza rispetto al nominale. Maiuscola = foro, minuscola = albero.'],
           ['Foro base (H)', 'Sistema in cui il foro ha sempre scostamento inferiore 0 e si sceglie l\'albero per ottenere gioco o interferenza. È il più usato: i fori si fanno con utensili a misura fissa.'],
           ['Albero base (h)', 'Sistema speculare: albero con scostamento superiore 0, si sceglie il foro. Utile con alberi commerciali rettificati.'],
           ['Gioco', 'Foro più grande dell\'albero: le parti scorrono o ruotano. Gioco minimo = foro min − albero max; gioco massimo = foro max − albero min.'],
           ['Interferenza (forzato)', 'Albero più grande del foro: si monta a pressa o a caldo e le parti restano unite.'],
           ['Incerto (di transizione)', 'A seconda dei pezzi reali può uscire un piccolo gioco o una piccola interferenza.'],
           ['DENTRO / FUORI', 'La misura letta sta fra i due limiti (pezzo conforme) oppure no.'],
           ['App. A', 'Appendice A di ISO 286-1: l\'elenco degli accoppiamenti consigliati dalla norma per coprire i casi più comuni.']],
      en: [['Nominal size', 'The size written on the drawing (e.g. Ø25): deviations are measured from it.'],
           ['Zero line', 'The nominal seen as a reference line: above = positive deviations, below = negative.'],
           ['Upper / lower deviation', 'How far the maximum limit (ES, es) and the minimum limit (EI, ei) are from nominal, in µm. Capitals for the hole, lower case for the shaft.'],
           ['Tolerance', 'The difference between maximum and minimum limit: how much the part may vary and still be good. It has no sign.'],
           ['µm (micron)', 'One thousandth of a millimetre. 21 µm = 0.021 mm.'],
           ['IT grade', 'The number of the class (the 7 in H7): how wide the tolerance is. The lower the number, the more precise the machining.'],
           ['Position letter', 'The letter of the class (the H in H7): where the tolerance sits with respect to nominal. Capital = hole, lower case = shaft.'],
           ['Hole basis (H)', 'System where the hole always has lower deviation 0 and the shaft is chosen to get clearance or interference. The most used: holes are made with fixed-size tools.'],
           ['Shaft basis (h)', 'Mirror system: shaft with upper deviation 0, the hole is chosen. Useful with ground commercial shafts.'],
           ['Clearance', 'Hole larger than shaft: parts slide or rotate. Min clearance = hole min − shaft max; max clearance = hole max − shaft min.'],
           ['Interference (press fit)', 'Shaft larger than hole: assembled by press or heat, parts stay together.'],
           ['Transition', 'Depending on the actual parts, a small clearance or a small interference may result.'],
           ['IN / OUT', 'The reading lies between the two limits (conforming part) or not.'],
           ['Annex A', 'Annex A of ISO 286-1: the list of fits recommended by the standard to cover the most common cases.']]
    }
  };
  function glossLetter(letter) { var L = letter.toLowerCase(); for (var i = 0; i < GLOSS.letters.length; i++) if (GLOSS.letters[i][0] === L) return GLOSS.letters[i]; return null; }
  function glossGrade(g) { for (var i = 0; i < GLOSS.grades.length; i++) if (g >= GLOSS.grades[i][0] && g <= GLOSS.grades[i][1]) return GLOSS.grades[i]; return null; }
  /* Spiegazione in parole di una classe («H7», «g6»), con i numeri del Ø se dato: {ok, html, text} o {ok:false, err} */
  function explain(cls, D, l) {
    /* v4.6: la lingua richiesta vale per TUTTO il testo, numeri compresi (num/mm/um e t('err') leggono «lang»): la si imposta per la durata
       della chiamata e si ripristina. Senza questo l'autoverifica all'avvio falliva con l'app in inglese (3 errori su 2066, iPhone, 03/10). */
    var prev = lang; if (l && T[l]) lang = l;
    try { return explainIn(cls, D); } finally { lang = prev; }
  }
  function explainIn(cls, D) {
    var l = lang, en = l === 'en', pc = parseClass(String(cls || '').trim());
    if (!pc) return { ok: false, err: en ? 'Write a class like H7, g6, k6 or P7.' : 'Scrivi una classe come H7, g6, k6 o P7.' };
    var gl = glossLetter(pc.letter), gg = glossGrade(pc.grade), isH = pc.kind === 'hole', name = pc.letter + pc.grade;
    if (!gl || !gg) return { ok: false, err: en ? 'Class not recognised.' : 'Classe non riconosciuta.' };
    var who = isH ? (en ? 'hole' : 'foro') : (en ? 'shaft' : 'albero');
    var side;
    if (gl[1] === 'base') side = isH ? (en ? 'HOLE BASIS: the lower deviation is 0, the minimum size is exactly the nominal and the tolerance is all above it.' : 'FORO BASE: lo scostamento inferiore è 0, la dimensione minima è esattamente il nominale e tutta la tolleranza sta sopra.')
                                   : (en ? 'SHAFT BASIS: the upper deviation is 0, the maximum size is exactly the nominal and the tolerance is all below it.' : 'ALBERO BASE: lo scostamento superiore è 0, la dimensione massima è esattamente il nominale e tutta la tolleranza sta sotto.');
    else if (gl[1] === 'clr') side = isH ? (en ? 'the tolerance sits ABOVE the nominal (larger hole): paired with a shaft h it gives clearance.' : 'la tolleranza sta SOPRA il nominale (foro più grande): accoppiato a un albero h dà gioco.')
                                        : (en ? 'the tolerance sits BELOW the nominal (smaller shaft): paired with a hole H it gives clearance.' : 'la tolleranza sta SOTTO il nominale (albero più piccolo): accoppiato a un foro H dà gioco.');
    else if (gl[1] === 'trn') side = en ? 'the tolerance straddles the nominal: with the basic ' + (isH ? 'shaft h' : 'hole H') + ' the fit is a transition (small clearance or small interference).' : 'la tolleranza sta a cavallo del nominale: con ' + (isH ? 'l\'albero h' : 'il foro H') + ' di base l\'accoppiamento è incerto (piccolo gioco o piccola interferenza).';
    else side = isH ? (en ? 'the tolerance sits BELOW the nominal (smaller hole): paired with a shaft h it gives interference.' : 'la tolleranza sta SOTTO il nominale (foro più piccolo): accoppiato a un albero h dà interferenza.')
                    : (en ? 'the tolerance sits ABOVE the nominal (larger shaft): paired with a hole H it gives interference.' : 'la tolleranza sta SOPRA il nominale (albero più grande): accoppiato a un foro H dà interferenza.');
    var nm = en ? gl[3] : gl[2], use = en ? gl[5] : gl[4];
    if (gl[1] === 'base') {
      nm = isH ? (en ? 'Lower deviation zero' : 'Scostamento inferiore zero') : (en ? 'Upper deviation zero' : 'Scostamento superiore zero');
      use = isH ? (en ? 'the most used system: the hole stays fixed and the shaft is chosen to get clearance, transition or interference (H7/g6, H7/k6, H7/p6)' : 'il sistema più usato: il foro resta fisso e si sceglie l\'albero per avere gioco, incerto o forzato (H7/g6, H7/k6, H7/p6)')
                : (en ? 'mirror image of the hole basis: the hole is chosen; with H7 it is hand-assembled with no appreciable clearance (H7/h6)' : 'speculare al foro base: si sceglie il foro; con H7 si monta a mano senza gioco apprezzabile (H7/h6)');
    }
    var p1 = '<b>' + esc(pc.letter) + '</b> = ' + nm + ' (' + who + '): ' + side + ' ' + (en ? 'Typical use: ' : 'Uso tipico: ') + esc(use) + '.';
    var p2 = '<b>' + pc.grade + '</b> = ' + (en ? 'grade IT' : 'grado IT') + pc.grade + ', ' + (en ? gg[3] : gg[2]).toLowerCase() + ' (' + esc(en ? gg[5] : gg[4]) + ').';
    var p3 = '', txt3 = '';
    if (D > 0 && D <= 500) {
      var o = limits(pc.kind, pc.letter, pc.grade, D);
      if (o.ok) { var half = isHalf(o), f = formats(o, en ? '.' : ',');
        p3 = (en ? 'At Ø' : 'A Ø') + fmtD(D) + ': ' + (en ? 'deviations ' : 'scostamenti ') + '<span class="num">' + um(o.up) + ' / ' + um(o.lo) + ' µm</span>' + (en ? ', so the part is good from ' : ', quindi il pezzo è buono da ') + '<span class="num">' + mm(o.min, half) + '</span>' + (en ? ' to ' : ' a ') + '<span class="num">' + mm(o.max, half) + ' mm</span> (' + (en ? 'tolerance ' : 'tolleranza ') + umAbs(o.it) + ' µm).';
        txt3 = (en ? 'At Ø' : 'A Ø') + fmtD(D) + ': ' + um(o.up) + ' / ' + um(o.lo) + ' µm → ' + f.lim + ' mm.'; }
      else p3 = '<span class="bad">' + esc(t('err')[o.err] || '') + '</span>';
    }
    var html = '<p>' + p1 + '</p><p>' + p2 + '</p>' + (p3 ? '<p>' + p3 + '</p>' : '');
    return { ok: true, name: name, html: html, text: html.replace(/<[^>]+>/g, '') };
  }

  /* ── Ricerca inversa (v4.1): quali coppie della parete (fori A9…S8, alberi a9…u6) danno il gioco/interferenza richiesto a questo Ø.
        opt.type 'clearance' | 'transition' | 'interference' · opt.min / opt.max in µm (vuoto o non numerico = nessun vincolo):
        gioco: min ≤ Gmin e Gmax ≤ max · interferenza: min ≤ Imin e Imax ≤ max · incerto: Imax ≤ min (qui «min» = interferenza massima ammessa) e Gmax ≤ max
        opt.basis 'hole' (solo fori H) | 'shaft' (solo alberi h) | 'all'.
        Ordine DICHIARATO e neutro: somma dei gradi IT crescente (dalla coppia più fine alla più grossolana), poi grado del foro, poi dell'albero, poi lettere.
        Nessun giudizio di «migliore»: pref = true segnala solo che la coppia è nell'Appendice A di ISO 286-1. ── */
  function findFits(D, opt) {
    opt = opt || {}; var type = opt.type || 'clearance', basis = opt.basis || 'hole';
    function numOrNull(v) { if (v === null || v === undefined || v === '') return null; var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }
    var lo = numOrNull(opt.min), hi = numOrNull(opt.max);
    var pref = {}; FITS.forEach(function (f) { pref[f[0] + '/' + f[1]] = true; });
    var HS = [], SS = [];
    COLS.hole.forEach(function (c) { if (basis === 'hole' && !/^H\d/.test(c)) return; var pc = parseClass(c), o = limits('hole', pc.letter, pc.grade, D); if (o.ok) HS.push([c, o]); });
    COLS.shaft.forEach(function (c) { if (basis === 'shaft' && !/^h\d/.test(c)) return; var pc = parseClass(c), o = limits('shaft', pc.letter, pc.grade, D); if (o.ok) SS.push([c, o]); });
    var out = [];
    HS.forEach(function (h) { var H = h[1]; SS.forEach(function (sh) { var S = sh[1];
      var gmax = r1(H.up - S.lo), gmin = r1(H.lo - S.up), ty = gmin >= 0 ? 'clearance' : (gmax <= 0 ? 'interference' : 'transition');
      if (ty !== type) return;
      var r = { hole: h[0], shaft: sh[0], type: ty, gmin: gmin, gmax: gmax, clrMax: gmax > 0 ? gmax : 0, clrMin: gmin > 0 ? gmin : 0, intMax: gmin < 0 ? -gmin : 0, intMin: gmax < 0 ? -gmax : 0, hg: H.grade, sg: S.grade, itSum: H.grade + S.grade, pref: !!pref[h[0] + '/' + sh[0]] };
      if (ty === 'clearance') { if (lo !== null && r.clrMin < lo) return; if (hi !== null && r.clrMax > hi) return; }
      else if (ty === 'interference') { if (lo !== null && r.intMin < lo) return; if (hi !== null && r.intMax > hi) return; }
      else { if (lo !== null && r.intMax > lo) return; if (hi !== null && r.clrMax > hi) return; }
      out.push(r); }); });
    out.sort(function (a, b) { return a.itSum - b.itSum || a.hg - b.hg || a.sg - b.sg || (a.hole < b.hole ? -1 : a.hole > b.hole ? 1 : 0) || (a.shaft < b.shaft ? -1 : a.shaft > b.shaft ? 1 : 0); });
    return out;
  }

  /* ── Quota tollerata pronta per un disegno/sketch: TolISO.dim('25 k6') o TolISO.dim(25, 'k6')
        → {ok, text:'Ø25 k6', kind, up, lo (µm), upMm:'+0.015', loMm:'+0.002' (stringhe in mm, 3 o 4 decimali), max, min, mean (mm)} ── */
  function dim(a, b) {
    var D, c;
    if (b === undefined) { var p = parse(a); if (!p || (p.hole && p.shaft)) return { ok: false, err: 'class' }; D = p.D; c = p.hole || p.shaft; }
    else { D = Number(a); c = parseClass(b); if (!c) return { ok: false, err: 'class' }; }
    var o = limits(c.kind, c.letter, c.grade, D);
    if (!o.ok) return o;
    var q = parts(o, {});
    o.text = q.cls; o.upMm = q.up; o.loMm = q.lo; o.formats = formats(o, '.'); o.parts = q;
    return o;
  }

  /* ── FORMATTAZIONE: un solo posto per tutte le scritture in mm, usato dai pulsanti «Copia quota» di questo strumento
        e dagli altri progetti che incorporano il modulo (UTR Sketcher Alberi la usa per le quote del foglio).
        opt = { sep: separatore decimale ('.' o ','), trim: taglia gli zeri finali come si scrive sui disegni,
                minus: segno del negativo ('-' per il CAD, '\u2212' tipografico per il disegno) }
        parts(o, opt) → { up, lo, dev, max, min, nom, cls, both, lim, dec }  ·  devStr(um, opt) → scostamento in mm ('+0,015', '\u22120,19', '0') */
  function fmtOpt(opt) {
    opt = opt || {};
    return { sep: opt.sep || '.', trim: !!opt.trim, minus: opt.minus || '-', dec: opt.dec };
  }
  function mmStr(mm, dec, op) {
    var x = Math.abs(mm).toFixed(dec);
    if (op.trim && x.indexOf('.') >= 0) x = x.replace(/0+$/, '').replace(/\.$/, '.0');
    return (mm < 0 ? op.minus : '') + x.replace('.', op.sep);
  }
  function decDi(o) { return (o.up % 1 !== 0 || o.lo % 1 !== 0) ? 4 : 3; }
  function devStr(um, opt, dec) {
    var op = fmtOpt(opt);
    if (um === 0) return '0';
    return (um > 0 ? '+' : '') + mmStr(um / 1000, dec === undefined ? (um % 1 !== 0 ? 4 : 3) : dec, op);
  }
  function parts(o, opt) {
    var op = fmtOpt(opt), dec = op.dec === undefined ? decDi(o) : op.dec;
    var up = devStr(o.up, opt, dec), lo = devStr(o.lo, opt, dec);
    var dev = (o.up === -o.lo && o.up !== 0) ? '\u00B1' + mmStr(o.up / 1000, dec, op) : up + '/' + lo;
    var nom = String(o.D).replace('.', op.sep), dia = '\u00D8' + nom;
    return { up: up, lo: lo, dev: dev, max: mmStr(o.max, dec, op), min: mmStr(o.min, dec, op), nom: nom, dec: dec,
             cls: dia + ' ' + o.letter + o.grade, both: dia + ' ' + o.letter + o.grade + ' (' + dev + ')', lim: mmStr(o.max, dec, op) + ' / ' + mmStr(o.min, dec, op) };
  }
  /* Formati per «Copia quota»: come prima (separatore scelto, niente taglio degli zeri, meno normale da incollare nel CAD) */
  function formats(o, sep) {
    var q = parts(o, { sep: sep || '.' });
    return { cls: q.cls, dev: '\u00D8' + q.nom + ' ' + q.dev, both: q.both, lim: q.lim };
  }

  /* ════════ UI ════════ */
  var lang = 'it', root = null, side = 'hole', tab = 'hole', filter = 'all', viewFi = -1;   /* viewFi: fascia mostrata nelle schede (-1 = quella del Ø) */
  var T = {
    it: { none: '— nessuno —', hole: 'Foro', shaft: 'Albero', fitL: 'Accoppiamento', fitTr: 'Accoppiamento incerto (di transizione)',
          up_h: 'scostamento superiore ES', lo_h: 'scostamento inferiore EI', up_s: 'scostamento superiore es', lo_s: 'scostamento inferiore ei',
          dmax: 'dimensione massima', dmin: 'dimensione minima', dmean: 'centro tolleranza', itw: 'ampiezza tolleranza',
          range: 'fascia', over: 'oltre', upto: 'fino a', param: 'Grandezza', nominal: 'dimensione nominale', upDev: 'scostamento superiore', loDev: 'scostamento inferiore',
          clearance: 'CON GIOCO', transition: 'INCERTO', interference: 'CON INTERFERENZA',
          gmax: 'gioco massimo', gmin: 'gioco minimo', imax: 'interferenza massima', imin: 'interferenza minima',
          copy: 'Copia quota', copied: 'copiato', empty: 'Inserisci una dimensione nominale e scegli una classe di tolleranza.',
          scale: 'Linea 0 = Ø nominale · scala verticale: 1 tacca = {s} µm · altezze delle zone in scala esatta · larghezze schematiche',
          nomrange: 'Dimensioni nominali mm', bad: 'Scrittura non riconosciuta. Esempi: 25 H7 · 25 g6 · 25 H7/g6',
          err: { range: 'Dimensione nominale fuori campo: deve essere maggiore di 0 e al massimo 500 mm.',
                 letter: 'Lettera di posizione non valida.', grade: 'Grado IT non valido (1…18).',
                 gradelow: 'I gradi IT1 e IT2 sono previsti solo per H, h, JS, js.',
                 it14: 'I gradi IT14…IT18 non si applicano a dimensioni fino a 1 mm.',
                 ab1: 'Le posizioni a, b (A, B) non si applicano a dimensioni fino a 1 mm.',
                 jgrade: 'La posizione j/J esiste solo per j5…j7 (j8 fino a 3 mm) e J6…J8.',
                 size: 'Questa posizione non è prevista dalla norma per questa dimensione nominale.',
                 kgrade: 'Il foro K oltre IT8 è previsto solo fino a 3 mm.',
                 n1: 'Il foro N oltre IT8 non si applica a dimensioni fino a 1 mm.', class: 'Classe non valida.' } },
    en: { none: '— none —', hole: 'Hole', shaft: 'Shaft', fitL: 'Fit', fitTr: 'Transition fit',
          up_h: 'upper deviation ES', lo_h: 'lower deviation EI', up_s: 'upper deviation es', lo_s: 'lower deviation ei',
          dmax: 'maximum size', dmin: 'minimum size', dmean: 'tolerance centre', itw: 'tolerance width',
          range: 'range', over: 'over', upto: 'up to', param: 'Quantity', nominal: 'nominal size', upDev: 'upper deviation', loDev: 'lower deviation',
          clearance: 'CLEARANCE', transition: 'TRANSITION', interference: 'INTERFERENCE',
          gmax: 'maximum clearance', gmin: 'minimum clearance', imax: 'maximum interference', imin: 'minimum interference',
          copy: 'Copy dimension', copied: 'copied', empty: 'Enter a nominal size and choose a tolerance class.',
          scale: 'Line 0 = nominal Ø · vertical scale: 1 tick = {s} µm · zone heights exactly to scale · widths schematic',
          nomrange: 'Nominal sizes mm', bad: 'Entry not recognised. Examples: 25 H7 · 25 g6 · 25 H7/g6',
          err: { range: 'Nominal size out of range: must be greater than 0 and at most 500 mm.',
                 letter: 'Invalid position letter.', grade: 'Invalid IT grade (1…18).',
                 gradelow: 'Grades IT1 and IT2 are provided only for H, h, JS, js.',
                 it14: 'Grades IT14…IT18 do not apply to sizes up to 1 mm.',
                 ab1: 'Positions a, b (A, B) do not apply to sizes up to 1 mm.',
                 jgrade: 'Position j/J exists only for j5…j7 (j8 up to 3 mm) and J6…J8.',
                 size: 'This position is not provided by the standard for this nominal size.',
                 kgrade: 'Hole K above IT8 is provided only up to 3 mm.',
                 n1: 'Hole N above IT8 does not apply to sizes up to 1 mm.', class: 'Invalid class.' } }
  };
  function t(k) { return T[lang][k]; }

  var CHIPS = { hole: ['H6', 'H7', 'H8', 'H9', 'H11', 'G7', 'F7', 'F8', 'E8', 'D10', 'JS7', 'K7', 'M7', 'N7', 'P7', 'R7', 'S7'],
                shaft: ['h5', 'h6', 'h7', 'h8', 'h9', 'h11', 'g6', 'f7', 'e8', 'd9', 'js6', 'k6', 'm6', 'n6', 'p6', 'r6', 's6'] };
  /* Colonne della parete: unione della tabella a parete EVO (UNI ISO 286/2 1995, foto del 24/09/2026) e del regolo Talide, per lettera e poi per grado */
  var COLS = {
    hole:  ['A9', 'A11', 'B9', 'B11', 'C9', 'C11', 'D9', 'D10', 'D11', 'E7', 'E8', 'E9', 'EF8', 'F6', 'F7', 'F8', 'F9', 'G6', 'G7',
            'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12', 'H13', 'JS5', 'JS6', 'JS7', 'JS9', 'J6', 'J7', 'J8',
            'K6', 'K7', 'K8', 'M6', 'M7', 'M8', 'N6', 'N7', 'N8', 'N9', 'P6', 'P7', 'P8', 'P9', 'R7', 'R8', 'S7', 'S8'],
    shaft: ['a9', 'a11', 'b9', 'b11', 'c9', 'c11', 'd9', 'd10', 'd11', 'e7', 'e8', 'e9', 'f6', 'f7', 'f8', 'g5', 'g6', 'g7',
            'h5', 'h6', 'h7', 'h8', 'h9', 'h10', 'h11', 'h12', 'h13', 'js5', 'js6', 'js7', 'js8', 'j5', 'j6', 'j7',
            'k5', 'k6', 'k7', 'k8', 'm5', 'm6', 'm7', 'n5', 'n6', 'n7', 'p5', 'p6', 'p7', 'p8', 'r6', 'r7', 's6', 's7', 'u6']
  };


  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function num(v, dec) { var s = v.toFixed(dec); return lang === 'it' ? s.replace('.', ',') : s; }
  /* µm con segno: +21 · −7 · 0 · +10,5 */
  function um(v) {
    var a = Math.abs(v), s = (a % 1 === 0) ? String(a) : num(a, 1);
    return v > 0 ? '+' + s : (v < 0 ? '−' + s : '0');
  }
  function umAbs(v) { return (v % 1 === 0) ? String(v) : num(v, 1); }
  function mm(v, half) { return num(v, half ? 4 : 3); }
  function isHalf(o) { return (o.up % 1 !== 0) || (o.lo % 1 !== 0); }   /* 4 decimali solo con scostamenti al mezzo micron (js/JS, gradi fini) */
  function rangeTxt(a, b) { return a === 0 ? '≤ ' + b : t('over') + ' ' + a + ' ' + t('upto') + ' ' + b; }

  function fillSelects() {
    [['h', true], ['s', false]].forEach(function (p) {
      var sl = $('tol-' + p[0] + '-let'), sg = $('tol-' + p[0] + '-gr'), keepL = sl.value, keepG = sg.value, h = '';
      h += '<option value="">' + t('none') + '</option>';
      LETTERS.forEach(function (L) { var v = p[1] ? L.toUpperCase() : L; h += '<option value="' + v + '">' + v + '</option>'; });
      sl.innerHTML = h; sl.value = keepL;
      if (!sg.options.length) {
        h = ''; for (var g = 1; g <= 18; g++) h += '<option value="' + g + '">' + g + '</option>';
        sg.innerHTML = h; sg.value = keepG || '7';
      }
    });
  }
  function fillChips() {
    ['hole', 'shaft'].forEach(function (k) {
      var box = $('tol-' + (k === 'hole' ? 'h' : 's') + '-chips'), h = '';
      CHIPS[k].forEach(function (c) { h += '<button type="button" class="tol-chip" data-cls="' + c + '">' + c + '</button>'; });
      box.innerHTML = h;
    });
  }
  function getState() {
    var D = parseFloat(String($('tol-d').value).replace(',', '.'));   /* «25 H7/g6»: il numero iniziale è il Ø, le lettere le gestisce applyD() */
    var hl = $('tol-h-let').value, sl = $('tol-s-let').value;
    return { D: D, hole: hl ? { kind: 'hole', letter: hl, grade: parseInt($('tol-h-gr').value, 10) } : null,
             shaft: sl ? { kind: 'shaft', letter: sl, grade: parseInt($('tol-s-gr').value, 10) } : null };
  }
  function setClass(c) {
    var p = c.kind === 'hole' ? 'h' : 's';
    $('tol-' + p + '-let').value = c.kind === 'hole' ? c.letter.toUpperCase() : c.letter.toLowerCase();
    $('tol-' + p + '-gr').value = String(c.grade);
  }

  function tile(sym, val, unit, desc, color) {
    return '<div class="tol-tile"><span class="s">' + sym + '</span><span class="v ' + (color || '') + '">' + val + '</span><span class="u">' + unit + '</span><span class="d">' + desc + '</span></div>';
  }
  function resBlock(o) {
    var isH = o.kind === 'hole', half = isHalf(o), col = isH ? 'tol-c-blue' : 'tol-c-amber';
    var h = '<div class="tol-res-h ' + (isH ? 'tol-hole' : 'tol-shaft') + '"><b>Ø' + esc(num(o.D, 3).replace(/[.,]?0+$/, '')) + ' ' + o.letter + o.grade + '</b><small>' +
            (isH ? t('hole') : t('shaft')) + ' · ' + t('range') + ' ' + rangeTxt(o.from, o.to) + ' mm · IT' + o.grade + ' = ' + umAbs(o.it) + ' µm</small></div>';
    h += '<div class="tol-tiles">';
    h += tile(isH ? 'ES' : 'es', um(o.up), 'µm', isH ? t('up_h') : t('up_s'), col);
    h += tile(isH ? 'EI' : 'ei', um(o.lo), 'µm', isH ? t('lo_h') : t('lo_s'), col);
    h += tile('D<sub>max</sub>', mm(o.max, half), 'mm', t('dmax'));
    h += tile('D<sub>min</sub>', mm(o.min, half), 'mm', t('dmin'));
    h += tile('D<sub>c</sub>', mm(o.mean, true), 'mm', t('dmean'), 'tol-c-purple');
    h += '</div>';
    var f = formats(o, lang === 'it' ? ',' : '.');
    h += '<div class="tol-copyrow tol-noprint"><span class="tol-hint">' + t('copy') + ':</span>';
    ['cls', 'dev', 'both', 'lim'].forEach(function (k) { h += '<button type="button" class="tol-chip tol-copy" data-copy="' + esc(f[k]) + '">' + esc(f[k]) + '</button>'; });
    h += '</div>';
    return h;
  }
  /* ── FORZATO: pressione di contatto e forza di montaggio (cilindri spessi, Lamé, elastico).
     δ (interferenza diametrale, mm) = p · d · [ (1/E_m)·((De²+d²)/(De²−d²) + ν_m) + (1/E_a)·((d²+di²)/(d²−di²) − ν_a) ]
     F assiale = p · π · d · L · μ · M trasmissibile = F · d/2 · σ tangenziale mozzo (bordo foro) = p · (De²+d²)/(De²−d²)
     Formule standard (Niemann/Roloff-Matek); verificate contro un'app indipendente (TolerangeLab): Ø25 H7/u6, De 50, L 25, E 205000, ν 0,29 → p 83,02/187,57 MPa. ── */
  var MAT = { steel: { E: 210000, nu: 0.30, Re: 355, it: 'Acciaio', en: 'Steel' }, cast: { E: 110000, nu: 0.26, Re: 200, it: 'Ghisa', en: 'Cast iron' },
              alu: { E: 70000, nu: 0.33, Re: 240, it: 'Alluminio', en: 'Aluminium' }, bronze: { E: 110000, nu: 0.34, Re: 200, it: 'Bronzo', en: 'Bronze' } };
  var press = { De: null, di: 0, L: null, mu: 0.15, mh: 'steel', ms: 'steel', Eh: null, nuh: null, Es: null, nus: null, Re: null };
  function pressCalc(d, deltaUm, q) {
    /* d, De, di, L in mm · delta in µm · E in MPa → p in MPa, F in N, M in N·mm, sigma in MPa */
    var De = q.De, di = q.di || 0, delta = deltaUm / 1000;
    if (!(d > 0) || !(De > d) || !(di >= 0) || !(di < d) || !(q.L > 0) || !(q.Eh > 0) || !(q.Es > 0)) return null;
    var kh = (De * De + d * d) / (De * De - d * d), ks = (d * d + di * di) / (d * d - di * di);
    var c = (kh + q.nuh) / q.Eh + (ks - q.nus) / q.Es;
    var p = delta / (d * c);
    var F = p * Math.PI * d * q.L * q.mu, M = F * d / 2, sig = p * kh;
    return { p: p, F: F, M: M, sig: sig, kh: kh };
  }
  function pressBlock(f, D) {
    if (!(f.intMax > 0)) return '';
    var q = { De: press.De || Math.round(2 * D * 100) / 100, di: press.di || 0, L: press.L || Math.round(D * 100) / 100, mu: press.mu,
              Eh: press.Eh || MAT[press.mh].E, nuh: (press.nuh !== null ? press.nuh : MAT[press.mh].nu), Es: press.Es || MAT[press.ms].E, nus: (press.nus !== null ? press.nus : MAT[press.ms].nu), Re: press.Re || MAT[press.mh].Re };
    var L2 = lang === 'it' ? { title: 'Forzato: pressione e forza di montaggio', De: 'Ø esterno mozzo', di: 'Ø interno albero (0 = pieno)', L: 'Lunghezza accoppiamento', mu: 'Attrito μ', mh: 'Materiale mozzo', ms: 'Materiale albero', Re: 'Snervamento mozzo Re',
                             col: ['', 'interf. min', 'interf. max'], rows: ['Interferenza', 'Pressione di contatto', 'Forza di montaggio (pressa)', 'Coppia trasmissibile', 'Sollecitazione mozzo (bordo foro)'], dT: 'Calettamento a caldo: scaldare il mozzo di circa', warn: 'La sollecitazione nel mozzo supera lo snervamento: il mozzo si deforma in modo permanente. Ridurre l\'interferenza o aumentare lo spessore del mozzo.',
                             note: 'Modello elastico dei cilindri spessi (Lamé), pressione uniforme, senza rugosità né effetti termici; l\'interferenza effettiva è un po\' minore di quella nominale per lo schiacciamento delle creste (≈ 0,8·(Rz mozzo + Rz albero)). Valori indicativi per dimensionare la pressa: per un forzato importante fa fede il calcolo del progettista.' }
                          : { title: 'Interference fit: pressure and assembly force', De: 'Hub outside Ø', di: 'Shaft bore Ø (0 = solid)', L: 'Joint length', mu: 'Friction μ', mh: 'Hub material', ms: 'Shaft material', Re: 'Hub yield strength Re',
                             col: ['', 'min interf.', 'max interf.'], rows: ['Interference', 'Contact pressure', 'Assembly force (press)', 'Transmissible torque', 'Hub stress (bore edge)'], dT: 'Shrink fit: heat the hub by about', warn: 'Hub stress exceeds the yield strength: the hub deforms permanently. Reduce the interference or increase the hub thickness.',
                             note: 'Elastic thick-cylinder model (Lamé), uniform pressure, no roughness or thermal effects; the effective interference is slightly below nominal due to asperity flattening (≈ 0.8·(Rz hub + Rz shaft)). Indicative values to size the press: for an important fit the designer\'s calculation prevails.' };
    var imin = Math.max(0, f.intMin || 0), imax = f.intMax, a = pressCalc(D, imin, q), b = pressCalc(D, imax, q);
    function inp(id, val, step, lbl) { return '<div><div class="tol-lbl">' + lbl + '</div><div class="tol-inp"><input type="text" inputmode="decimal" data-press="' + id + '" value="' + val + '"></div></div>'; }
    function sel(id, val, lbl) { var h = '<div><div class="tol-lbl">' + lbl + '</div><div class="tol-inp"><select data-press="' + id + '">'; Object.keys(MAT).forEach(function (k) { h += '<option value="' + k + '"' + (k === val ? ' selected' : '') + '>' + MAT[k][lang] + ' (E ' + (MAT[k].E / 1000) + ' GPa)</option>'; }); return h + '</select></div></div>'; }
    var h = '<details class="tol-acc tol-press" id="tol-press-det"' + (press.open ? ' open' : '') + '><summary><span>' + L2.title + '</span><span class="chev"></span></summary><div class="body">';
    h += '<div class="grid">' + inp('De', q.De, 0.1, L2.De + ' <span>mm</span>') + inp('di', q.di, 0.1, L2.di + ' <span>mm</span>') + inp('L', q.L, 0.1, L2.L + ' <span>mm</span>') + inp('mu', q.mu, 0.01, L2.mu) + sel('mh', press.mh, L2.mh) + sel('ms', press.ms, L2.ms) + inp('Re', q.Re, 5, L2.Re + ' <span>MPa</span>') + '</div>';
    if (!a || !b) return h + '<div class="warn">' + (lang === 'it' ? 'Dati non validi: Ø esterno mozzo > Ø nominale, Ø interno albero < Ø nominale, lunghezza > 0.' : 'Invalid data: hub OD > nominal Ø, shaft bore < nominal Ø, length > 0.') + '</div></div></details>';
    function n1(v) { return num(v, 1); } function n2(v) { return num(v, 2); }
    h += '<table><tr><th>' + L2.col[0] + '</th><th>' + L2.col[1] + '</th><th>' + L2.col[2] + '</th></tr>';
    h += '<tr><td>' + L2.rows[0] + '</td><td>' + umAbs(imin) + ' µm</td><td>' + umAbs(imax) + ' µm</td></tr>';
    h += '<tr><td>' + L2.rows[1] + '</td><td><b>' + n1(a.p) + '</b> MPa</td><td><b>' + n1(b.p) + '</b> MPa</td></tr>';
    h += '<tr><td>' + L2.rows[2] + '</td><td><b>' + n2(a.F / 1000) + '</b> kN</td><td><b>' + n2(b.F / 1000) + '</b> kN</td></tr>';
    h += '<tr><td>' + L2.rows[3] + '</td><td>' + n1(a.M / 1000) + ' N·m</td><td>' + n1(b.M / 1000) + ' N·m</td></tr>';
    h += '<tr><td>' + L2.rows[4] + '</td><td>' + n1(a.sig) + ' MPa</td><td>' + n1(b.sig) + ' MPa</td></tr></table>';
    var alpha = 11.5e-6, dT = (imax / 1000 + 0.001 * D) / (alpha * D);
    h += '<div class="note">' + L2.dT + ' <b>' + Math.round(dT) + ' °C</b> (α = 11,5·10⁻⁶/K, con 1 µm/mm di gioco di infilaggio).</div>';
    if (b.sig > q.Re) h += '<div class="warn">' + L2.warn + ' (' + n1(b.sig) + ' MPa > Re ' + q.Re + ' MPa)</div>';
    h += '<div class="note">' + L2.note + '</div>';
    return h + '</div></details>';
  }
  /* ── COLLAUDO DELL'ACCOPPIAMENTO: misure reali di foro e albero → dentro/fuori per ciascuno e gioco/interferenza effettivi ── */
  var insp = { mh: '', ms: '', open: false };
  function inspectBlock(H, S, D) {
    var L = lang === 'it' ? { title: 'Collaudo: misure reali di foro e albero', mh: 'Foro misurato', ms: 'Albero misurato', gap: 'gioco effettivo', itf: 'interferenza effettiva', teo: 'teorico', okH: 'foro DENTRO', koH: 'foro FUORI', okS: 'albero DENTRO', koS: 'albero FUORI', both: 'Coppia conforme: entrambi i pezzi in tolleranza', bad: 'Coppia NON conforme', over: 'oltre il max', under: 'sotto il min', hint: 'Scrivi le due misure lette al collaudo (mm).' }
                          : { title: 'Inspection: measured hole and shaft', mh: 'Measured hole', ms: 'Measured shaft', gap: 'actual clearance', itf: 'actual interference', teo: 'theoretical', okH: 'hole IN', koH: 'hole OUT', okS: 'shaft IN', koS: 'shaft OUT', both: 'Pair conforms: both parts within tolerance', bad: 'Pair does NOT conform', over: 'above max', under: 'below min', hint: 'Enter the two readings from inspection (mm).' };
    var h = '<details class="tol-acc tol-insp" id="tol-insp-det"' + (insp.open ? ' open' : '') + '><summary><span>' + L.title + '</span><span class="chev"></span></summary><div class="body">';
    h += '<div class="grid"><div><div class="tol-lbl">' + L.mh + ' <span>mm</span></div><div class="tol-inp"><input type="text" inputmode="decimal" data-insp="mh" value="' + esc(insp.mh) + '" placeholder="' + esc(num(H.max, 3)) + '"></div></div>' +
         '<div><div class="tol-lbl">' + L.ms + ' <span>mm</span></div><div class="tol-inp"><input type="text" inputmode="decimal" data-insp="ms" value="' + esc(insp.ms) + '" placeholder="' + esc(num(S.min, 3)) + '"></div></div></div>';
    var mh = parseFloat(String(insp.mh).replace(',', '.')), ms = parseFloat(String(insp.ms).replace(',', '.'));
    var okH = mh > 0 ? checkMeasure(H, mh) : null, okS = ms > 0 ? checkMeasure(S, ms) : null;
    if (!okH && !okS) return h + '<div class="tol-hint">' + L.hint + '</div></div></details>';
    h += '<div class="res">';
    function cell(lbl2, c, isH) { if (!c) return ''; var txt = c.ok ? (umAbs(c.toMax) + ' µm ' + (lang === 'it' ? 'dal max' : 'from max') + ' · ' + umAbs(c.toMin) + ' µm ' + (lang === 'it' ? 'dal min' : 'from min')) : (umAbs(c.toMax < 0 ? -c.toMax : -c.toMin) + ' µm ' + (c.toMax < 0 ? L.over : L.under));
      txt += '<br>' + devPctTxt(c); return '<div class="tol-tile"><span class="s">' + lbl2 + '</span><span class="v ' + (c.ok ? 'ok' : 'ko') + '">' + (c.ok ? (isH ? L.okH : L.okS) : (isH ? L.koH : L.koS)) + '</span><span class="d">' + txt + '</span></div>'; }
    h += cell(L.mh + ' ' + (mh > 0 ? num(mh, 3) : ''), okH, true) + cell(L.ms + ' ' + (ms > 0 ? num(ms, 3) : ''), okS, false);
    if (okH && okS) {
      var g = Math.round((mh - ms) * 10000) / 10, f = fit(D, H, S);
      var teo = f.type === 'clearance' ? (umAbs(f.clrMin) + '…' + umAbs(f.clrMax) + ' µm ' + (lang === 'it' ? 'gioco' : 'clearance')) : (f.type === 'interference' ? (umAbs(f.intMin) + '…' + umAbs(f.intMax) + ' µm ' + (lang === 'it' ? 'interf.' : 'interf.')) : ((lang === 'it' ? 'gioco fino a ' : 'clearance up to ') + umAbs(f.clrMax) + ' · ' + (lang === 'it' ? 'interf. fino a ' : 'interf. up to ') + umAbs(f.intMax) + ' µm'));
      h += '<div class="tol-tile"><span class="s">' + (g >= 0 ? L.gap : L.itf) + '</span><span class="v ' + (g >= 0 ? 'tol-c-green' : 'tol-c-red') + '">' + umAbs(Math.abs(g)) + ' µm</span><span class="d">' + L.teo + ': ' + teo + '</span></div>';
    }
    h += '</div>';
    if (okH && okS) h += '<div class="verdict ' + (okH.ok && okS.ok ? 'ok' : 'ko') + '">' + (okH.ok && okS.ok ? L.both : L.bad + ' — ' + (!okH.ok ? L.koH : '') + (!okH.ok && !okS.ok ? ', ' : '') + (!okS.ok ? L.koS : '')) + '</div>';
    return h + '</div></details>';
  }
  function fitBlock(f) {
    var col = f.type === 'clearance' ? 'tol-c-green' : (f.type === 'interference' ? 'tol-c-red' : 'tol-c-amber');
    var h = '<div class="tol-res-h tol-fit"><b class="' + col + '">' + f.hole.letter + f.hole.grade + '/' + f.shaft.letter + f.shaft.grade + ' — ' + t(f.type) + '</b><small>' + (f.type === 'transition' ? t('fitTr') : t('fitL')) + '</small>' + fitImg(f.type) + '</div><div class="tol-tiles">';
    if (f.type === 'clearance') { h += tile('G<sub>max</sub>', umAbs(f.clrMax), 'µm', t('gmax'), col) + tile('G<sub>min</sub>', umAbs(f.clrMin), 'µm', t('gmin'), col); }
    else if (f.type === 'interference') { h += tile('I<sub>max</sub>', umAbs(f.intMax), 'µm', t('imax'), col) + tile('I<sub>min</sub>', umAbs(f.intMin), 'µm', t('imin'), col); }
    else { h += tile('G<sub>max</sub>', umAbs(f.clrMax), 'µm', t('gmax'), 'tol-c-green') + tile('I<sub>max</sub>', umAbs(f.intMax), 'µm', t('imax'), 'tol-c-red'); }
    return h + '</div>';
  }

  /* ── GLOSSARIO (v4.5): scheda in fondo; il campo «Spiegami una classe» usa explain() col Ø corrente ── */
  function buildGloss() {
    var box = $('tol-gloss-body'); if (!box) return;
    var en = lang === 'en', h = '';
    h += '<h4>' + (en ? 'Position letters — hole (capital) / shaft (lower case)' : 'Lettere di posizione — foro (maiuscola) / albero (minuscola)') + '</h4><table><tr><th>' + (en ? 'Letter' : 'Lettera') + '</th><th>' + (en ? 'Where the tolerance sits' : 'Dove sta la tolleranza') + '</th><th>' + (en ? 'Typical use' : 'Uso tipico') + '</th></tr>';
    GLOSS.letters.forEach(function (g) {
      var tag = g[1] === 'base' ? '<span class="tag base">' + (en ? 'basis' : 'base') + '</span>' : g[1] === 'trn' ? '<span class="tag trn">' + (en ? 'transition' : 'incerto') + '</span>' : '';
      var col = g[1] === 'clr' ? 'tol-c-green' : g[1] === 'itf' ? 'tol-c-red' : g[1] === 'trn' ? 'tol-c-amber' : 'tol-c-blue';
      h += '<tr><td class="k"><span class="h">' + g[0].toUpperCase() + '</span> / <span class="s">' + g[0] + '</span></td><td><b class="' + col + '">' + (en ? g[3] : g[2]) + '</b>' + (tag ? ' ' + tag : '') + '</td><td>' + esc(en ? g[5] : g[4]) + '</td></tr>';
    });
    h += '</table><div class="tol-hint" style="margin-top:6px">' + (en ? 'Hole and shaft mirror each other: g (shaft, below nominal) and G (hole, above nominal) both give clearance with the basic member; p and P both give interference.' : 'Foro e albero sono speculari: g (albero, sotto il nominale) e G (foro, sopra il nominale) danno entrambi gioco col pezzo base; p e P danno entrambi interferenza.') + '</div>';
    h += '<h4>' + (en ? 'IT grades — how wide the tolerance is' : 'Gradi IT — quanto è larga la tolleranza') + '</h4><table><tr><th>IT</th><th>' + (en ? 'Meaning' : 'Significato') + '</th><th>' + (en ? 'Typical machining' : 'Lavorazione tipica') + '</th></tr>';
    GLOSS.grades.forEach(function (g) { h += '<tr><td class="k">IT' + g[0] + (g[1] > g[0] ? '…IT' + g[1] : '') + '</td><td>' + (en ? g[3] : g[2]) + '</td><td>' + esc(en ? g[5] : g[4]) + '</td></tr>'; });
    h += '</table><div class="tol-hint" style="margin-top:6px">' + (en ? 'The width in µm of each grade depends on the size: see the IT table below. Example at Ø25: IT6 = 13, IT7 = 21, IT8 = 33, IT11 = 130 µm.' : 'L\'ampiezza in µm di ogni grado dipende dalla dimensione: vedi la tabella IT qui sotto. Esempio a Ø25: IT6 = 13, IT7 = 21, IT8 = 33, IT11 = 130 µm.') + '</div>';
    h += '<h4>' + (en ? 'Words' : 'Parole') + '</h4><dl>';
    GLOSS.terms[lang].forEach(function (tm) { h += '<dt>' + esc(tm[0]) + '</dt><dd>' + esc(tm[1]) + '</dd>'; });
    box.innerHTML = h + '</dl>';
    renderGlossAns();
  }
  function renderGlossAns() {
    var q = $('tol-gloss-q'), a = $('tol-gloss-ans'); if (!q || !a) return;
    var v = q.value.trim(); if (!v) { a.innerHTML = ''; return; }
    var st = getState(), r = explain(v, st.D);
    a.innerHTML = r.ok ? r.html : '<span class="bad">' + esc(r.err) + '</span>';
  }
  function openGloss(cls) {
    var det = $('tol-acc-gloss'); if (!det) return;
    if (cls) $('tol-gloss-q').value = cls;
    det.open = true; renderGlossAns();
    try { det.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
  }
  function glossBtnLabel() {
    var st = getState(), cur = tab === 'fit' ? (st.hole || st.shaft) : st[side], c = cur ? cur.letter + cur.grade : 'H7';
    return (lang === 'en' ? 'What is ' : 'Cos\'è ') + c + '?';
  }

  /* ── TROVA ACCOPPIAMENTO (v4.1): interfaccia sopra findFits(). Si ricalcola solo quando la scheda è aperta. ── */
  var finder = { type: 'clearance', basis: 'hole', a: '', b: '', all: false }, FIND_SHOW = 30;
  var FL = { it: { lbl: { clearance: ['gioco minimo', 'gioco massimo'], transition: ['interferenza massima', 'gioco massimo'], interference: ['interferenza minima', 'interferenza massima'] },
                   basis: { hole: 'foro base H', shaft: 'albero base h', all: 'tutte le coppie' }, seg: { clearance: 'gioco', transition: 'incerto', interference: 'forzato' },
                   hint: 'Coppie della parete (fori A9…S8, alberi a9…u6) che a questo Ø rispettano i limiti scritti; campo vuoto = nessun vincolo. Ordinate dalla più fine alla più grossolana (somma dei gradi IT), senza giudizio di «migliore»: la scelta dipende dall\'uso. App. A = coppia consigliata da ISO 286-1.',
                   none: 'Nessuna coppia della parete rientra in questi limiti a questo Ø: allarga il campo o cambia sistema.', narrow: 'Tra i due limiti ci sono {w} µm, ma a questo Ø la coppia più fine ({p}) varia già di {s} µm: allarga il campo ad almeno {s} µm.', n: 'coppie trovate', one: 'coppia trovata', more: 'Mostra tutte le', less: 'Mostra solo le prime', appA: 'App. A', noD: 'Scrivi prima il Ø in alto.' },
             en: { lbl: { clearance: ['minimum clearance', 'maximum clearance'], transition: ['maximum interference', 'maximum clearance'], interference: ['minimum interference', 'maximum interference'] },
                   basis: { hole: 'hole basis H', shaft: 'shaft basis h', all: 'all pairs' }, seg: { clearance: 'clearance', transition: 'transition', interference: 'interference' },
                   hint: 'Pairs from the chart (holes A9…S8, shafts a9…u6) that meet the limits entered at this Ø; empty field = no constraint. Sorted from finest to coarsest (sum of IT grades), with no “best” judgement: the choice depends on the application. App. A = pair recommended by ISO 286-1.',
                   none: 'No pair from the chart meets these limits at this Ø: widen the range or change the system.', narrow: 'The two limits are {w} µm apart, but at this Ø the finest pair ({p}) already varies by {s} µm: widen the range to at least {s} µm.', n: 'pairs found', one: 'pair found', more: 'Show all', less: 'Show only the first', appA: 'App. A', noD: 'Enter the Ø at the top first.' } };
  function fl(k) { return FL[lang][k]; }
  function findRangeTxt(r) {
    if (r.type === 'clearance') return tu('clr') + ' ' + umAbs(r.clrMin) + '…' + umAbs(r.clrMax) + ' µm';
    if (r.type === 'interference') return tu('itf') + ' ' + umAbs(r.intMin) + '…' + umAbs(r.intMax) + ' µm';
    return tu('clr') + ' ≤ ' + umAbs(r.clrMax) + ' · ' + tu('itf') + ' ≤ ' + umAbs(r.intMax) + ' µm';
  }
  function buildFinder() {
    var det = $('tol-find-det'), out = $('tol-find-out'); if (!det || !out) return;
    Array.prototype.forEach.call($('tol-find-type').children, function (b) { b.classList.toggle('on', b.getAttribute('data-ft') === finder.type); b.textContent = fl('seg')[b.getAttribute('data-ft')]; });
    var lb = fl('lbl')[finder.type]; $('tol-find-l1').textContent = lb[0]; $('tol-find-l2').textContent = lb[1];
    var sel = $('tol-find-basis'); Array.prototype.forEach.call(sel.options, function (o) { o.textContent = fl('basis')[o.value]; }); sel.value = finder.basis;
    if ($('tol-find-a').value !== finder.a) $('tol-find-a').value = finder.a; if ($('tol-find-b').value !== finder.b) $('tol-find-b').value = finder.b;
    $('tol-find-hint').textContent = fl('hint');
    if (!det.open) return;
    var st = getState(), dOk = st.D > 0 && st.D <= 500;
    if (!dOk) { $('tol-find-n').textContent = ''; out.innerHTML = '<div class="none">' + fl('noD') + '</div>'; return; }
    var res = findFits(st.D, { type: finder.type, min: finder.a, max: finder.b, basis: finder.basis });
    var cur = (st.hole && st.shaft) ? st.hole.letter + st.hole.grade + '/' + st.shaft.letter + st.shaft.grade : '';
    var col = finder.type === 'clearance' ? 'tol-c-green' : (finder.type === 'interference' ? 'tol-c-red' : 'tol-c-amber');
    $('tol-find-n').textContent = res.length ? (res.length + ' ' + (res.length === 1 ? fl('one') : fl('n')) + ' · Ø' + fmtD(st.D)) : '';
    if (!res.length) {
      /* perché non c'è niente? se l'utente ha scritto due limiti più vicini della variazione della coppia più fine, glielo diciamo con i numeri */
      var msg = fl('none'), a = parseFloat(String(finder.a).replace(',', '.')), b = parseFloat(String(finder.b).replace(',', '.'));
      if (isFinite(a) && isFinite(b) && b > a) {
        var free = findFits(st.D, { type: finder.type, basis: finder.basis }), best = null;
        free.forEach(function (r) { var sp = r1(r.gmax - r.gmin); if (!best || sp < best.sp) best = { sp: sp, pair: r.hole + '/' + r.shaft }; });
        if (best && best.sp > r1(b - a)) msg = fl('narrow').replace('{w}', umAbs(r1(b - a))).replace('{p}', best.pair).replace(/\{s\}/g, umAbs(best.sp));
      }
      out.innerHTML = '<div class="none">' + msg + '</div>'; return;
    }
    var shown = finder.all ? res : res.slice(0, FIND_SHOW), h = '';
    shown.forEach(function (r) { var pair = r.hole + '/' + r.shaft; h += '<button type="button" class="tol-findrow' + (pair === cur ? ' on' : '') + '" data-fit="' + pair + '"><b>' + pair + '</b><i class="' + col + '">' + findRangeTxt(r) + '</i><span>IT' + r.hg + '+IT' + r.sg + (r.pref ? '<em class="appa">' + fl('appA') + '</em>' : '') + '</span></button>'; });
    if (res.length > FIND_SHOW) h += '<button type="button" class="tol-chip more" data-findmore="1">' + (finder.all ? fl('less') + ' ' + FIND_SHOW : fl('more') + ' ' + res.length) + '</button>';
    out.innerHTML = h;
  }

  /* ── RAPPORTO DI CONTROLLO (v4.0): dati del pezzo + quota, limiti, misura, esito. Testo (WhatsApp), anteprima, stampa A4 solo del rapporto. ── */
  var rep = { pezzo: '', disegno: '', operatore: '', data: '', note: '', open: false };
  var RL = { it: { title: 'RAPPORTO DI CONTROLLO', pezzo: 'Pezzo', disegno: 'Disegno', op: 'Operatore', data: 'Data', note: 'Note', quota: 'Quota', lim: 'Limiti', mis: 'Misura', ctl: 'Controllo', esito: 'ESITO', ok: 'CONFORME', ko: 'NON CONFORME', fitq: 'Accoppiamento', gap: 'Gioco effettivo', itf: 'Interferenza effettiva', teo: 'teorico', pair: 'Coppia', sign: 'Firma operatore', sign2: 'Visto', needM: 'Scrivi prima la misura nel campo «misurato», poi tocca Rapporto.', needF: 'Scrivi prima le misure di foro e albero nel Collaudo, poi tocca Rapporto.', needQ: 'Prima imposta un Ø e una classe di tolleranza.', foot: 'Valori secondo ISO 286-1:2010 e ISO 286-2:2010, verificati contro fonti esterne (2930 caselle). Strumento di consultazione: per il collaudo fa fede la norma. App realizzata da NextCore AI Department per UTR Tiberti · utr-tiberti.github.io/tolleranze' },
             en: { title: 'INSPECTION REPORT', pezzo: 'Part', disegno: 'Drawing', op: 'Inspector', data: 'Date', note: 'Notes', quota: 'Dimension', lim: 'Limits', mis: 'Reading', ctl: 'Check', esito: 'RESULT', ok: 'PASS', ko: 'FAIL', fitq: 'Fit', gap: 'Actual clearance', itf: 'Actual interference', teo: 'theoretical', pair: 'Pair', sign: 'Inspector signature', sign2: 'Approved', needM: 'Type the reading into the «measured» field first, then tap Report.', needF: 'Enter the hole and shaft readings in Inspection first, then tap Report.', needQ: 'Set a Ø and a tolerance class first.', foot: 'Values per ISO 286-1:2010 and ISO 286-2:2010, checked against independent sources (2930 cells). Reference tool: the standard prevails for inspection. App built by NextCore AI Department for UTR Tiberti · utr-tiberti.github.io/tolleranze' } };
  function rl(k) { return RL[lang][k]; }
  function loadRep() { try { var r = JSON.parse(localStorage.getItem('tolIso.rep') || 'null'); if (r) { rep.pezzo = r.pezzo || ''; rep.disegno = r.disegno || ''; rep.operatore = r.operatore || ''; rep.note = r.note || ''; } } catch (e) {} }
  function saveRep() { try { localStorage.setItem('tolIso.rep', JSON.stringify({ pezzo: rep.pezzo, disegno: rep.disegno, operatore: rep.operatore, note: rep.note })); } catch (e) {} }
  function todayStr() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function fitTypeTxt(f) { return f.type === 'clearance' ? t('clearance') : (f.type === 'interference' ? t('interference') : t('transition')); }
  function fitTeoTxt(f) { return f.type === 'clearance' ? (umAbs(f.clrMin) + '…' + umAbs(f.clrMax) + ' µm ' + tu('clr')) : (f.type === 'interference' ? (umAbs(f.intMin) + '…' + umAbs(f.intMax) + ' µm ' + tu('itf')) : (tu('clr') + ' ≤ ' + umAbs(f.clrMax) + ' · ' + tu('itf') + ' ≤ ' + umAbs(f.intMax) + ' µm')); }
  function partLines(o, m) {
    /* righe di un pezzo misurato: quota, limiti, misura, controllo, esito parziale */
    var c = checkMeasure(o, m), isH = o.kind === 'hole', half = isHalf(o);
    var ctl = c.ok ? (umAbs(c.toMax) + ' µm ' + tu('mFromMax') + ' · ' + umAbs(c.toMin) + ' µm ' + tu('mFromMin')) : (umAbs(c.toMax < 0 ? -c.toMax : -c.toMin) + ' µm ' + (c.toMax < 0 ? tu('mOver') : tu('mUnder')));
    return { ok: c.ok, rows: [
      [rl('quota'), 'Ø' + fmtD(o.D) + ' ' + o.letter + o.grade + ' (' + (isH ? t('hole') : t('shaft')) + ') · ' + t('range') + ' ' + rangeTxt(o.from, o.to) + ' mm · IT' + o.grade + ' = ' + umAbs(o.it) + ' µm'],
      [rl('lim'), mm(o.min, half) + ' / ' + mm(o.max, half) + ' mm (' + (isH ? 'EI' : 'ei') + ' ' + um(o.lo) + ' · ' + (isH ? 'ES' : 'es') + ' ' + um(o.up) + ' µm)'],
      [rl('mis'), num(m, 3) + ' mm'],
      [rl('ctl'), devPctTxt(c) + ' · ' + ctl] ] };
  }
  /* Dati del rapporto per la situazione corrente: {err} se manca qualcosa, altrimenti {head, rows, ok, verdict} */
  function reportData() {
    var st = getState(); if (!(st.D > 0 && st.D <= 500)) return { err: 'needQ' };
    var head = [[rl('pezzo'), rep.pezzo], [rl('disegno'), rep.disegno], [rl('data'), rep.data || todayStr()], [rl('op'), rep.operatore]];
    var rows = [], ok, verdict;
    if (tab !== 'fit') {
      var cur = st[side]; if (!cur) return { err: 'needQ' };
      var o = limits(side, cur.letter, cur.grade, st.D); if (!o.ok) return { err: 'needQ' };
      var m = measured(); if (m === null) return { err: 'needM' };
      var pl = partLines(o, m); rows = pl.rows; ok = pl.ok; verdict = ok ? rl('ok') : rl('ko');
    } else {
      var H = st.hole && limits('hole', st.hole.letter, st.hole.grade, st.D), S = st.shaft && limits('shaft', st.shaft.letter, st.shaft.grade, st.D);
      if (!(H && H.ok && S && S.ok)) return { err: 'needQ' };
      var mh = parseFloat(String(insp.mh).replace(',', '.')), ms = parseFloat(String(insp.ms).replace(',', '.'));
      if (!(mh > 0 && ms > 0)) return { err: 'needF' };
      var f = fit(st.D, H, S), ph = partLines(H, mh), ps = partLines(S, ms), g = Math.round((mh - ms) * 10000) / 10;
      rows.push([rl('fitq'), 'Ø' + fmtD(st.D) + ' ' + H.letter + H.grade + '/' + S.letter + S.grade + ' — ' + fitTypeTxt(f) + ' · ' + rl('teo') + ': ' + fitTeoTxt(f)]);
      ph.rows.forEach(function (r, i) { rows.push([(i === 0 ? t('hole').toUpperCase() + ' · ' : '') + r[0], r[1]]); });
      rows.push([t('hole'), ph.ok ? rl('ok') : rl('ko')]);
      ps.rows.forEach(function (r, i) { rows.push([(i === 0 ? t('shaft').toUpperCase() + ' · ' : '') + r[0], r[1]]); });
      rows.push([t('shaft'), ps.ok ? rl('ok') : rl('ko')]);
      rows.push([g >= 0 ? rl('gap') : rl('itf'), umAbs(Math.abs(g)) + ' µm']);
      ok = ph.ok && ps.ok; verdict = (ok ? rl('ok') : rl('ko')) + (ok ? '' : ' — ' + (!ph.ok ? t('hole') : '') + (!ph.ok && !ps.ok ? ', ' : '') + (!ps.ok ? t('shaft') : ''));
    }
    return { head: head, rows: rows, ok: ok, verdict: verdict, note: rep.note };
  }
  function reportText(d) {
    var L = [rl('title') + ' — UTR Tiberti · Tolleranze ISO 286 v' + API.version];
    L.push(d.head.map(function (h) { return h[0] + ': ' + (h[1] || '—'); }).join(' · '));
    d.rows.forEach(function (r) { L.push(r[0] + ': ' + r[1]); });
    L.push(rl('esito') + ': ' + d.verdict);
    if (d.note) L.push(rl('note') + ': ' + d.note);
    return L.join('\n');
  }
  function renderRep() {
    var box = $('tol-rep'), pb = $('tol-rep-print-box'); if (!box || !pb) return;
    if (!rep.open) { box.hidden = true; return; }
    var d = reportData();
    if (d.err) { box.hidden = true; rep.open = false; return; }
    var h = '<table>' + d.rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
    h += '<div class="esito ' + (d.ok ? 'ok' : 'ko') + '">' + rl('esito') + ': ' + esc(d.verdict) + '</div>';
    $('tol-rep-prev').innerHTML = h;
    var ph = '<h2>' + rl('title') + '</h2><table>' + d.head.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1] || '') + '</td></tr>'; }).join('') + '</table>';
    ph += '<table>' + d.rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
    ph += '<div class="esito ' + (d.ok ? 'ok' : 'ko') + '">' + rl('esito') + ': ' + esc(d.verdict) + '</div>';
    if (d.note) ph += '<p><b>' + rl('note') + ':</b> ' + esc(d.note) + '</p>';
    ph += '<div class="sign"><div>' + rl('sign') + '</div><div>' + rl('sign2') + '</div></div><div class="foot">' + rl('foot') + '</div>';
    pb.innerHTML = ph;
    box.hidden = false;
  }
  function openRep() {
    var d = reportData();
    if (d.err) { rep.open = false; renderRep(); showAlert(rl(d.err)); return false; }
    if (!rep.data) rep.data = todayStr();
    Array.prototype.forEach.call($('tol-rep').querySelectorAll('[data-rep]'), function (i) { i.value = rep[i.getAttribute('data-rep')] || ''; });
    rep.open = true; renderRep();
    try { $('tol-rep').scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
    return true;
  }

  /* ── Tabella di confronto foro | albero (v3.9): le stesse grandezze dei riquadri, affiancate per leggerle in colonna e per la Scheda PDF ── */
  function cmpTable(H, S) {
    var hh = isHalf(H), hs = isHalf(S);
    function row(lbl, a, b, u) { return '<tr><td>' + lbl + '</td><td><b>' + a + '</b> <small>' + u + '</small></td><td><b>' + b + '</b> <small>' + u + '</small></td></tr>'; }
    var h = '<div class="tol-cmp"><table><tr><th>' + t('param') + '</th><th class="tol-c-blue">' + t('hole') + ' ' + H.letter + H.grade + '</th><th class="tol-c-amber">' + t('shaft') + ' ' + S.letter + S.grade + '</th></tr>';
    h += row(t('nominal'), mm(H.D, false), mm(S.D, false), 'mm');
    h += row(t('upDev') + ' <small>ES / es</small>', um(H.up), um(S.up), 'µm');
    h += row(t('loDev') + ' <small>EI / ei</small>', um(H.lo), um(S.lo), 'µm');
    h += row(t('dmin'), mm(H.min, hh), mm(S.min, hs), 'mm');
    h += row(t('dmax'), mm(H.max, hh), mm(S.max, hs), 'mm');
    h += row(t('itw'), 'IT' + H.grade + ' = ' + umAbs(H.it), 'IT' + S.grade + ' = ' + umAbs(S.it), 'µm');
    return h + '</table></div>';
  }

  /* ── Diagramma zone di tolleranza: asse verticale in µm, altezze calcolate (in scala) ── */
  function niceStep(span) {
    var raw = span / 6, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function diagramGeom(zones) {
    var lo = 0, hi = 0;
    zones.forEach(function (z) { lo = Math.min(lo, z.lo); hi = Math.max(hi, z.up); });
    var step = niceStep(Math.max(hi - lo, 1));
    var amin = Math.floor(lo / step - 1e-9) * step, amax = Math.ceil(hi / step + 1e-9) * step;
    if (amin === lo && lo < 0) amin -= step;
    if (amax === hi && hi > 0) amax += step;
    var Y0 = 28, PH = 250;
    return { step: step, amin: amin, amax: amax, Y0: Y0, PH: PH, pxPerUm: PH / (amax - amin),
             y: function (v) { return Y0 + (amax - v) * PH / (amax - amin); } };
  }
  function diagram(zones) {
    if (!zones.length) return '';
    var g = diagramGeom(zones), W = 660, H = 320, X0 = 78, X1 = 640, s = '';
    s += '<svg class="tol-diagram" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img">';
    for (var v = g.amin; v <= g.amax + 1e-9; v += g.step) {
      var vv = Math.round(v * 1000) / 1000, yy = g.y(vv);
      if (Math.abs(vv) < 1e-9) continue;
      s += '<line x1="' + X0 + '" x2="' + X1 + '" y1="' + yy.toFixed(2) + '" y2="' + yy.toFixed(2) + '" stroke="var(--border)" stroke-width="1"/>';
      s += '<text x="' + (X0 - 8) + '" y="' + (yy + 3.5).toFixed(2) + '" text-anchor="end" font-size="10" fill="var(--text-faint)">' + um(vv) + '</text>';
    }
    var slots = zones.length === 2 ? [[170, 320], [400, 550]] : [[285, 435]];
    zones.forEach(function (z, i) {
      var x0 = slots[i][0], x1 = slots[i][1], yt = g.y(z.up), yb = g.y(z.lo), isH = z.kind === 'hole';
      var stroke = isH ? 'var(--blue)' : 'var(--amber-dark)', fill = isH ? 'var(--blue-dim)' : 'var(--amber-dim)', tc = isH ? 'var(--blue-dark)' : 'var(--amber-dark)';
      s += '<rect data-zone="' + z.kind + '" x="' + x0 + '" y="' + yt.toFixed(3) + '" width="' + (x1 - x0) + '" height="' + (yb - yt).toFixed(3) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.2"/>';
      var lx = isH ? x0 - 6 : x1 + 6, anchor = isH ? 'end' : 'start';
      s += '<text x="' + lx + '" y="' + (yt - 3).toFixed(2) + '" text-anchor="' + anchor + '" font-size="11" font-weight="700" fill="' + tc + '">' + um(z.up) + '</text>';
      s += '<text x="' + lx + '" y="' + (yb + 11).toFixed(2) + '" text-anchor="' + anchor + '" font-size="11" font-weight="700" fill="' + tc + '">' + um(z.lo) + '</text>';
      var cy = (yt + yb) / 2, inside = (yb - yt) >= 16;
      s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (inside ? cy + 4.5 : (z.up + z.lo >= 0 ? yt - 16 : yb + 25)).toFixed(2) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + tc + '">' + z.letter + z.grade + '</text>';
    });
    var y0 = g.y(0);
    s += '<line x1="' + X0 + '" x2="' + X1 + '" y1="' + y0.toFixed(2) + '" y2="' + y0.toFixed(2) + '" stroke="var(--text)" stroke-width="1.6"/>';
    s += '<text x="' + (X0 - 8) + '" y="' + (y0 + 3.5).toFixed(2) + '" text-anchor="end" font-size="11" font-weight="700" fill="var(--text)">0</text>';
    s += '<text x="' + (X0 - 8) + '" y="14" text-anchor="end" font-size="10" fill="var(--text-faint)">µm</text>';
    s += '<text x="' + X0 + '" y="' + (H - 8) + '" font-size="9.5" fill="var(--text-faint)">' + esc(t('scale').replace('{s}', umAbs(g.step))) + '</text>';
    return s + '</svg>';
  }

  /* ── DISEGNO DELL'ACCOPPIAMENTO: sezione assiale di albero e foro, con le zone di tolleranza e il gioco/interferenza.
     Geometria calcolata: Ø nominale = DPX px; ogni scostamento sposta il bordo di dev/2 (è un diametro) × s px/µm,
     con s scelto perché il più grande scostamento valga 28 px. L'ingrandimento rispetto al vero è dichiarato nel disegno. ── */
  function fitDrawGeom(H, S, D) {
    var DPX = 150, CY = 150, X0 = 120, X1 = 480, m = 1;
    [H, S].forEach(function (z) { if (z) m = Math.max(m, Math.abs(z.up), Math.abs(z.lo)); });
    var s = 28 / m, truePx = DPX / (D * 1000), k = s / truePx;
    function yTop(dev) { return CY - (DPX / 2 + dev * s / 2); }
    return { DPX: DPX, CY: CY, X0: X0, X1: X1, s: s, k: k, yTop: yTop,
             hole: H ? { max: yTop(H.up), min: yTop(H.lo) } : null, shaft: S ? { max: yTop(S.up), min: yTop(S.lo) } : null };
  }
  function fitDrawing(H, S, D) {
    if (!H && !S) return '';
    var g = fitDrawGeom(H, S, D), W = 660, HH = 300, o = '', CY = g.CY, X0 = g.X0, X1 = g.X1, f2 = function (v) { return v.toFixed(2); };
    o += '<svg class="tol-fitdraw" viewBox="0 0 ' + W + ' ' + HH + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + (lang === 'it' ? 'Sezione albero e foro' : 'Shaft and hole section') + '">';
    var HALO = ' paint-order="stroke" stroke="var(--surface)" stroke-width="3" stroke-linejoin="round"';   /* alone chiaro: leggibile anche sul tratteggio */
    function lbl(x, y, anchor, size, color, txt, bold) { return '<text x="' + f2(x) + '" y="' + f2(y) + '" text-anchor="' + anchor + '" font-size="' + size + '"' + (bold ? ' font-weight="700"' : '') + ' fill="' + color + '"' + HALO + '>' + txt + '</text>'; }
    function twoLabels(x, anchor, yA, yB, color, tA, tB) { var ya = yA + 4, yb = Math.max(yB + 4, ya + 13); return lbl(x, ya, anchor, 10.5, color, tA, true) + lbl(x, yb, anchor, 10.5, color, tB, true); }
    o += '<defs><pattern id="tolHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="var(--blue-dark)" stroke-width="1" opacity=".55"/></pattern>' +
         '<pattern id="tolHatchS" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="8" stroke="var(--amber-dark)" stroke-width="1" opacity=".55"/></pattern></defs>';
    var mirror = function (y) { return 2 * CY - y; };
    if (g.hole) {
      /* materiale del pezzo forato: sicuramente presente oltre il foro MASSIMO; forse presente nella zona di tolleranza (tra max e min) */
      o += '<rect x="' + X0 + '" y="22" width="' + (X1 - X0) + '" height="' + f2(g.hole.max - 22) + '" fill="url(#tolHatch)" stroke="var(--blue-dark)" stroke-width="1.2"/>';
      o += '<rect x="' + X0 + '" y="' + f2(mirror(g.hole.max)) + '" width="' + (X1 - X0) + '" height="' + f2(HH - 22 - mirror(g.hole.max)) + '" fill="url(#tolHatch)" stroke="var(--blue-dark)" stroke-width="1.2"/>';
      o += '<rect x="' + X0 + '" y="' + f2(g.hole.max) + '" width="' + (X1 - X0) + '" height="' + f2(g.hole.min - g.hole.max) + '" fill="var(--blue-dim)" stroke="var(--blue)" stroke-width="1" stroke-dasharray="4 3"/>';
      o += '<rect x="' + X0 + '" y="' + f2(mirror(g.hole.min)) + '" width="' + (X1 - X0) + '" height="' + f2(g.hole.min - g.hole.max) + '" fill="var(--blue-dim)" stroke="var(--blue)" stroke-width="1" stroke-dasharray="4 3"/>';
      o += twoLabels(X0 - 8, 'end', g.hole.max, g.hole.min, 'var(--blue-dark)', (H.letter + H.grade) + ' max ' + um(H.up), 'min ' + um(H.lo));
    }
    if (g.shaft) {
      var xs0 = g.hole ? X0 - 70 : X0, xs1 = g.hole ? X1 + 70 : X1;
      /* albero: sicuramente presente fino al MINIMO; forse presente nella zona di tolleranza (tra min e max) */
      o += '<rect x="' + xs0 + '" y="' + f2(g.shaft.min) + '" width="' + (xs1 - xs0) + '" height="' + f2(mirror(g.shaft.min) - g.shaft.min) + '" fill="url(#tolHatchS)" stroke="var(--amber-dark)" stroke-width="1.2"/>';
      o += '<rect x="' + xs0 + '" y="' + f2(g.shaft.max) + '" width="' + (xs1 - xs0) + '" height="' + f2(g.shaft.min - g.shaft.max) + '" fill="var(--amber-dim)" stroke="var(--amber-dark)" stroke-width="1" stroke-dasharray="4 3"/>';
      o += '<rect x="' + xs0 + '" y="' + f2(mirror(g.shaft.min)) + '" width="' + (xs1 - xs0) + '" height="' + f2(g.shaft.min - g.shaft.max) + '" fill="var(--amber-dim)" stroke="var(--amber-dark)" stroke-width="1" stroke-dasharray="4 3"/>';
      o += twoLabels(xs1 + 8, 'start', g.shaft.max, g.shaft.min, 'var(--amber-dark)', (S.letter + S.grade) + ' max ' + um(S.up), 'min ' + um(S.lo));
    }
    /* asse e linea dello zero (Ø nominale) */
    o += '<line x1="30" x2="' + (W - 30) + '" y1="' + CY + '" y2="' + CY + '" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="12 4 2 4"/>';
    var y0 = g.yTop(0);
    o += '<line x1="' + (X0 - 4) + '" x2="' + (X1 + 4) + '" y1="' + f2(y0) + '" y2="' + f2(y0) + '" stroke="var(--text)" stroke-width="1.4"/>';
    o += lbl(X0 + 6, y0 - 4, 'start', 10, 'var(--text)', 'Ø' + esc(num(D, 3).replace(/[.,]?0+$/, '')) + ' = 0', true);
    /* gioco / interferenza al bordo superiore: fra albero MAX e foro MIN (caso peggiore) e fra albero MIN e foro MAX (caso migliore) */
    if (g.hole && g.shaft) {
      var f = fit(D, H, S), xm = X1 + 22;
      var yA = g.shaft.max, yB = g.hole.min, top = Math.min(yA, yB), h = Math.abs(yA - yB), inter = g.shaft.max < g.hole.min;
      if (h > 0.5) o += '<rect x="' + X0 + '" y="' + f2(top) + '" width="' + (X1 - X0) + '" height="' + f2(h) + '" fill="' + (inter ? 'var(--red)' : 'var(--green)') + '" opacity=".35"/>';
      var lblTxt = inter ? ((lang === 'it' ? 'interferenza max ' : 'max interference ') + umAbs(f.intMax) + ' µm') : ((lang === 'it' ? 'gioco min ' : 'min clearance ') + umAbs(f.clrMin) + ' µm');
      o += lbl((X0 + X1) / 2, h >= 14 ? top + h / 2 + 4 : top + h + 12, 'middle', 10.5, inter ? 'var(--red-dark)' : 'var(--green-dark)', lblTxt, true);
      var t2 = f.type === 'clearance' ? (lang === 'it' ? 'gioco max ' : 'max clearance ') + umAbs(f.clrMax) + ' µm' : (f.type === 'interference' ? (lang === 'it' ? 'interferenza min ' : 'min interference ') + umAbs(f.intMin) + ' µm' : (lang === 'it' ? 'gioco max ' : 'max clearance ') + umAbs(f.clrMax) + ' µm');
      var yb2 = mirror(top) - (h >= 14 ? h / 2 - 4 : -12);
      o += lbl((X0 + X1) / 2, yb2, 'middle', 10.5, 'var(--text-muted)', t2, false);
    }
    o += '<text x="30" y="' + (HH - 8) + '" font-size="9.5" fill="var(--text-faint)">' + (lang === 'it' ? 'sezione assiale · scostamenti ingranditi ×' : 'axial section · deviations magnified ×') + Math.round(g.k) + ' · ' + (lang === 'it' ? 'tratteggio = materiale certo · fascia chiara = zona di tolleranza · linea 0 = Ø nominale' : 'hatch = certain material · light band = tolerance zone · line 0 = nominal Ø') + '</text>';
    return o + '</svg>';
  }
  var FITIMG = { clearance: 'img/fit-gioco.webp', transition: 'img/fit-incerto.webp', interference: 'img/fit-forzato.webp' };
  function fitImg(type, cls) { return '<img class="tol-fitimg ' + (cls || '') + '" src="' + FITIMG[type] + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'; }
  /* ── DISEGNO FOTOGRAFICO dell'accoppiamento (v3.7): la foto generata dall'utente (img/sezione.webp, 1802×873) è tagliata in tre strisce
     orizzontali — blocco superiore (righe 0–164), albero (righe 288–576 dentro il blocco, 235–632 alle estremità), blocco inferiore (697–872) —
     e ogni striscia viene spostata/scalata secondo le stesse quote di fitDrawGeom: il bordo del blocco sta sulla linea del foro MASSIMO,
     l'albero è alto quanto il suo diametro MINIMO. Le fasce colorate in mezzo sono dipinte dall'app, non prese dalla foto: così i colori
     e le distanze sono quelli calcolati. Ø nominale = 288 px (l'albero della foto), scostamento più grande = 72 px, ingrandimento dichiarato. ── */
  var PH = { W: 1802, H: 873, CY: 432, DPX: 288, A: [0, 165], B: [288, 576], Bend: [235, 632], C: [697, 873], X0: 320, X1: 1405, MAXPX: 72 };
  var photoReady = false, photoImg = null;
  function photoLayout(H, S, D) {
    var m = 1; [H, S].forEach(function (z) { if (z) m = Math.max(m, Math.abs(z.up), Math.abs(z.lo)); });
    var s = PH.MAXPX / m, truePx = PH.DPX / (D * 1000), k = s / truePx;
    function yTop(dev) { return PH.CY - (PH.DPX / 2 + dev * s / 2); }
    var yHmax = H ? yTop(H.up) : yTop(0), yHmin = H ? yTop(H.lo) : yTop(0), ySmax = S ? yTop(S.up) : yTop(0), ySmin = S ? yTop(S.lo) : yTop(0);
    return { s: s, k: k, yTop: yTop, yHmax: yHmax, yHmin: yHmin, ySmax: ySmax, ySmin: ySmin,
             dyA: yHmax - PH.A[1], dyC: (2 * PH.CY - yHmax) - PH.C[0], shaftScale: (PH.CY - ySmin) / (PH.DPX / 2) };
  }
  function fitDrawingPhoto(H, S, D) {
    var g = photoLayout(H, S, D), W = PH.W, HH = PH.H, CY = PH.CY, X0 = PH.X0, X1 = PH.X1, o = '', f2 = function (v) { return v.toFixed(2); };
    var mirror = function (y) { return 2 * CY - y; }, href = 'img/sezione.webp';
    var HALO = ' paint-order="stroke" stroke="#fff" stroke-width="9" stroke-linejoin="round"', FS = 34;
    function lbl(x, y, anchor, size, color, txt, bold) { return '<text x="' + f2(x) + '" y="' + f2(y) + '" text-anchor="' + anchor + '" font-size="' + size + '"' + (bold ? ' font-weight="700"' : '') + ' fill="' + color + '"' + HALO + '>' + txt + '</text>'; }
    function twoLabels(x, anchor, yA, yB, color, tA, tB) { var ya = yA + 12, yb = Math.max(yB + 12, ya + 40); return lbl(x, ya, anchor, FS, color, tA, true) + lbl(x, yb, anchor, FS, color, tB, true); }
    o += '<svg class="tol-fitdraw tol-fitdraw-photo" viewBox="0 0 ' + W + ' ' + HH + '" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="' + (lang === 'it' ? 'Sezione albero e foro' : 'Shaft and hole section') + '">';
    o += '<defs><linearGradient id="phBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f9093"/><stop offset="1" stop-color="#b9babd"/></linearGradient>' +
         '<linearGradient id="phBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fd6"/><stop offset=".5" stop-color="#7fb2ff"/><stop offset="1" stop-color="#2f6fd6"/></linearGradient>' +
         '<linearGradient id="phAmber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8790f"/><stop offset=".5" stop-color="#f2c04a"/><stop offset="1" stop-color="#b8790f"/></linearGradient>' +
         '<linearGradient id="phGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e8b3e"/><stop offset=".5" stop-color="#8fe08a"/><stop offset="1" stop-color="#2e8b3e"/></linearGradient>' +
         '<linearGradient id="phRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3261e"/><stop offset=".5" stop-color="#ff7a70"/><stop offset="1" stop-color="#b3261e"/></linearGradient>' +
         '<clipPath id="phA"><rect x="0" y="' + PH.A[0] + '" width="' + W + '" height="' + (PH.A[1] - PH.A[0]) + '"/></clipPath>' +
         '<clipPath id="phC"><rect x="0" y="' + PH.C[0] + '" width="' + W + '" height="' + (PH.C[1] - PH.C[0]) + '"/></clipPath>' +
         '<clipPath id="phB"><rect x="' + X0 + '" y="' + PH.B[0] + '" width="' + (X1 - X0) + '" height="' + (PH.B[1] - PH.B[0]) + '"/><rect x="0" y="' + PH.Bend[0] + '" width="' + X0 + '" height="' + (PH.Bend[1] - PH.Bend[0]) + '"/><rect x="' + X1 + '" y="' + PH.Bend[0] + '" width="' + (W - X1) + '" height="' + (PH.Bend[1] - PH.Bend[0]) + '"/></clipPath></defs>';
    o += '<rect x="0" y="0" width="' + W + '" height="' + HH + '" fill="url(#phBg)"/>';
    var img = '<image href="' + href + '" xlink:href="' + href + '" x="0" y="0" width="' + W + '" height="' + HH + '" preserveAspectRatio="none"/>';
    /* blocco sotto e blocco sopra: traslati perché il bordo del foro stia sulla linea del foro massimo */
    o += '<g transform="translate(0 ' + f2(g.dyC) + ')" clip-path="url(#phC)">' + img + '</g>';
    o += '<g transform="translate(0 ' + f2(g.dyA) + ')" clip-path="url(#phA)">' + img + '</g>';
    /* fasce dipinte: zona foro (blu), gioco (verde) o interferenza (rosso), zona albero (ambra) — sopra e specchiate sotto */
    function band(y1, y2, fill, op) { var a = Math.min(y1, y2), h = Math.abs(y2 - y1); if (h < 0.5) return ''; var ex = op ? ' opacity="' + op + '"' : ''; return '<rect x="' + X0 + '" y="' + f2(a) + '" width="' + (X1 - X0) + '" height="' + f2(h) + '" fill="' + fill + '"' + ex + '/><rect x="' + X0 + '" y="' + f2(mirror(a) - h) + '" width="' + (X1 - X0) + '" height="' + f2(h) + '" fill="' + fill + '"' + ex + '/>'; }
    if (H) o += band(g.yHmax, g.yHmin, 'url(#phBlue)');
    if (S) o += band(g.ySmax, g.ySmin, 'url(#phAmber)');
    var inter = false, f = null;
    /* gioco: verde pieno nello spazio libero · interferenza: rosso trasparente SOPRA le fasce, così zona foro e zona albero restano leggibili */
    if (H && S) { f = fit(D, H, S); inter = g.ySmax < g.yHmin; o += inter ? band(g.yHmin, g.ySmax, 'url(#phRed)', '.6') : band(g.yHmin, g.ySmax, 'url(#phGreen)'); }
    /* albero: scalato verticalmente attorno all'asse perché sia alto quanto il diametro MINIMO */
    o += '<g transform="translate(0 ' + CY + ') scale(1 ' + f2(g.shaftScale) + ') translate(0 ' + (-CY) + ')" clip-path="url(#phB)">' + img + '</g>';
    /* asse e linea dello zero */
    o += '<line x1="20" x2="' + (W - 20) + '" y1="' + CY + '" y2="' + CY + '" stroke="#222" stroke-width="2" stroke-dasharray="26 8 4 8" opacity=".7"/>';
    var y0 = g.yTop(0);
    o += '<line x1="' + X0 + '" x2="' + X1 + '" y1="' + f2(y0) + '" y2="' + f2(y0) + '" stroke="#111" stroke-width="2.5"/>';
    o += lbl(X0 + 60, y0 - 10, 'start', FS, '#111', 'Ø' + esc(num(D, 3).replace(/[.,]?0+$/, '')) + ' = 0', true);
    if (H) o += twoLabels(X0 - 14, 'end', g.yHmax, g.yHmin, '#1a4b9c', (H.letter + H.grade) + ' max ' + um(H.up), 'min ' + um(H.lo));
    if (S) o += twoLabels(W - 14, 'end', g.ySmax, g.ySmin, '#8a5a06', (S.letter + S.grade) + ' max ' + um(S.up), 'min ' + um(S.lo));
    if (H && S) {
      var top = Math.min(g.yHmin, g.ySmax), h = Math.abs(g.yHmin - g.ySmax), col = inter ? '#8f1d16' : '#1f6b2b';
      var t1 = inter ? ((lang === 'it' ? 'interferenza max ' : 'max interference ') + umAbs(f.intMax) + ' µm') : ((lang === 'it' ? 'gioco min ' : 'min clearance ') + umAbs(f.clrMin) + ' µm');
      var t2 = f.type === 'clearance' ? (lang === 'it' ? 'gioco max ' : 'max clearance ') + umAbs(f.clrMax) + ' µm' : (f.type === 'interference' ? (lang === 'it' ? 'interferenza min ' : 'min interference ') + umAbs(f.intMin) + ' µm' : (lang === 'it' ? 'gioco max ' : 'max clearance ') + umAbs(f.clrMax) + ' µm');
      o += lbl((X0 + X1) / 2, h >= 44 ? top + h / 2 + 12 : top + h + 38, 'middle', FS, col, t1, true);
      o += lbl((X0 + X1) / 2, mirror(top) - (h >= 44 ? h / 2 - 12 : -38), 'middle', FS, '#222', t2, true);
    }
    o += lbl(20, HH - 16, 'start', 24, '#333', (lang === 'it' ? 'scostamenti ingranditi ×' : 'deviations magnified ×') + Math.round(g.k) + ' · ' + (lang === 'it' ? 'blu foro · ambra albero · verde gioco · rosso interferenza · linea 0 = Ø nominale' : 'blue hole · amber shaft · green clearance · red interference · line 0 = nominal Ø'), false);
    return o + '</svg>';
  }
  function preloadPhoto() {
    if (photoImg) return; photoImg = new Image();
    photoImg.onload = function () { photoReady = true; if (root) render(); };
    photoImg.onerror = function () { photoReady = false; };
    photoImg.src = 'img/sezione.webp';
  }
  var PICT = { clearance: '<svg class="pict" viewBox="0 0 26 18"><rect x="1" y="1" width="24" height="16" fill="none" stroke="var(--blue-dark)"/><rect x="1" y="6" width="24" height="6" fill="var(--amber-dark)"/></svg>',
               transition: '<svg class="pict" viewBox="0 0 26 18"><rect x="1" y="1" width="24" height="16" fill="none" stroke="var(--blue-dark)"/><rect x="1" y="4.5" width="24" height="9" fill="var(--amber-dark)"/></svg>',
               interference: '<svg class="pict" viewBox="0 0 26 18"><rect x="1" y="1" width="24" height="16" fill="none" stroke="var(--blue-dark)"/><rect x="1" y="2.5" width="24" height="13" fill="var(--amber-dark)"/><rect x="1" y="2.5" width="24" height="1.5" fill="var(--red)"/><rect x="1" y="14" width="24" height="1.5" fill="var(--red)"/></svg>' };

  /* ── Testi della UI v3.0 (schede, filtro, fasce, riepilogo) ── */
  var TU = { it: { titleHole: 'Tolleranze FORO — scostamenti superiore e inferiore in µm (1/1000 mm)', titleShaft: 'Tolleranze ALBERO — scostamenti superiore e inferiore in µm (1/1000 mm)',
                   band: 'fascia', bandNo: 'Ø da 0 a 500 mm', bandOf: 'fascia del Ø', bandOther: 'altra fascia', na: 'non prevista', pick: 'tocca una casella per il riepilogo', printHole: 'FORI', printShaft: 'ALBERI' },
             en: { titleHole: 'HOLE tolerances — upper and lower deviations in µm (1/1000 mm)', titleShaft: 'SHAFT tolerances — upper and lower deviations in µm (1/1000 mm)',
                   band: 'range', bandNo: 'Ø from 0 to 500 mm', bandOf: 'range of Ø', bandOther: 'other range', na: 'not provided', pick: 'tap a cell for the summary', printHole: 'HOLES', printShaft: 'SHAFTS' } };
  TU.it.mIn = 'DENTRO'; TU.it.mOut = 'FUORI'; TU.it.mOver = 'oltre il massimo'; TU.it.mUnder = 'sotto il minimo'; TU.it.mFromMax = 'dal max'; TU.it.mFromMin = 'dal min'; TU.it.mAlso = 'rientra anche in'; TU.it.recent = 'Recenti'; TU.it.share = 'Condividi'; TU.it.shared = 'inviato'; TU.it.clr = 'gioco'; TU.it.trn = 'incerto'; TU.it.itf = 'forzato'; TU.it.mNone = 'nessuna classe della parete'; TU.it.mDev = 'dal nominale'; TU.it.mPct = 'della tolleranza usata'; TU.it.delRec = 'Togli dai recenti';
  TU.en.mIn = 'IN'; TU.en.mOut = 'OUT'; TU.en.mOver = 'above max'; TU.en.mUnder = 'below min'; TU.en.mFromMax = 'from max'; TU.en.mFromMin = 'from min'; TU.en.mAlso = 'also within'; TU.en.recent = 'Recent'; TU.en.share = 'Share'; TU.en.shared = 'sent'; TU.en.clr = 'clearance'; TU.en.trn = 'transition'; TU.en.itf = 'interference'; TU.en.mNone = 'no chart class'; TU.en.mDev = 'from nominal'; TU.en.mPct = 'of tolerance used'; TU.en.delRec = 'Remove from recent';
  function tu(k) { return TU[lang][k]; }
  /* Accoppiamenti consigliati: coppie preferite di ISO 286-1:2010 Appendice A (sistema foro base e albero base).
     Il TIPO (gioco/incerto/forzato) lo calcola il modulo per il Ø corrente; l'uso è indicativo, da pratica d'officina. */
  var FITS = [
    ['H7', 'g6', 'Scorrevole di precisione: perni, alberi in bronzine, guide lubrificate', 'Precision sliding: pins, shafts in bushes, lubricated guides'],
    ['H7', 'h6', 'Scorrevole senza gioco apprezzabile: parti montate a mano che non ruotano', 'Close sliding: hand-assembled parts that do not rotate'],
    ['H7', 'js6', 'Incerto leggero: montaggio a mano, cuscinetti con carico leggero', 'Light transition: hand assembly, bearings with light load'],
    ['H7', 'k6', 'Incerto: sedi cuscinetti su albero (anello interno rotante), pulegge', 'Transition: bearing seats on shafts (rotating inner ring), pulleys'],
    ['H7', 'm6', 'Incerto stretto: si monta con mazzuolo, si smonta senza danni', 'Tight transition: mallet assembly, removable without damage'],
    ['H7', 'n6', 'Incerto forzato: ingranaggi e boccole che non devono ruotare, smontaggio a pressa', 'Tight transition: gears and bushes that must not turn, press removal'],
    ['H7', 'p6', 'Forzato leggero: boccole, ruote dentate, montaggio a pressa', 'Light press fit: bushes, gears, press assembly'],
    ['H7', 'r6', 'Forzato medio: alberi in mozzi, montaggio a pressa o a caldo', 'Medium press fit: shafts in hubs, press or shrink assembly'],
    ['H7', 's6', 'Forzato pesante: montaggio a caldo, trasmette coppia senza chiavetta', 'Heavy press fit: shrink assembly, transmits torque without key'],
    ['H8', 'f7', 'Scorrevole con gioco: alberi in supporti, cuscinetti a strisciamento', 'Running fit: shafts in supports, plain bearings'],
    ['H8', 'h7', 'Scorrevole facile: parti che scorrono senza grande precisione', 'Easy sliding: parts sliding without high precision'],
    ['H8', 'e8', 'Gioco medio: alberi lunghi su più supporti, temperatura variabile', 'Medium clearance: long shafts on several supports, varying temperature'],
    ['H9', 'd9', 'Gioco ampio: parti che ruotano libere, macchine agricole', 'Large clearance: free-running parts, agricultural machinery'],
    ['H11', 'c11', 'Gioco molto ampio: perni e cerniere grezze, parti smontabili a mano', 'Very large clearance: rough pins and hinges, hand-removable parts'],
    ['H11', 'h11', 'Gioco grezzo: parti non finite, distanziali', 'Rough clearance: unfinished parts, spacers'],
    ['G7', 'h6', 'Albero base: scorrevole di precisione (come H7/g6)', 'Shaft basis: precision sliding (as H7/g6)'],
    ['F8', 'h7', 'Albero base: scorrevole con gioco (come H8/f7)', 'Shaft basis: running fit (as H8/f7)'],
    ['K7', 'h6', 'Albero base: incerto, alloggiamenti cuscinetti (anello esterno rotante)', 'Shaft basis: transition, bearing housings (rotating outer ring)'],
    ['N7', 'h6', 'Albero base: incerto forzato', 'Shaft basis: tight transition'],
    ['P7', 'h6', 'Albero base: forzato leggero', 'Shaft basis: light press fit']
  ];
  var RECENT_MAX = 8, recent = [];
  function loadRecent() { try { recent = JSON.parse(localStorage.getItem('tolIso.recent') || '[]'); if (!Array.isArray(recent)) recent = []; } catch (e) { recent = []; } }
  function saveRecent() { try { localStorage.setItem('tolIso.recent', JSON.stringify(recent)); } catch (e) {} renderRecent(); }
  function pushRecent(txt) {
    if (!txt) return;
    recent = [txt].concat(recent.filter(function (r) { return r !== txt; })).slice(0, RECENT_MAX);
    saveRecent();
  }
  function delRecent(i) { recent.splice(i, 1); saveRecent(); }
  function renderRecent() {
    var box = $('tol-recent'); if (!box) return;
    if (!recent.length) { box.innerHTML = ''; return; }
    var h = '<span class="tol-lbl">' + tu('recent') + ':</span>';
    recent.forEach(function (r, i) { h += '<span class="fav"><button type="button" data-quick="' + esc(r) + '">' + esc(r) + '</button><button type="button" class="del" data-recdel="' + i + '" aria-label="' + tu('delRec') + '" title="' + tu('delRec') + '">✕</button></span>'; });
    box.innerHTML = h;
  }
  function fmtD(D) { return num(D, 3).replace(/[.,]?0+$/, ''); }
  /* Preferiti con nome: quote ricorrenti dell'officina («Perno pinza» → 12 H7/g6) */
  var FAV_MAX = 24, fav = [];
  function loadFav() { try { fav = JSON.parse(localStorage.getItem('tolIso.fav') || '[]'); if (!Array.isArray(fav)) fav = []; } catch (e) { fav = []; } }
  function saveFav() { try { localStorage.setItem('tolIso.fav', JSON.stringify(fav)); } catch (e) {} renderFav(); }
  function addFav(name, q) { name = String(name || '').trim().slice(0, 40); if (!name || !q) return false; fav = fav.filter(function (f) { return !(f.n === name && f.q === q); }); fav.unshift({ n: name, q: q }); fav = fav.slice(0, FAV_MAX); saveFav(); return true; }
  function delFav(i) { fav.splice(i, 1); saveFav(); }
  function renderFav() {
    var box = $('tol-fav'); if (!box) return;
    if (!fav.length) { box.innerHTML = ''; return; }
    var h = '<span class="tol-lbl">' + (lang === 'it' ? 'Preferiti' : 'Favourites') + ':</span>';
    fav.forEach(function (f, i) { h += '<span class="fav"><button type="button" data-quick="' + esc(f.q) + '"><b>' + esc(f.n) + '</b> · ' + esc(f.q) + '</button><button type="button" class="del" data-favdel="' + i + '" aria-label="' + (lang === 'it' ? 'Elimina' : 'Delete') + '">✕</button></span>'; });
    box.innerHTML = h;
  }
  /* quota corrente come testo («25 H7/g6», «40 g6»), oppure null */
  function currentQuota() {
    var st = getState(); if (!(st.D > 0 && st.D <= 500)) return null;
    var H = st.hole && limits('hole', st.hole.letter, st.hole.grade, st.D), S = st.shaft && limits('shaft', st.shaft.letter, st.shaft.grade, st.D);
    if (tab === 'fit') { if (H && H.ok && S && S.ok) return fmtD(st.D) + ' ' + st.hole.letter + st.hole.grade + '/' + st.shaft.letter + st.shaft.grade; if (H && H.ok) return fmtD(st.D) + ' ' + st.hole.letter + st.hole.grade; if (S && S.ok) return fmtD(st.D) + ' ' + st.shaft.letter + st.shaft.grade; return null; }
    var o = st[side] && (side === 'hole' ? H : S); return (o && o.ok) ? fmtD(st.D) + ' ' + st[side].letter + st[side].grade : null;
  }
  function measured() { var m = parseFloat(String($('tol-m').value).replace(',', '.')); return (m > 0 && String($('tol-m').value) !== '') ? m : null; }
  /* Controllo misura: la misura sta dentro [min, max] della classe? Scarti in µm dai due limiti (arrotondati al decimo). */
  function checkMeasure(o, m) {
    var toMax = Math.round((o.max - m) * 10000) / 10, toMin = Math.round((m - o.min) * 10000) / 10;
    /* dev = scostamento della misura dal nominale (µm, al decimo) · pos = posizione nel campo di tolleranza: 0 = minimo, 100 = massimo
       (fuori dal campo esce <0 o >100) · pct = pos arrotondata all'intero per il testo */
    var dev = Math.round((m - o.D) * 10000) / 10, pos = (toMin + toMax) > 0 ? toMin / (toMin + toMax) * 100 : 0;
    return { ok: toMax >= 0 && toMin >= 0, toMax: toMax, toMin: toMin, dev: dev, pos: pos, pct: Math.round(pos) };
  }
  /* «+10 µm dal nominale · 48% della tolleranza usata» (segno meno tipografico anche sulla percentuale) */
  function devPctTxt(c) { return (c.dev > 0 ? '+' : (c.dev < 0 ? '−' : '')) + umAbs(Math.abs(c.dev)) + ' µm ' + tu('mDev') + ' · ' + (c.pct < 0 ? '−' : '') + Math.abs(c.pct) + '% ' + tu('mPct'); }
  /* barra MIN ─ MISURA ─ MAX: il segno sta esattamente a pos% della pista (fuori campo si ferma al bordo, in rosso) */
  function measureBar(o, c, half) {
    var left = Math.max(0, Math.min(100, c.pos));
    return '<div class="mbar' + (c.ok ? '' : ' ko') + '"><span class="lo">' + mm(o.min, half) + '</span><div class="trk"><i class="mk" style="left:' + (Math.round(left * 10) / 10) + '%"></i></div><span class="hi">' + mm(o.max, half) + '</span></div>';
  }
  function classesContaining(kind, m, D) {
    return COLS[kind].filter(function (c) { var pc = parseClass(c), o = limits(kind, pc.letter, pc.grade, D); return o.ok && checkMeasure(o, m).ok; });
  }
  function buildFits() {
    var box = $('tol-fits'); if (!box) return;
    var st = getState(), dOk = st.D > 0 && st.D <= 500, cur = (st.hole && st.shaft) ? st.hole.letter + st.hole.grade + '/' + st.shaft.letter + st.shaft.grade : '', h = '';
    FITS.forEach(function (f) {
      var pair = f[0] + '/' + f[1], typ = '', col = '', na = false;
      if (dOk) { var ph = parseClass(f[0]), ps = parseClass(f[1]), r = fit(st.D, ph, ps); if (r && r.type) { typ = r.type === 'clearance' ? tu('clr') : (r.type === 'transition' ? tu('trn') : tu('itf')); col = r.type === 'clearance' ? 'tol-c-green' : (r.type === 'transition' ? 'tol-c-amber' : 'tol-c-red'); } else na = true; }
      var pict = (dOk && !na && r && r.type) ? fitImg(r.type) : '<span class="tol-fitimg"></span>';
      h += '<button type="button" class="tol-fitrow' + (pair === cur ? ' on' : '') + (na ? ' na' : '') + '" data-fit="' + pair + '"' + (na ? ' disabled' : '') + '>' + pict + '<b>' + pair + '</b><i class="' + col + '">' + typ + '</i><span>' + esc(lang === 'it' ? f[2] : f[3]) + '</span></button>';
    });
    box.innerHTML = h;
  }
  function shareText(txt, el) {
    function done() { var old = el.textContent; el.textContent = '✓ ' + tu('shared'); setTimeout(function () { el.textContent = old; }, 1100); }
    if (navigator.share) navigator.share({ text: txt }).then(done, function () {}); else copyText(txt, el);
  }
  var FILTERS = { all: null, fine: [5, 8], medium: [9, 11], coarse: [12, 13] };
  function colsFor(k) {
    var f = FILTERS[filter] || null;
    return COLS[k].filter(function (c) { if (!f) return true; var g = parseClass(c).grade; return g >= f[0] && g <= f[1]; });
  }
  function bandLabel(fi) { var rb = rangeBounds(fi, true); return fi === 0 ? '≤ 3' : '> ' + rb[0] + ' … ' + rb[1]; }
  function curFi() {
    if (viewFi >= 0) return viewFi;
    var D = parseFloat(String($('tol-d').value).replace(',', '.'));
    return (D > 0 && D <= 500) ? fineIdx(D) : 5;
  }

  /* ── Parete (desktop): righe = fasce, colonne = classi ── */
  function buildTable() {
    var cols = colsFor(side), h = '<thead><tr><th class="tol-rng">' + t('nomrange') + '</th>';
    cols.forEach(function (c) { h += '<th data-col="' + c + '">' + c + '</th>'; });
    h += '</tr></thead><tbody>';
    for (var fi = 0; fi < R_FINE.length; fi++) {
      var rb = rangeBounds(fi, true);
      h += '<tr data-fi="' + fi + '"><th class="tol-rng">' + bandLabel(fi) + '</th>';
      cols.forEach(function (c) {
        var pc = parseClass(c), o = limits(side, pc.letter, pc.grade, rb[1]);
        h += o.ok ? '<td data-cls="' + c + '">' + um(o.up) + '<br>' + um(o.lo) + '</td>' : '<td class="tol-na" title="' + esc(t('err')[o.err] || '') + '">—</td>';
      });
      h += '</tr>';
    }
    $('tol-table').innerHTML = h + '</tbody>';
    $('tol-table-title').textContent = side === 'hole' ? tu('titleHole') : tu('titleShaft');
  }
  /* ── Schede (telefono): la sola fascia corrente, raggruppata per lettera ── */
  function buildCards() {
    var fi = curFi(), rb = rangeBounds(fi, true), cols = colsFor(side), h = '', lastL = '';
    cols.forEach(function (c) {
      var pc = parseClass(c), L = pc.letter;
      if (L !== lastL) { h += '<div class="tol-let">' + L + '</div>'; lastL = L; }
      var o = limits(side, pc.letter, pc.grade, rb[1]);
      h += o.ok ? '<button type="button" class="tol-card" data-cls="' + c + '" data-fi="' + fi + '"><span class="k">' + c + '</span><span class="v">' + um(o.up) + ' <i>/</i> ' + um(o.lo) + '</span></button>'
                : '<div class="tol-card tol-na" title="' + esc(t('err')[o.err] || '') + '"><span class="k">' + c + '</span><span class="v">' + tu('na') + '</span></div>';
    });
    $('tol-cards').innerHTML = h;
    var D = parseFloat(String($('tol-d').value).replace(',', '.')), own = (D > 0 && D <= 500) && fineIdx(D) === fi;
    $('tol-bandlbl').innerHTML = '<span>' + bandLabel(fi) + ' mm</span><small>' + (own ? tu('bandOf') + ' ' + esc(String($('tol-d').value)) : tu('bandOther')) + '</small>';
    var nav = $('tol-panel-table').querySelectorAll('[data-band]');
    nav[0].disabled = fi <= 0; nav[1].disabled = fi >= R_FINE.length - 1;
  }
  function buildItTable() {
    var h = '<thead><tr><th class="tol-rng">' + t('nomrange') + '</th>';
    IT_NAMES.forEach(function (n) { h += '<th>' + n + '</th>'; });
    h += '</tr></thead><tbody>';
    for (var m = 0; m < R_MAIN.length; m++) {
      var rb = rangeBounds(m, false);
      h += '<tr data-m="' + m + '"><th class="tol-rng">' + (m === 0 ? '≤ 3' : '> ' + rb[0] + ' … ' + rb[1]) + '</th>';
      IT[m].forEach(function (v) { h += '<td class="tol-na" style="color:var(--text);text-align:right;">' + umAbs(v) + '</td>'; });
      h += '</tr>';
    }
    $('tol-ittable').innerHTML = h + '</tbody>';
  }
  function markTable(st) {
    var fi = (st.D > 0 && st.D <= 500) ? fineIdx(st.D) : -1, cur = st[side], cls = cur ? cur.letter + cur.grade : '';
    Array.prototype.forEach.call($('tol-table').querySelectorAll('tbody tr'), function (tr) {
      var on = parseInt(tr.getAttribute('data-fi'), 10) === fi;
      tr.classList.toggle('tol-cur', on);
      Array.prototype.forEach.call(tr.querySelectorAll('td'), function (td) { td.classList.toggle('tol-sel', on && td.getAttribute('data-cls') === cls); });
    });
    Array.prototype.forEach.call($('tol-table').querySelectorAll('thead th[data-col]'), function (th) { th.classList.toggle('tol-colsel', th.getAttribute('data-col') === cls); });
    var cfi = curFi();
    Array.prototype.forEach.call($('tol-cards').querySelectorAll('.tol-card'), function (cd) { cd.classList.toggle('tol-sel', cfi === fi && cd.getAttribute('data-cls') === cls); });
    var m = measured(), okSet = {};
    if (m !== null && fi >= 0 && tab !== 'fit') classesContaining(side, m, st.D).forEach(function (c) { okSet[c] = 1; });
    Array.prototype.forEach.call($('tol-table').querySelectorAll('tbody tr'), function (tr) {
      var on = parseInt(tr.getAttribute('data-fi'), 10) === fi;
      Array.prototype.forEach.call(tr.querySelectorAll('td[data-cls]'), function (td) { td.classList.toggle('tol-mok', on && !!okSet[td.getAttribute('data-cls')]); });
    });
    Array.prototype.forEach.call($('tol-cards').querySelectorAll('.tol-card[data-cls]'), function (cd) { cd.classList.toggle('tol-mok', cfi === fi && !!okSet[cd.getAttribute('data-cls')]); });
    Array.prototype.forEach.call($('tol-ittable').querySelectorAll('tbody tr'), function (tr) {
      tr.classList.toggle('tol-cur', fi >= 0 && parseInt(tr.getAttribute('data-m'), 10) === F2M[fi]);
    });
  }
  /* ── Riga di riepilogo fissa in fondo (schede FORO/ALBERO) ── */
  function summaryOf(st) {
    if (tab === 'fit') return null;
    var cur = st[side];
    if (!(st.D > 0 && st.D <= 500) || !cur) return null;
    var o = limits(side, cur.letter, cur.grade, st.D);
    if (!o.ok) return { html: '<b>' + esc(cur.letter + cur.grade) + '</b> · ' + esc(t('err')[o.err] || tu('na')), copy: '' };
    var f = formats(o, lang === 'it' ? ',' : '.'), isH = side === 'hole';
    var html = '<div class="l1"><span class="cls">' + esc(f.cls) + '</span><span class="dev">' + (isH ? 'ES' : 'es') + ' ' + um(o.up) + ' · ' + (isH ? 'EI' : 'ei') + ' ' + um(o.lo) + ' µm</span></div>' +
               '<div class="l2"><span class="lim">' + esc(f.lim) + '</span><span class="u">mm</span></div>';
    var text = f.cls + ' · ' + um(o.up) + '/' + um(o.lo) + ' → ' + f.lim, m = measured();
    if (m !== null) {
      var c = checkMeasure(o, m), ms = num(m, 3), line;
      if (c.ok) line = '<span class="ok">' + tu('mIn') + '</span> ' + ms + ' · ' + umAbs(c.toMax) + ' µm ' + tu('mFromMax') + ' · ' + umAbs(c.toMin) + ' µm ' + tu('mFromMin');
      else line = '<span class="ko">' + tu('mOut') + '</span> ' + ms + ' · ' + umAbs(c.toMax < 0 ? -c.toMax : -c.toMin) + ' µm ' + (c.toMax < 0 ? tu('mOver') : tu('mUnder'));
      var devTxt = devPctTxt(c);
      html += '<div class="m">' + line + '</div><div class="m2">' + devTxt + '</div>' + measureBar(o, c, isHalf(o));
      text += ' · ' + (c.ok ? tu('mIn') : tu('mOut')) + ' ' + ms + ' (' + devTxt + ')';
    }
    return { html: html, copy: f.both, text: text };
  }
  function renderSummary(st) {
    var s = summaryOf(st), box = $('tol-summary');
    if (!s) { box.hidden = true; document.body.classList.remove('tol-has-summary'); document.body.style.paddingBottom = ''; return; }
    $('tol-sum-txt').innerHTML = s.html;
    var b = $('tol-sum-copy'); b.setAttribute('data-copy', s.copy); b.style.display = s.copy ? '' : 'none';
    var sh = $('tol-sum-share'); sh.setAttribute('data-share', s.text || ''); sh.style.display = s.text ? '' : 'none';
    var gb = $('tol-sum-gloss'); if (gb) gb.textContent = glossBtnLabel();
    box.classList.toggle('shaft', side === 'shaft');
    box.hidden = false; document.body.classList.add('tol-has-summary');
    /* v3.9: il riepilogo con la misura è più alto (barra): lo spazio libero in fondo alla pagina segue la sua altezza reale */
    document.body.style.paddingBottom = (box.offsetHeight + 14) + 'px';
  }
  function renderBand(st) {
    var el = $('tol-band'), ok = st.D > 0 && st.D <= 500;
    el.textContent = ok ? tu('band') + ' ' + bandLabel(fineIdx(st.D)) + ' mm' : tu('bandNo');
    el.classList.toggle('tol-bad', !ok);
  }

  function renderProv() {
    var box = document.getElementById('tol-prov'); if (!box) return;
    var P = provenienza(), L2 = { it: { norma: 'Norma', ediz: 'Edizione', tab: 'Tabella nella norma', un: 'Unità', st: 'Stato', alg: 'Algoritmo', test: 'Test', fonte: 'Fonte, verificata il' },
                                  en: { norma: 'Standard', ediz: 'Edition', tab: 'Table in the standard', un: 'Unit', st: 'Status', alg: 'Algorithm', test: 'Tests', fonte: 'Source, checked on' } }[lang];
    var h = '<table><tr><th>' + L2.norma + '</th><th>' + L2.ediz + '</th><th>' + L2.fonte + '</th></tr>';
    Object.keys(P.norme).forEach(function (k) { var n = P.norme[k]; h += '<tr><td class="nm">' + esc(n.sigla) + '</td><td>' + esc(n.edizione) + '</td><td>' + esc(n.fonte) + ' · ' + esc(n.verificato_il) + '<br>' + esc(n.titolo) + '<br><i>' + esc(n.stato) + '</i><br>' + esc(n.nota) + '</td></tr>'; });
    h += '</table><table style="margin-top:10px"><tr><th>' + L2.tab + '</th><th>' + L2.st + '</th><th>' + L2.alg + '</th></tr>';
    Object.keys(P.tabelle).forEach(function (k) {
      var d = P.tabelle[k], cls = d.stato === 'derivato' ? 'der' : (d.stato === 'verificato-esterno' ? 'ver' : '');
      h += '<tr><td><span class="nm">' + esc(k) + '</span><br>' + esc(P.norme[d.norma].sigla) + ':' + esc(P.norme[d.norma].edizione) + '<br>' + esc(d.tabella) + '<br>' + L2.un + ': ' + esc(d.unita) +
           '</td><td class="st ' + cls + '">' + esc(d.stato) + '</td><td>' + esc(d.algoritmo) + '<br><i>' + L2.test + ':</i> ' + d.test.map(function (x) { return '«' + esc(x) + '»'; }).join(' · ') + '</td></tr>';
    });
    box.innerHTML = h + '</table>';
  }

  function saveState() {
    try { localStorage.setItem('tolIso.state', JSON.stringify({ D: $('tol-d').value, hl: $('tol-h-let').value, hg: $('tol-h-gr').value, sl: $('tol-s-let').value, sg: $('tol-s-gr').value, side: side, tab: tab, filter: filter })); } catch (e) {}
  }
  function render() {
    var st = getState(), out = '', msgs = [], zones = [];
    var dOk = st.D > 0 && st.D <= 500;
    $('tol-d-wrap').classList.toggle('tol-bad', !dOk && String($('tol-d').value) !== '');
    if (!dOk && String($('tol-d').value) !== '') msgs.push(t('err').range);
    if (dOk) {
      var H = st.hole ? limits('hole', st.hole.letter, st.hole.grade, st.D) : null;
      var S = st.shaft ? limits('shaft', st.shaft.letter, st.shaft.grade, st.D) : null;
      if (H && !H.ok) msgs.push(t('hole') + ' ' + st.hole.letter + st.hole.grade + ': ' + t('err')[H.err]);
      if (S && !S.ok) msgs.push(t('shaft') + ' ' + st.shaft.letter + st.shaft.grade + ': ' + t('err')[S.err]);
      if (H && H.ok) { out += resBlock(H); zones.push(H); }
      if (S && S.ok) { out += resBlock(S); zones.push(S); }
      if (H && H.ok && S && S.ok) { var ff = fit(st.D, st.hole, st.shaft); out += fitBlock(ff) + cmpTable(H, S) + inspectBlock(H, S, st.D) + pressBlock(ff, st.D); }
    }
    if (!out && !msgs.length) out = '<div class="tol-empty">' + t('empty') + '</div>';
    $('tol-out').innerHTML = out;
    $('tol-diagram-box').innerHTML = diagram(zones);
    var zh = zones.filter(function (z) { return z.kind === 'hole'; })[0] || null, zs = zones.filter(function (z) { return z.kind === 'shaft'; })[0] || null;
    $('tol-fitdraw-box').innerHTML = (dOk && zones.length) ? (photoReady ? fitDrawingPhoto(zh, zs, st.D) : fitDrawing(zh, zs, st.D)) : '';
    var m = $('tol-msg'); m.innerHTML = msgs.map(esc).join('<br>'); m.classList.toggle('on', msgs.length > 0);
    ['hole', 'shaft'].forEach(function (k) {
      var cur = st[k] ? st[k].letter + st[k].grade : '';
      Array.prototype.forEach.call($('tol-' + (k === 'hole' ? 'h' : 's') + '-chips').children, function (b) { b.classList.toggle('on', b.getAttribute('data-cls') === cur); });
    });
    renderBand(st); markTable(st); renderSummary(st); buildFits(); if (tab === 'fit') buildFinder(); renderRep(); renderGlossAns();
    saveState();
  }

  function applyQuick() {
    var inp = $('tol-quick'), v = inp.value.trim(), wrap = $('tol-quick-wrap');
    if (!v) { wrap.classList.remove('tol-bad'); return; }
    var p = parse(v);
    wrap.classList.toggle('tol-bad', !p);
    if (!p) { var m = $('tol-msg'); m.textContent = t('bad'); m.classList.add('on'); return; }
    $('tol-d').value = p.D; viewFi = -1;
    $('tol-h-let').value = ''; $('tol-s-let').value = '';
    if (p.hole) setClass(p.hole);
    if (p.shaft) setClass(p.shaft);
    rebuildTables(); render(); noteRecent();
  }
  /* Recenti: il testo della quota corrente (classe sola o coppia), solo se il Ø e le classi sono validi */
  function noteRecent() {
    var st = getState(); if (!(st.D > 0 && st.D <= 500)) return;
    var H = st.hole && limits('hole', st.hole.letter, st.hole.grade, st.D), S = st.shaft && limits('shaft', st.shaft.letter, st.shaft.grade, st.D);
    if (tab === 'fit' && H && H.ok && S && S.ok) pushRecent(fmtD(st.D) + ' ' + st.hole.letter + st.hole.grade + '/' + st.shaft.letter + st.shaft.grade);
    else if (tab !== 'fit') { var o = st[side] && (side === 'hole' ? H : S); if (o && o.ok) pushRecent(fmtD(st.D) + ' ' + st[side].letter + st[side].grade); }
  }
  function applyRecent(txt) {
    var p = parse(txt); if (!p) return;
    $('tol-d').value = p.D; viewFi = -1;
    if (p.hole && p.shaft) { setClass(p.hole); setClass(p.shaft); setTab('fit'); }
    else if (p.hole) { setClass(p.hole); setTab('hole'); }
    else if (p.shaft) { setClass(p.shaft); setTab('shaft'); }
    rebuildTables(); render(); noteRecent();
  }
  function rebuildTables() { buildTable(); buildCards(); }
  function setTab(tb) {
    if (!/^(hole|shaft|fit)$/.test(tb)) return;
    tab = tb; if (tab !== 'fit') side = tab;
    Array.prototype.forEach.call($('tol-tabs').children, function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
    $('tol-panel-table').hidden = tab === 'fit';
    $('tol-panel-fit').hidden = tab !== 'fit';
    $('tol-filter').style.display = tab === 'fit' ? 'none' : '';
    $('tol-mbox').style.display = tab === 'fit' ? 'none' : '';
    if (tab !== 'fit') rebuildTables();
  }
  function setFilter(f) {
    if (!(f in FILTERS)) return;
    filter = f;
    Array.prototype.forEach.call($('tol-filter').children, function (b) { b.classList.toggle('on', b.getAttribute('data-filter') === filter); });
    rebuildTables();
  }
  function moveBand(d) {
    var fi = Math.max(0, Math.min(R_FINE.length - 1, curFi() + d));
    viewFi = fi; buildCards(); markTable(getState());
  }

  function copyText(txt, el) {
    function done() { if (el.classList.contains('on')) return; var old = el.textContent; el.textContent = '✓ ' + t('copied'); el.classList.add('on'); setTimeout(function () { el.textContent = old; el.classList.remove('on'); }, 1100); }
    function legacy() { var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} document.body.removeChild(ta); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, legacy); else legacy();
  }

  function mount() {
    root = $('view-tol');
    if (!root || root.getAttribute('data-tol-mounted')) return;
    root.setAttribute('data-tol-mounted', '1');
    fillSelects(); fillChips();
    try {
      var sv = JSON.parse(localStorage.getItem('tolIso.state') || 'null');
      if (sv) { $('tol-d').value = sv.D; $('tol-h-let').value = sv.hl || ''; $('tol-h-gr').value = sv.hg || '7'; $('tol-s-let').value = sv.sl || ''; $('tol-s-gr').value = sv.sg || '6';
                if (sv.side === 'shaft') side = 'shaft'; if (sv.tab && /^(hole|shaft|fit)$/.test(sv.tab)) tab = sv.tab; else tab = side; if (sv.filter in FILTERS) filter = sv.filter; }
      else { $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; $('tol-s-let').value = 'g'; $('tol-s-gr').value = '6'; }
    } catch (e) { $('tol-h-let').value = 'H'; $('tol-s-let').value = 'g'; $('tol-s-gr').value = '6'; }
    Array.prototype.forEach.call($('tol-filter').children, function (b) { b.classList.toggle('on', b.getAttribute('data-filter') === filter); });
    loadRecent(); renderRecent(); loadFav(); renderFav(); loadRep(); preloadPhoto();
    try { if (window.matchMedia && window.matchMedia('(min-width: 900px)').matches) $('tol-fits-det').open = true; } catch (e) {}
    setTab(tab); buildItTable(); renderProv(); buildFinder(); buildGloss();
    $('tol-gloss-q').addEventListener('input', renderGlossAns);
    if (tab === 'fit') rebuildTables();

    ['tol-h-let', 'tol-h-gr', 'tol-s-let', 'tol-s-gr'].forEach(function (id) {
      $(id).addEventListener('input', render); $(id).addEventListener('change', render);
    });
    ['input', 'change'].forEach(function (ev) { $('tol-d').addEventListener(ev, function () { viewFi = -1; buildCards(); render(); }); });
    /* campo unico: se contiene una classe («25 H7», «40 g6», «25 H7/g6») la applica e va nella scheda giusta (Invio o uscita dal campo) */
    function applyD() { var v = $('tol-d').value.trim(); if (!/[a-z]/i.test(v)) return; var p = parse(v); if (!p) { $('tol-d-wrap').classList.add('tol-bad'); return; } applyRecent(v); $('tol-d').blur(); }
    $('tol-d').addEventListener('keydown', function (e) { if (e.key === 'Enter') applyD(); });
    $('tol-d').addEventListener('change', applyD);
    ['input', 'change'].forEach(function (ev) { $('tol-m').addEventListener(ev, render); });
    $('tol-quick').addEventListener('keydown', function (e) { if (e.key === 'Enter') applyQuick(); });
    $('tol-quick').addEventListener('change', applyQuick);
    root.addEventListener('input', function (e) { var el = e.target; if (el && el.hasAttribute && el.hasAttribute('data-rep')) { rep[el.getAttribute('data-rep')] = String(el.value).trim(); saveRep(); renderRep(); } });
    root.addEventListener('change', function (e) {
      var el = e.target; if (!el || !el.hasAttribute) return;
      if (el.hasAttribute('data-rep')) { rep[el.getAttribute('data-rep')] = String(el.value).trim(); saveRep(); renderRep(); return; }
      if (el.hasAttribute('data-insp')) { insp[el.getAttribute('data-insp')] = String(el.value).trim(); insp.open = true; render(); return; }
      if (!el.hasAttribute('data-press')) return;
      var k = el.getAttribute('data-press'), v = String(el.value).replace(',', '.');
      if (k === 'mh' || k === 'ms') { press[k] = v; press[k === 'mh' ? 'Eh' : 'Es'] = null; press[k === 'mh' ? 'nuh' : 'nus'] = null; if (k === 'mh') press.Re = null; }
      else { var n = parseFloat(v); press[k] = isFinite(n) ? n : null; }
      press.open = true; render();
    });
    ['tol-find-a', 'tol-find-b'].forEach(function (id) { $(id).addEventListener('input', function () { finder[id === 'tol-find-a' ? 'a' : 'b'] = String(this.value).trim(); finder.all = false; buildFinder(); }); });
    $('tol-find-basis').addEventListener('change', function () { finder.basis = this.value; finder.all = false; buildFinder(); });
    root.addEventListener('toggle', function (e) { if (e.target && e.target.id === 'tol-find-det') buildFinder(); if (e.target && e.target.id === 'tol-press-det') press.open = e.target.open; if (e.target && e.target.id === 'tol-insp-det') insp.open = e.target.open; }, true);
    root.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-cls],[data-tab],[data-filter],[data-band],[data-copy],[data-share],[data-quick],[data-fit],[data-favdel],[data-recdel],[data-ft],[data-findmore],#tol-sum-gloss,#tol-fav-btn,#tol-sheet-btn,#tol-rep-btn,#tol-sum-rep,#tol-rep-close,#tol-rep-print,#tol-rep-share,#tol-rep-copy') : null;
      if (!el || !root.contains(el)) return;
      if (el.id === 'tol-fav-btn') { var q = currentQuota(); if (!q) { TolISO.showAlert(lang === 'it' ? 'Prima imposta un Ø e almeno una classe.' : 'Set a Ø and at least one class first.'); return; } var nm = window.prompt(lang === 'it' ? 'Nome del preferito (es. Perno pinza):' : 'Favourite name (e.g. Gripper pin):', q); if (nm !== null) addFav(nm, q); return; }
      if (el.hasAttribute('data-favdel')) { var fi0 = parseInt(el.getAttribute('data-favdel'), 10), f0 = fav[fi0]; if (f0 && window.confirm((lang === 'it' ? 'Eliminare il preferito «' : 'Delete favourite “') + f0.n + (lang === 'it' ? '»?' : '”?'))) delFav(fi0); return; }
      if (el.hasAttribute('data-recdel')) { delRecent(parseInt(el.getAttribute('data-recdel'), 10)); return; }
      if (el.hasAttribute('data-ft')) { finder.type = el.getAttribute('data-ft'); finder.all = false; buildFinder(); return; }
      if (el.hasAttribute('data-findmore')) { finder.all = !finder.all; buildFinder(); return; }
      if (el.id === 'tol-rep-btn' || el.id === 'tol-sum-rep') { openRep(); return; }
      if (el.id === 'tol-sum-gloss') { var stg = getState(), cg = stg[side]; openGloss(cg ? cg.letter + cg.grade : ''); return; }
      if (el.id === 'tol-rep-close') { rep.open = false; renderRep(); return; }
      if (el.id === 'tol-rep-print') { var d1 = reportData(); if (d1.err) { showAlert(rl(d1.err)); return; } renderRep(); API.repPrint = true; var pb1 = document.getElementById('tol-print-btn'); if (pb1) pb1.click(); return; }
      if (el.id === 'tol-rep-share') { var d2 = reportData(); if (d2.err) { showAlert(rl(d2.err)); return; } shareText(reportText(d2), el); return; }
      if (el.id === 'tol-rep-copy') { var d3 = reportData(); if (d3.err) { showAlert(rl(d3.err)); return; } copyText(reportText(d3), el); return; }
      if (el.id === 'tol-sheet-btn') { var pb = document.getElementById('tol-print-btn'); if (pb) pb.click(); return; }
      if (el.hasAttribute('data-copy')) { copyText(el.getAttribute('data-copy'), el); return; }
      if (el.hasAttribute('data-share')) { shareText(el.getAttribute('data-share'), el); return; }
      if (el.hasAttribute('data-quick')) { applyRecent(el.getAttribute('data-quick')); return; }
      if (el.hasAttribute('data-fit')) { var pf = parse('1 ' + el.getAttribute('data-fit')); if (pf) { setClass(pf.hole); setClass(pf.shaft); render(); noteRecent(); } return; }
      if (el.hasAttribute('data-tab')) { setTab(el.getAttribute('data-tab')); render(); return; }
      if (el.hasAttribute('data-filter')) { setFilter(el.getAttribute('data-filter')); render(); return; }
      if (el.hasAttribute('data-band')) { moveBand(parseInt(el.getAttribute('data-band'), 10)); return; }
      var c = parseClass(el.getAttribute('data-cls'));
      if (!c) return;
      if (el.classList.contains('tol-chip') && el.classList.contains('on')) { $('tol-' + (c.kind === 'hole' ? 'h' : 's') + '-let').value = ''; }  /* secondo clic = deseleziona */
      else setClass(c);
      var fi = el.tagName === 'TD' ? parseInt(el.parentNode.getAttribute('data-fi'), 10) : (el.hasAttribute('data-fi') ? parseInt(el.getAttribute('data-fi'), 10) : -1);
      if (fi >= 0) {                                 /* dalla parete o dalle schede: se il nominale è fuori fascia, porta il nominale nella fascia cliccata */
        var rb = rangeBounds(fi, true), D = parseFloat($('tol-d').value);
        if (!(D > rb[0] && D <= rb[1])) { $('tol-d').value = rb[1]; viewFi = -1; buildCards(); }
      }
      render(); noteRecent();
    });
    render();
  }

  function setLang(l) {
    if (!T[l]) return;
    lang = l;
    if (!root) return;
    fillSelects(); rebuildTables(); buildItTable(); renderProv(); buildGloss(); render(); renderRecent(); renderFav();
    var mi = $('tol-m'); if (mi) mi.placeholder = mi.getAttribute('data-ph-' + lang) || mi.placeholder;
    Array.prototype.forEach.call(document.querySelectorAll('#tol-rep input[data-ph-it]'), function (i) { i.placeholder = i.getAttribute('data-ph-' + lang); });
    renderRep();
  }
  function printLabel() { return side === 'hole' ? tu('printHole') : tu('printShaft'); }
  function getUI() { return { tab: tab, side: side, filter: filter, viewFi: viewFi, cols: colsFor(side) }; }
  function pressPreset(o) { Object.keys(o).forEach(function (k) { press[k] = o[k]; }); }
  function showAlert(msg) { var a = document.getElementById('tol-alert'); if (!a) return; a.textContent = msg; a.classList.add('on'); }

  /* ════════ AUTOTEST DELLA UI (solo nel browser, dopo mount) — la parete e le schede devono dire esattamente quello che dice limits() ════════ */
  function uiTest() {
    var pass = 0, fail = 0, failures = [];
    function ck(name, cond) { if (cond) pass++; else { fail++; failures.push(name); } }
    if (!root) return { pass: 0, fail: 1, total: 1, failures: ['UI non montata'] };
    var keep = { tab: tab, side: side, filter: filter, viewFi: viewFi, D: $('tol-d').value, hl: $('tol-h-let').value, hg: $('tol-h-gr').value, sl: $('tol-s-let').value, sg: $('tol-s-gr').value };
    function cellTxt(td) { return td.innerHTML.replace(/<br>/g, '|'); }
    /* 1. parete: ogni casella == limits, per tutte le fasce e tutte le colonne, entrambi i lati */
    setFilter('all');
    ['hole', 'shaft'].forEach(function (k) {
      setTab(k);
      var rows = $('tol-table').querySelectorAll('tbody tr'), cols = COLS[k];
      ck('parete ' + k + ': 25 fasce', rows.length === 25);
      ck('parete ' + k + ': ' + cols.length + ' colonne', $('tol-table').querySelectorAll('thead th[data-col]').length === cols.length);
      Array.prototype.forEach.call(rows, function (tr, fi) {
        var rb = rangeBounds(fi, true), tds = tr.querySelectorAll('td');
        cols.forEach(function (c, i) {
          var pc = parseClass(c), o = limits(k, pc.letter, pc.grade, rb[1]), td = tds[i];
          if (o.ok) ck('parete ' + k + ' ' + c + ' @' + rb[1] + ': ' + um(o.up) + '|' + um(o.lo), td.getAttribute('data-cls') === c && cellTxt(td) === um(o.up) + '|' + um(o.lo));
          else ck('parete ' + k + ' ' + c + ' @' + rb[1] + ': non prevista', td.classList.contains('tol-na') && !td.hasAttribute('data-cls'));
        });
      });
      /* 2. schede: per ogni fascia, esattamente le colonne, nell'ordine di COLS, con «na» dove limits rifiuta */
      for (var fi = 0; fi < 25; fi++) {
        viewFi = fi; buildCards();
        var cards = $('tol-cards').querySelectorAll('.tol-card'), rb2 = rangeBounds(fi, true), okAll = cards.length === cols.length;
        cols.forEach(function (c, i) {
          var pc = parseClass(c), o = limits(k, pc.letter, pc.grade, rb2[1]), cd = cards[i];
          if (!cd) { okAll = false; return; }
          if (cd.querySelector('.k').textContent !== c) okAll = false;
          if (o.ok) { if (cd.getAttribute('data-cls') !== c || cd.querySelector('.v').textContent !== um(o.up) + ' / ' + um(o.lo) || cd.classList.contains('tol-na')) okAll = false; }
          else if (!cd.classList.contains('tol-na') || cd.hasAttribute('data-cls')) okAll = false;
        });
        ck('schede ' + k + ' fascia ' + bandLabel(fi), okAll);
      }
      var lets = $('tol-cards').querySelectorAll('.tol-let'), uniq = {}; cols.forEach(function (c) { uniq[parseClass(c).letter] = 1; });
      ck('schede ' + k + ': un titolo per lettera', lets.length === Object.keys(uniq).length);
    });
    viewFi = -1;
    /* 3. filtri: solo i gradi dichiarati, in parete e in schede */
    Object.keys(FILTERS).forEach(function (f) {
      setFilter(f); var r = FILTERS[f];
      ['hole', 'shaft'].forEach(function (k) {
        setTab(k);
        var ths = $('tol-table').querySelectorAll('thead th[data-col]'), ok = true, n = 0;
        Array.prototype.forEach.call(ths, function (th) { var g = parseClass(th.getAttribute('data-col')).grade; n++; if (r && (g < r[0] || g > r[1])) ok = false; });
        var exp = COLS[k].filter(function (c) { var g = parseClass(c).grade; return !r || (g >= r[0] && g <= r[1]); }).length;
        ck('filtro ' + f + ' ' + k + ': ' + exp + ' colonne nei gradi giusti', ok && n === exp && $('tol-cards').querySelectorAll('.tol-card').length === exp);
      });
    });
    setFilter('all');
    /* 4. tocco: stessa fascia · fascia diversa · classe non prevista */
    setTab('hole'); $('tol-d').value = '25'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; viewFi = -1; rebuildTables(); render();
    function clickCell(fi, cls) { var tr = $('tol-table').querySelector('tr[data-fi="' + fi + '"]'); var td = cls ? tr.querySelector('td[data-cls="' + cls + '"]') : tr.querySelector('td.tol-na'); td.click(); return td; }
    clickCell(6, 'G7');   /* Ø25 sta nella fascia fine 24…30 (indice 6) */
    ck('tocco stessa fascia: classe G7, Ø resta 25', $('tol-h-let').value === 'G' && $('tol-h-gr').value === '7' && $('tol-d').value === '25');
    ck('tocco: riepilogo Ø25 G7 +28/+7', /Ø25 G7/.test($('tol-sum-txt').textContent) && /\+28/.test($('tol-sum-txt').textContent) && $('tol-sum-copy').getAttribute('data-copy') === 'Ø25 G7 (+0,028/+0,007)');
    clickCell(9, 'H7');
    ck('tocco fascia diversa: Ø portato a 65, classe H7', $('tol-d').value === '65' && $('tol-h-let').value === 'H' && $('tol-h-gr').value === '7');
    ck('tocco fascia diversa: riepilogo 65,030 / 65,000', /65,030 \/ 65,000/.test($('tol-sum-txt').textContent));
    var before = $('tol-h-let').value + $('tol-h-gr').value + '|' + $('tol-d').value;
    clickCell(9, null);
    ck('tocco casella non prevista: niente cambia', before === $('tol-h-let').value + $('tol-h-gr').value + '|' + $('tol-d').value);
    /* schede: tocco su scheda di un'altra fascia */
    viewFi = 12; buildCards(); var cd = $('tol-cards').querySelector('.tol-card[data-cls="H8"]'); cd.click();
    ck('scheda altra fascia: Ø → 120, H8, schede tornano sulla fascia del Ø', $('tol-d').value === '120' && $('tol-h-gr').value === '8' && viewFi === -1 && /120/.test($('tol-bandlbl').textContent));
    ck('scheda selezionata evidenziata', $('tol-cards').querySelector('.tol-card.tol-sel') && $('tol-cards').querySelector('.tol-card.tol-sel').getAttribute('data-cls') === 'H8');
    /* frecce fascia */
    moveBand(1); ck('freccia +1: fascia 120…140, etichetta «altra fascia»', viewFi === 13 && /> 120/.test($('tol-bandlbl').textContent) && !$('tol-cards').querySelector('.tol-card.tol-sel'));
    moveBand(-1); moveBand(-1); ck('frecce -2: fascia 80…100', viewFi === 11);
    for (var i = 0; i < 30; i++) moveBand(1); ck('freccia oltre l\'ultima fascia: si ferma a 450…500', viewFi === 24 && $('tol-panel-table').querySelector('[data-band="1"]').disabled);
    /* 5. scheda ALBERO + riepilogo albero */
    setTab('shaft'); $('tol-d').value = '25'; $('tol-s-let').value = 'g'; $('tol-s-gr').value = '6'; viewFi = -1; rebuildTables(); render();
    ck('albero: riepilogo Ø25 g6 es −7 ei −20 → 24,993 / 24,980', /Ø25 g6/.test($('tol-sum-txt').textContent) && /24,993 \/ 24,980/.test($('tol-sum-txt').textContent));
    ck('albero: fascia mostrata 24…30', /> 24 … 30/.test($('tol-band').textContent));
    /* 6. accoppiamento: riepilogo nascosto, pannello visibile */
    setTab('fit'); render();
    ck('accoppiamento: pannello visibile, parete nascosta, riepilogo nascosto', !$('tol-panel-fit').hidden && $('tol-panel-table').hidden && $('tol-summary').hidden);
    /* 7. Ø fuori campo */
    setTab('hole'); $('tol-d').value = '600'; render();
    ck('Ø 600: nessuna riga evidenziata, riepilogo nascosto, avviso', !$('tol-table').querySelector('tr.tol-cur') && $('tol-summary').hidden && $('tol-band').classList.contains('tol-bad'));
    /* 8. stato salvato */
    $('tol-d').value = '40'; setFilter('fine'); render();
    var sv = null; try { sv = JSON.parse(localStorage.getItem('tolIso.state')); } catch (e) {}
    ck('stato salvato: D 40, tab hole, filtro fine', sv && sv.D === '40' && sv.tab === 'hole' && sv.filter === 'fine' && sv.side === 'hole');
    /* 9. lingua: titoli e schede in EN, poi ritorno */
    setLang('en'); ck('EN: titolo parete', /HOLE tolerances/.test($('tol-table-title').textContent)); setLang('it'); ck('IT: titolo parete', /Tolleranze FORO/.test($('tol-table-title').textContent));
    /* 10. accoppiamenti consigliati: 20 righe, tipo calcolato dal modulo, tocco imposta la coppia */
    setTab('fit'); $('tol-d').value = '25'; render();
    var rows = $('tol-fits').querySelectorAll('.tol-fitrow');
    ck('consigliati: ' + FITS.length + ' righe', rows.length === FITS.length);
    ck('consigliati: H7/g6 a Ø25 = gioco, H7/p6 = forzato, H7/k6 = incerto', (function () { var m = {}; Array.prototype.forEach.call(rows, function (r) { m[r.getAttribute('data-fit')] = r.querySelector('i').textContent; }); return m['H7/g6'] === tu('clr') && m['H7/p6'] === tu('itf') && m['H7/k6'] === tu('trn'); })());
    $('tol-fits').querySelector('[data-fit="H7/p6"]').click();
    ck('consigliati: tocco H7/p6 → classi impostate e riga evidenziata', $('tol-h-let').value === 'H' && $('tol-h-gr').value === '7' && $('tol-s-let').value === 'p' && $('tol-s-gr').value === '6' && $('tol-fits').querySelector('.tol-fitrow.on').getAttribute('data-fit') === 'H7/p6');
    ck('consigliati: ogni coppia è calcolabile a Ø25 e a Ø300', FITS.every(function (f) { return [25, 300].every(function (D) { var r = fit(D, parseClass(f[0]), parseClass(f[1])); return r && r.type; }); }));
    /* 11. controllo misura: dentro, fuori sopra, fuori sotto; evidenziazione delle classi che contengono la misura */
    setTab('hole'); $('tol-d').value = '25'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; viewFi = -1; rebuildTables();
    $('tol-m').value = '25.010'; render();
    ck('misura 25,010 su H7: DENTRO, 11 dal max, 10 dal min', /DENTRO/.test($('tol-sum-txt').textContent) && /11 µm dal max/.test($('tol-sum-txt').textContent) && /10 µm dal min/.test($('tol-sum-txt').textContent));
    ck('misura: H7 e le classi che la contengono sono evidenziate in parete e schede', $('tol-table').querySelector('tr.tol-cur td[data-cls="H7"]').classList.contains('tol-mok') && $('tol-cards').querySelector('.tol-card[data-cls="H7"]').classList.contains('tol-mok') && !$('tol-table').querySelector('tr.tol-cur td[data-cls="P7"]').classList.contains('tol-mok'));
    ck('misura: classesContaining coerente con limits', (function () { var cs = classesContaining('hole', 25.010, 25); return cs.indexOf('H7') >= 0 && cs.indexOf('H8') >= 0 && cs.indexOf('G7') >= 0 && cs.indexOf('P7') < 0 && cs.every(function (c) { var pc = parseClass(c), o = limits('hole', pc.letter, pc.grade, 25); return o.ok && 25.010 >= o.min - 1e-9 && 25.010 <= o.max + 1e-9; }); })());
    $('tol-m').value = '25.030'; render();
    ck('misura 25,030 su H7: FUORI, 9 µm oltre il massimo', /FUORI/.test($('tol-sum-txt').textContent) && /9 µm oltre il massimo/.test($('tol-sum-txt').textContent));
    $('tol-m').value = '24.995'; render();
    ck('misura 24,995 su H7: FUORI, 5 µm sotto il minimo', /FUORI/.test($('tol-sum-txt').textContent) && /5 µm sotto il minimo/.test($('tol-sum-txt').textContent));
    ck('misura: condividi porta il testo con l\'esito', /FUORI 24,995/.test($('tol-sum-share').getAttribute('data-share')));
    /* 11b. misura completa (v3.9): scostamento dal nominale, % usata, barra con il segno a pos% */
    $('tol-m').value = '25.010'; render();
    ck('misura 25,010: +10 µm dal nominale · 48% della tolleranza usata', /\+10 µm dal nominale · 48% della tolleranza usata/.test($('tol-sum-txt').textContent));
    ck('misura 25,010: barra con segno a 47,6% e limiti 25,000 / 25,021', (function () { var b = $('tol-sum-txt').querySelector('.mbar'); return b && !b.classList.contains('ko') && b.querySelector('.mk').style.left === '47.6%' && b.querySelector('.lo').textContent === '25,000' && b.querySelector('.hi').textContent === '25,021'; })());
    $('tol-m').value = '25.030'; render();
    ck('misura 25,030: barra rossa, segno fermo al bordo destro (100%)', (function () { var b = $('tol-sum-txt').querySelector('.mbar'); return b && b.classList.contains('ko') && b.querySelector('.mk').style.left === '100%'; })());
    ck('misura 25,030: +30 µm dal nominale · 143%', /\+30 µm dal nominale · 143%/.test($('tol-sum-txt').textContent));
    $('tol-m').value = '24.995'; render();
    ck('misura 24,995: −5 µm dal nominale, segno al bordo sinistro (0%)', /−5 µm dal nominale/.test($('tol-sum-txt').textContent) && $('tol-sum-txt').querySelector('.mk').style.left === '0%');
    ck('misura: condividi porta anche scostamento e percentuale', /−5 µm dal nominale · −24% della tolleranza usata/.test($('tol-sum-share').getAttribute('data-share')));
    $('tol-m').value = ''; render();
    ck('misura vuota: niente esito, niente evidenziazione', !/DENTRO|FUORI/.test($('tol-sum-txt').textContent) && !$('tol-table').querySelector('.tol-mok'));
    /* 12. recenti: tocco registra, primo = più recente, senza doppioni, massimo 8, richiamo ripristina */
    var keepRecent = recent.slice(); recent = []; try { localStorage.removeItem('tolIso.recent'); } catch (e) {}
    clickCell(6, 'G7'); clickCell(6, 'H8'); clickCell(6, 'G7');
    ck('recenti: G7 in testa, H8 dopo, nessun doppione', recent.length === 2 && recent[0] === '25 G7' && recent[1] === '25 H8');
    for (var q = 0; q < 12; q++) { $('tol-d').value = String(30 + q); rebuildTables(); render(); clickCell(fineIdx(30 + q), 'H7'); }
    ck('recenti: massimo 8', recent.length === 8 && $('tol-recent').querySelectorAll('[data-quick]').length === 8);
    var rec0 = recent[0], rec1 = recent[1]; $('tol-recent').querySelector('[data-recdel="0"]').click();
    ck('recenti: ✕ toglie solo quella voce', recent.length === 7 && recent[0] === rec1 && recent.indexOf(rec0) < 0 && $('tol-recent').querySelectorAll('[data-recdel]').length === 7);
    $('tol-recent').querySelector('[data-quick="25 H8"]') ? 0 : pushRecent('25 H8');
    $('tol-recent').querySelector('[data-quick="25 H8"]').click();
    ck('recenti: richiamo «25 H8» → Ø 25, H8, scheda FORO', $('tol-d').value === '25' && $('tol-h-let').value === 'H' && $('tol-h-gr').value === '8' && tab === 'hole');
    pushRecent('40 H7/g6'); $('tol-recent').querySelector('[data-quick="40 H7/g6"]').click();
    ck('recenti: richiamo coppia → scheda ACCOPPIAMENTO con entrambe le classi', tab === 'fit' && $('tol-d').value === '40' && $('tol-s-let').value === 'g' && $('tol-s-gr').value === '6');
    recent = keepRecent; try { localStorage.setItem('tolIso.recent', JSON.stringify(recent)); } catch (e) {} renderRecent();
    /* 14. disegno dell'accoppiamento: presente con due classi, geometria in scala dichiarata */
    setTab('fit'); $('tol-d').value = '25'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; $('tol-s-let').value = 'g'; $('tol-s-gr').value = '6'; render();
    ck('disegno: SVG presente con H7/g6', !!$('tol-fitdraw-box').querySelector('svg.tol-fitdraw'));
    (function () { var H = limits('hole', 'H', 7, 25), S = limits('shaft', 'g', 6, 25), g = fitDrawGeom(H, S, 25);
      ck('disegno: zona foro alta IT7·s/2 e zona albero IT6·s/2', Math.abs((g.hole.min - g.hole.max) - H.it * g.s / 2) < 1e-9 && Math.abs((g.shaft.min - g.shaft.max) - S.it * g.s / 2) < 1e-9);
      ck('disegno: gioco minimo in px = (EI − es)·s/2', Math.abs((g.shaft.max - g.hole.min) - (H.lo - S.up) * g.s / 2) < 1e-9);
      ck('disegno: lo scostamento più grande vale 28 px', Math.abs(Math.max(Math.abs(H.up), Math.abs(H.lo), Math.abs(S.up), Math.abs(S.lo)) * g.s - 28) < 1e-9);
      ck('disegno: ingrandimento dichiarato = s / scala vera', Math.abs(g.k - g.s / (150 / 25000)) < 1e-9);
      var P = limits('shaft', 'p', 6, 25), gp = fitDrawGeom(H, P, 25);
      ck('disegno: H7/p6 albero max sopra foro min (interferenza)', gp.shaft.max < gp.hole.min && /interferenza max/.test((function () { $('tol-s-let').value = 'p'; render(); return $('tol-fitdraw-box').textContent; })()));
    })();
    $('tol-s-let').value = ''; render(); ck('disegno: solo foro → SVG comunque presente', !!$('tol-fitdraw-box').querySelector('svg'));
    $('tol-h-let').value = ''; render(); ck('disegno: nessuna classe → niente SVG', !$('tol-fitdraw-box').querySelector('svg'));
    /* 15. campo unico: quota completa nel campo Ø */
    setTab('hole'); $('tol-d').value = '40 g6'; $('tol-d').dispatchEvent(new Event('change'));
    ck('campo unico: «40 g6» → scheda ALBERO, Ø 40, g6', tab === 'shaft' && $('tol-d').value === '40' && $('tol-s-let').value === 'g' && $('tol-s-gr').value === '6');
    $('tol-d').value = '25 H7/g6'; $('tol-d').dispatchEvent(new Event('change'));
    ck('campo unico: «25 H7/g6» → ACCOPPIAMENTO', tab === 'fit' && $('tol-d').value === '25' && $('tol-h-gr').value === '7');
    $('tol-d').value = '25 XYZ'; $('tol-d').dispatchEvent(new Event('change'));
    ck('campo unico: testo non valido → campo segnato in rosso, niente cambia', $('tol-d-wrap').classList.contains('tol-bad') && tab === 'fit');
    /* 17. forzato in ACCOPPIAMENTO: compare solo con interferenza, i campi aggiornano i numeri */
    setTab('fit'); $('tol-d').value = '25'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; $('tol-s-let').value = 'g'; $('tol-s-gr').value = '6'; render();
    ck('forzato: assente con H7/g6', !$('tol-press-det'));
    $('tol-s-let').value = 'u'; render();
    ck('forzato: presente con H7/u6', !!$('tol-press-det') && /MPa/.test($('tol-press-det').textContent));
    pressPreset({ De: 50, di: 0, L: 25, mu: 0.10, mh: 'steel', ms: 'steel', Eh: 205000, nuh: 0.29, Es: 205000, nus: 0.29, Re: null }); render();
    ck('forzato: con i dati TolerangeLab mostra 83,0 MPa e 16,30 kN', /83,0/.test($('tol-press-det').textContent) && /16,30/.test($('tol-press-det').textContent));
    var deIn = $('tol-press-det').querySelector('[data-press="De"]'); deIn.value = '100'; deIn.dispatchEvent(new Event('change', { bubbles: true }));
    ck('forzato: cambio Ø esterno mozzo → pressione più alta e scheda aperta', press.De === 100 && $('tol-press-det').open && !/83,0/.test($('tol-press-det').textContent));
    pressPreset({ De: null, di: 0, L: null, mu: 0.15, mh: 'steel', ms: 'steel', Eh: null, nuh: null, Es: null, nus: null, Re: null, open: false });
    /* 18. preferiti: salva con nome, richiama, elimina, massimo 24 */
    var keepFav = fav.slice(); fav = []; renderFav();
    setTab('fit'); $('tol-d').value = '12'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; $('tol-s-let').value = 'g'; $('tol-s-gr').value = '6'; render();
    ck('preferiti: quota corrente «12 H7/g6»', currentQuota() === '12 H7/g6');
    addFav('Perno pinza', currentQuota()); addFav('Boccola', '30 H8/f7');
    ck('preferiti: due voci, ultima in testa, riga visibile', fav.length === 2 && fav[0].n === 'Boccola' && $('tol-fav').querySelectorAll('.fav').length === 2);
    $('tol-fav').querySelector('[data-quick="12 H7/g6"]').click();
    ck('preferiti: richiamo «Perno pinza» → Ø 12, H7/g6, scheda ACCOPPIAMENTO', tab === 'fit' && $('tol-d').value === '12' && $('tol-h-gr').value === '7' && $('tol-s-let').value === 'g');
    addFav('Perno pinza', '12 H7/g6'); ck('preferiti: stesso nome+quota non duplica', fav.length === 2);
    for (var q2 = 0; q2 < 30; q2++) addFav('x' + q2, '20 H7'); ck('preferiti: massimo 24', fav.length === 24);
    delFav(0); ck('preferiti: elimina', fav.length === 23);
    ck('preferiti: nome vuoto rifiutato', addFav('   ', '20 H7') === false);
    fav = keepFav; saveFav();
    /* 19. collaudo: dentro/fuori per foro e albero, gioco effettivo, verdetto */
    $('tol-d').value = '25'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; $('tol-s-let').value = 'g'; $('tol-s-gr').value = '6';
    insp.mh = '25,010'; insp.ms = '24,985'; insp.open = true; render();
    ck('collaudo: foro DENTRO, albero DENTRO, gioco effettivo 25 µm, coppia conforme', /foro DENTRO/.test($('tol-insp-det').textContent) && /albero DENTRO/.test($('tol-insp-det').textContent) && /gioco effettivo/.test($('tol-insp-det').textContent) && /gioco effettivo\s*25 µm/.test($('tol-insp-det').textContent) && /Coppia conforme/.test($('tol-insp-det').textContent));
    insp.ms = '24,975'; render();
    ck('collaudo: albero 24,975 FUORI (5 µm sotto il min), coppia non conforme', /albero FUORI/.test($('tol-insp-det').textContent) && /5 µm sotto il min/.test($('tol-insp-det').textContent) && /NON conforme/.test($('tol-insp-det').textContent));
    $('tol-s-let').value = 'p'; insp.mh = '25,000'; insp.ms = '25,030'; render();
    ck('collaudo H7/p6: interferenza effettiva 30 µm', /interferenza effettiva\s*30 µm/.test($('tol-insp-det').textContent));
    ck('collaudo: per ogni pezzo anche scostamento dal nominale e % usata (foro 25,000 = 0 µm · 0%)', /0 µm dal nominale · 0% della tolleranza usata/.test($('tol-insp-det').textContent) && /\+30 µm dal nominale/.test($('tol-insp-det').textContent));
    /* 19b. tabella di confronto foro | albero (v3.9) */
    ck('confronto: tabella con intestazioni Foro H7 / Albero p6 e 6 righe', (function () { var tb = $('tol-out').querySelector('.tol-cmp table'); if (!tb) return false; var th = tb.querySelectorAll('th'); return th.length === 3 && /Foro H7/.test(th[1].textContent) && /Albero p6/.test(th[2].textContent) && tb.querySelectorAll('tr').length === 7; })());
    ck('confronto: valori uguali a limits (H7 +21/0 · p6 +35/+22 a Ø25, 25,021 / 25,035)', (function () { var tx = $('tol-out').querySelector('.tol-cmp').textContent; return /\+21/.test(tx) && /\+35/.test(tx) && /\+22/.test(tx) && /25,021/.test(tx) && /25,035/.test(tx) && /IT7 = 21/.test(tx) && /IT6 = 13/.test(tx); })());
    $('tol-s-let').value = ''; render(); ck('confronto: senza albero niente tabella', !$('tol-out').querySelector('.tol-cmp')); $('tol-s-let').value = 'p';
    insp.mh = ''; insp.ms = ''; insp.open = false; render();
    ck('collaudo: senza misure solo il suggerimento', /Scrivi le due misure/.test($('tol-insp-det').textContent));
    ck('scheda PDF: tasto presente in ACCOPPIAMENTO', !!$('tol-sheet-btn'));
    /* 26. v4.7: aiuto all'installazione iPhone con i disegni dello schermo */
    (function () {
      var box = document.getElementById('tol-install'), was = box ? box.hidden : true;
      if (!window.tolInstallHint) { ck('install: tolInstallHint presente', false); return; }
      window.tolInstallHint.show('ios-safari');
      ck('install iPhone/Safari: due passi, due disegni (barra di Safari + foglio Condividi), voce evidenziata', box.querySelectorAll('.steps li').length === 2 && box.querySelectorAll('svg.fig').length === 2 && /Aggiungi alla schermata Home/.test(box.querySelector('svg.fig[aria-label="Foglio Condividi"]').textContent) && /Condividi/.test(box.textContent));
      window.tolInstallHint.show('ios-other');
      ck('install iPhone/Chrome: barra dell\'indirizzo con Condividi + foglio, tasto Copia il link', box.querySelectorAll('svg.fig').length === 2 && /utr-tiberti\.github\.io/.test(box.querySelector('svg.fig').textContent) && /Copia il link/.test(box.textContent));
      window.tolInstallHint.close(false); box.hidden = was;
    })();
    /* 25. v4.6: l'autoverifica del nucleo deve passare in TUTTE le lingue (sul telefono gira nella lingua dell'utente) */
    (function () { var keepL = lang; ['en', 'it'].forEach(function (L) { setLang(L); var r = selfTest(); ck('autoverifica del nucleo in «' + L + '»: ' + r.pass + '/' + r.total, r.fail === 0); }); setLang(keepL); })();
    /* 24. v4.5: glossario */
    (function () {
      ck('glossario: scheda chiusa all\'avvio, tabelle e termini generati', !$('tol-acc-gloss').open && $('tol-gloss-body').querySelectorAll('table').length === 2 && $('tol-gloss-body').querySelectorAll('dt').length === GLOSS.terms.it.length && $('tol-gloss-body').querySelectorAll('table tr').length === GLOSS.letters.length + GLOSS.grades.length + 2);
      setTab('hole'); $('tol-d').value = '25'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; rebuildTables(); render();
      ck('glossario: tasto del riepilogo dice «Cos\'è H7?»', $('tol-sum-gloss').textContent === 'Cos\'è H7?');
      $('tol-sum-gloss').click();
      ck('glossario: il tasto apre la scheda con H7 già scritto e spiegato coi numeri di Ø25', $('tol-acc-gloss').open && $('tol-gloss-q').value === 'H7' && /FORO BASE/.test($('tol-gloss-ans').textContent) && /25,021 mm/.test($('tol-gloss-ans').textContent));
      $('tol-gloss-q').value = 'k6'; $('tol-gloss-q').dispatchEvent(new Event('input'));
      ck('glossario: scrivendo k6 la spiegazione cambia (incerto, +15 / +2 a Ø25)', /a cavallo/.test($('tol-gloss-ans').textContent) && /\+15 \/ \+2 µm/.test($('tol-gloss-ans').textContent));
      $('tol-d').value = '60'; render();
      ck('glossario: cambiando il Ø i numeri seguono (k6 Ø60 = +21 / +2)', /\+21 \/ \+2 µm/.test($('tol-gloss-ans').textContent));
      $('tol-gloss-q').value = 'xyz'; $('tol-gloss-q').dispatchEvent(new Event('input'));
      ck('glossario: classe sbagliata → messaggio', /Scrivi una classe|non riconosciuta/.test($('tol-gloss-ans').textContent));
      $('tol-gloss-q').value = ''; $('tol-gloss-q').dispatchEvent(new Event('input')); $('tol-acc-gloss').open = false; $('tol-d').value = '25'; render();
    })();
    /* 23. v4.4: niente zoom da doppio tocco, niente scorrimento orizzontale, avviso zoom spento a scala 1, riga diagnostica */
    ck('v4.4: touch-action manipulation su body e tasti', getComputedStyle(document.body).touchAction === 'manipulation' && getComputedStyle($('tol-sum-copy')).touchAction === 'manipulation');
    ck('v4.4: la pagina non è più larga dello schermo', document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    ck('v4.4: avviso zoom presente e spento a scala 1', !!document.getElementById('tol-zoom') && !document.getElementById('tol-zoom').classList.contains('on'));
    ck('v4.4: riga diagnostica schermo/pagina/scala', /schermo \d+×\d+ · pagina \d+ · scala \d+%/.test(document.getElementById('tol-vp').textContent));
    /* 22. v4.2: le righe «consigliati» e «trova» sono tasti riconoscibili; il tasto guida ha un testo, non solo «?» */
    (function () {
      var sm = $('tol-find-det').querySelector('summary'), cs = getComputedStyle(sm);
      ck('v4.2: «Trova accoppiamento» ha bordo, sfondo e grassetto (sembra un tasto)', cs.borderTopWidth === '1px' && cs.borderTopStyle === 'solid' && parseInt(cs.fontWeight, 10) >= 700 && parseFloat(cs.paddingTop) >= 8);
      ck('v4.2: sottotitolo su riga propria', getComputedStyle($('tol-fits-det').querySelector('summary > span > span')).display === 'block');
      var hb = document.getElementById('tol-help-btn');
      ck('v4.2: tasto guida «? Come si usa» con testo visibile', !!hb && /Come si usa/.test(hb.textContent) && hb.offsetWidth > 60);
    })();
    /* 21. trova accoppiamento (v4.1) */
    (function () {
      var keepF = { type: finder.type, basis: finder.basis, a: finder.a, b: finder.b, all: finder.all, open: $('tol-find-det').open };
      setTab('fit'); $('tol-d').value = '25'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; $('tol-s-let').value = 'g'; $('tol-s-gr').value = '6'; render();
      $('tol-find-det').open = true; finder.type = 'clearance'; finder.basis = 'hole'; finder.a = '5'; finder.b = '45'; finder.all = false; buildFinder();
      var rows = $('tol-find-out').querySelectorAll('.tol-findrow'), exp = findFits(25, { type: 'clearance', min: 5, max: 45, basis: 'hole' });
      ck('trova UI: etichette gioco minimo/massimo, sistema «foro base H»', $('tol-find-l1').textContent === 'gioco minimo' && $('tol-find-l2').textContent === 'gioco massimo' && $('tol-find-basis').options[0].textContent === 'foro base H');
      ck('trova UI: righe = risultati di findFits (' + exp.length + '), stesso ordine, H7/g6 evidenziata e con App. A', rows.length === Math.min(exp.length, FIND_SHOW) && Array.prototype.every.call(rows, function (r, i) { return r.getAttribute('data-fit') === exp[i].hole + '/' + exp[i].shaft; }) && (function () { var r = $('tol-find-out').querySelector('[data-fit="H7/g6"]'); return r && r.classList.contains('on') && /App\. A/.test(r.textContent) && /gioco 7…41 µm/.test(r.textContent); })());
      ck('trova UI: contatore «' + exp.length + ' coppie trovate · Ø25»', $('tol-find-n').textContent === exp.length + ' coppie trovate · Ø25');
      $('tol-find-type').querySelector('[data-ft="interference"]').click(); $('tol-find-a').value = ''; $('tol-find-a').dispatchEvent(new Event('input')); $('tol-find-b').value = '40'; $('tol-find-b').dispatchEvent(new Event('input'));
      ck('trova UI: forzato Imax ≤ 40 → etichette interferenza, c\'è H7/p6 «interferenza 1…35 µm»', $('tol-find-l1').textContent === 'interferenza minima' && (function () { var r = $('tol-find-out').querySelector('[data-fit="H7/p6"]'); return r && /forzato 1…35 µm/.test(r.textContent); })());
      $('tol-find-out').querySelector('[data-fit="H7/p6"]').click();
      ck('trova UI: tocco su H7/p6 → classi impostate e riga evidenziata', $('tol-s-let').value === 'p' && $('tol-s-gr').value === '6' && $('tol-find-out').querySelector('[data-fit="H7/p6"]').classList.contains('on'));
      $('tol-find-type').querySelector('[data-ft="clearance"]').click(); $('tol-find-a').value = '10'; $('tol-find-a').dispatchEvent(new Event('input')); $('tol-find-b').value = '12'; $('tol-find-b').dispatchEvent(new Event('input'));
      ck('trova UI: nessun risultato → messaggio, contatore vuoto', !!$('tol-find-out').querySelector('.none') && $('tol-find-n').textContent === '');
      ck('trova UI: campo 10…12 (2 µm) più stretto della coppia più fine → dice quanto allargare (18 µm, H5/g5 o H5/h5)', /Tra i due limiti ci sono 2 µm, ma a questo Ø la coppia più fine \(H5\/(g5|h5)\) varia già di 18 µm: allarga il campo ad almeno 18 µm\./.test($('tol-find-out').querySelector('.none').textContent));
      $('tol-find-a').value = '5'; $('tol-find-a').dispatchEvent(new Event('input')); $('tol-find-b').value = '15'; $('tol-find-b').dispatchEvent(new Event('input'));
      ck('trova UI: 5…15 a Ø25 foro base (lo screenshot dell\'utente) → stesso avviso con 10 µm', /ci sono 10 µm/.test($('tol-find-out').querySelector('.none').textContent) && /almeno 18 µm/.test($('tol-find-out').querySelector('.none').textContent));
      $('tol-find-a').value = ''; $('tol-find-a').dispatchEvent(new Event('input')); $('tol-find-b').value = ''; $('tol-find-b').dispatchEvent(new Event('input')); $('tol-find-basis').value = 'all'; $('tol-find-basis').dispatchEvent(new Event('change'));
      var all = findFits(25, { type: 'clearance', basis: 'all' });
      ck('trova UI: «tutte le coppie» senza vincoli → prime ' + FIND_SHOW + ' e tasto «Mostra tutte le ' + all.length + '»', all.length > FIND_SHOW && $('tol-find-out').querySelectorAll('.tol-findrow').length === FIND_SHOW && new RegExp('Mostra tutte le ' + all.length).test($('tol-find-out').querySelector('[data-findmore]').textContent));
      $('tol-find-out').querySelector('[data-findmore]').click();
      ck('trova UI: Mostra tutte → tutte le righe', $('tol-find-out').querySelectorAll('.tol-findrow').length === all.length);
      finder.type = keepF.type; finder.basis = keepF.basis; finder.a = keepF.a; finder.b = keepF.b; finder.all = keepF.all; $('tol-find-det').open = keepF.open; $('tol-s-let').value = 'g'; buildFinder(); render();
    })();
    /* 20. rapporto di controllo (v4.0) */
    (function () {
      var keepRep = { pezzo: rep.pezzo, disegno: rep.disegno, operatore: rep.operatore, data: rep.data, note: rep.note };
      $('tol-alert').textContent = ''; $('tol-alert').classList.remove('on');
      /* accoppiamento senza misure di collaudo → avviso, riquadro chiuso */
      ck('rapporto: tasti presenti (ACCOPPIAMENTO e riepilogo)', !!$('tol-rep-btn') && !!$('tol-sum-rep'));
      ck('rapporto: in ACCOPPIAMENTO senza collaudo → avviso e riquadro chiuso', openRep() === false && /misure di foro e albero/.test($('tol-alert').textContent) && $('tol-rep').hidden);
      $('tol-s-let').value = 'g'; insp.mh = '25,010'; insp.ms = '24,985'; insp.open = true; render();
      rep.pezzo = 'Flangia'; rep.disegno = 'DIS-123'; rep.operatore = 'M.G.'; rep.data = '27/09/2026'; rep.note = 'prova';
      ck('rapporto accoppiamento: si apre, foro e albero CONFORMI, gioco effettivo 25 µm', openRep() === true && !$('tol-rep').hidden && (function () { var tx = $('tol-rep-prev').textContent; return /Ø25 H7\/g6 — CON GIOCO/.test(tx) && /Gioco effettivo\s*25 µm/.test(tx) && /ESITO: CONFORME/.test(tx) && (tx.match(/CONFORME/g) || []).length === 3; })());
      ck('rapporto: campi del riquadro riempiti dai dati salvati', $('tol-rep').querySelector('[data-rep="pezzo"]').value === 'Flangia' && $('tol-rep').querySelector('[data-rep="data"]').value === '27/09/2026');
      var txt = reportText(reportData());
      ck('rapporto: testo da condividere con intestazione, dati pezzo, righe ed esito', /^RAPPORTO DI CONTROLLO — UTR Tiberti/.test(txt) && /Pezzo: Flangia · Disegno: DIS-123 · Data: 27\/09\/2026 · Operatore: M\.G\./.test(txt) && /Misura: 25,010 mm/.test(txt) && /Misura: 24,985 mm/.test(txt) && /ESITO: CONFORME/.test(txt) && /Note: prova/.test(txt));
      ck('rapporto: pagina di stampa con titolo, tabelle, esito, firme, nota a piè', (function () { var pb = $('tol-rep-print-box'); return /RAPPORTO DI CONTROLLO/.test(pb.querySelector('h2').textContent) && pb.querySelectorAll('table').length === 2 && pb.querySelector('.esito.ok') && /Firma operatore/.test(pb.textContent) && /ISO 286-1:2010/.test(pb.textContent); })());
      insp.ms = '24,975'; render();
      ck('rapporto accoppiamento: albero fuori → NON CONFORME — Albero, anteprima aggiornata da render()', /ESITO: NON CONFORME — Albero/.test($('tol-rep-prev').textContent) && !!$('tol-rep-prev').querySelector('.esito.ko'));
      /* modifica di un campo dal riquadro → salvata e nel testo */
      var ip = $('tol-rep').querySelector('[data-rep="pezzo"]'); ip.value = 'Boccola'; ip.dispatchEvent(new Event('input', { bubbles: true }));
      ck('rapporto: campo Pezzo modificato → salvato e nel testo', rep.pezzo === 'Boccola' && /Pezzo: Boccola/.test(reportText(reportData())) && /"pezzo":"Boccola"/.test(localStorage.getItem('tolIso.rep') || ''));
      $('tol-rep-close').click(); ck('rapporto: Chiudi nasconde il riquadro', $('tol-rep').hidden && !rep.open);
      /* quota singola: senza misura → avviso; con misura → CONFORME / NON CONFORME */
      insp.mh = ''; insp.ms = ''; insp.open = false;
      setTab('hole'); $('tol-d').value = '25'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; $('tol-m').value = ''; rebuildTables(); render();
      $('tol-alert').textContent = '';
      ck('rapporto FORO senza misura → avviso «Scrivi prima la misura»', openRep() === false && /Scrivi prima la misura/.test($('tol-alert').textContent));
      $('tol-m').value = '25.013'; render();
      ck('rapporto FORO 25,013: CONFORME, +13 µm dal nominale, 62%', openRep() === true && (function () { var tx = $('tol-rep-prev').textContent; return /Ø25 H7 \(Foro\)/.test(tx) && /25,000 \/ 25,021 mm/.test(tx) && /Misura25,013mm/.test(tx.replace(/\s+/g, '')) && /\+13 µm dal nominale · 62% della tolleranza usata · 8 µm dal max · 13 µm dal min/.test(tx) && /ESITO: CONFORME/.test(tx); })());
      $('tol-m').value = '25.030'; render();
      ck('rapporto FORO 25,030: NON CONFORME, 9 µm oltre il massimo', /ESITO: NON CONFORME/.test($('tol-rep-prev').textContent) && /9 µm oltre il massimo/.test($('tol-rep-prev').textContent));
      $('tol-alert').classList.remove('on'); $('tol-alert').textContent = '';
      rep.open = false; rep.pezzo = keepRep.pezzo; rep.disegno = keepRep.disegno; rep.operatore = keepRep.operatore; rep.data = keepRep.data; rep.note = keepRep.note; saveRep(); renderRep();
      $('tol-m').value = ''; setTab('fit'); $('tol-s-let').value = 'p'; render();
    })();
    /* 16. schede a scomparsa: chiuse all'avvio, contenuto presente */
    ck('schede: provenienza e IT chiuse all\'avvio', !$('tol-acc-prov').open && !$('tol-acc-it').open);
    ck('schede: contenuti generati', !!$('tol-prov').querySelector('table') && !!$('tol-ittable').querySelector('tbody'));
    $('tol-acc-prov').open = true; ck('schede: si apre', $('tol-acc-prov').open); $('tol-acc-prov').open = false;
    /* 13. virgola dal tastierino del telefono: «25,5» e «25.5» valgono uguale, nel Ø e nel misurato */
    setTab('hole'); $('tol-d').value = '25,5'; $('tol-h-let').value = 'H'; $('tol-h-gr').value = '7'; $('tol-m').value = '25,51'; rebuildTables(); render();
    ck('virgola: Ø 25,5 accettato (fascia 24…30) e misura 25,51 DENTRO', /> 24 … 30/.test($('tol-band').textContent) && /DENTRO/.test($('tol-sum-txt').textContent) && /Ø25,5 H7/.test($('tol-sum-txt').textContent));
    $('tol-d').value = '25.5'; $('tol-m').value = '25.51'; render();
    ck('punto: stesso risultato', /DENTRO/.test($('tol-sum-txt').textContent) && /Ø25,5 H7/.test($('tol-sum-txt').textContent));
    /* ripristino */
    $('tol-m').value = '';
    $('tol-d').value = keep.D; $('tol-h-let').value = keep.hl; $('tol-h-gr').value = keep.hg; $('tol-s-let').value = keep.sl; $('tol-s-gr').value = keep.sg;
    side = keep.side; viewFi = keep.viewFi; setFilter(keep.filter); setTab(keep.tab); render();
    return { pass: pass, fail: fail, total: pass + fail, failures: failures };
  }

  /* ════════ AUTOTEST — valori di riferimento da tabelle ISO 286-2 e dal regolo Talide (fascia 160…180) ════════ */
  var REF = [
    /* alberi */
    [25, 'h7', 0, -21], [25, 'g6', -7, -20], [10, 'h6', 0, -9], [3, 'h6', 0, -6], [6, 'h6', 0, -8], [12, 'h6', 0, -11], [20, 'h6', 0, -13], [32, 'h6', 0, -16],
    [50, 'p6', 42, 26], [40, 's6', 59, 43], [40, 'u6', 76, 60], [60, 'r6', 60, 41], [20, 'k6', 15, 2], [30, 'm6', 21, 8], [30, 'n6', 28, 15],
    [30, 'f7', -20, -41], [50, 'e8', -50, -89], [100, 'd9', -120, -207], [40, 'a11', -310, -470], [45, 'a11', -320, -480], [100, 'b11', -220, -440],
    [100, 'c11', -170, -390], [110, 'c11', -180, -400], [40, 'x6', 96, 80], [10, 'z6', 51, 42], [28, 't6', 54, 41], [2, 'j8', 8, -6], [25, 'j5', 5, -4], [25, 'j6', 9, -4], [25, 'j7', 13, -8],
    [20, 'js7', 10.5, -10.5], [20, 'k8', 33, 0], [20, 'k3', 4, 0],
    [170, 'e9', -85, -185], [170, 'f6', -43, -68], [170, 'f7', -43, -83], [170, 'f8', -43, -106], [170, 'g5', -14, -32], [170, 'g6', -14, -39], [170, 'g7', -14, -54],
    [170, 'h5', 0, -18], [170, 'h13', 0, -630], [170, 'j5', 7, -11], [170, 'j6', 14, -11], [170, 'j7', 22, -18], [170, 'k5', 21, 3], [170, 'k6', 28, 3], [170, 'k7', 43, 3], [170, 'k8', 63, 0],
    [170, 'm5', 33, 15], [170, 'm6', 40, 15], [170, 'm7', 55, 15], [170, 'n5', 45, 27], [170, 'n6', 52, 27], [170, 'n7', 67, 27],
    [170, 'p5', 61, 43], [170, 'p6', 68, 43], [170, 'p7', 83, 43], [170, 'p8', 106, 43], [170, 'r6', 93, 68], [170, 'r7', 108, 68], [170, 's6', 133, 108], [170, 's7', 148, 108],
    [130, 'r6', 88, 63], [130, 's6', 117, 92], [150, 'r6', 90, 65], [150, 's6', 125, 100],
    /* fori */
    [25, 'H7', 21, 0], [20, 'F7', 41, 20], [20, 'G7', 28, 7], [20, 'E8', 73, 40], [20, 'D10', 149, 65], [20, 'C11', 240, 110], [20, 'H11', 130, 0],
    [20, 'K7', 6, -15], [20, 'M7', 0, -21], [20, 'N7', -7, -28], [20, 'P7', -14, -35], [20, 'R7', -20, -41], [20, 'S7', -27, -48], [20, 'JS7', 10.5, -10.5],
    [20, 'P6', -18, -31], [20, 'P5', -19, -28], [20, 'N5', -12, -21], [20, 'K5', 1, -8], [20, 'M5', -5, -14], [20, 'P8', -22, -55],
    [40, 'U7', -51, -76], [20, 'X7', -46, -67], [280, 'M6', -9, -41], [280, 'M7', 0, -52], [8, 'EF8', 40, 18], [480, 'H7', 63, 0],
    [2, 'K7', 0, -10], [2, 'N7', -4, -14], [2, 'P7', -6, -16], [2, 'N9', -4, -29], [5, 'K7', 3, -9], [5, 'M7', 0, -12], [5, 'N7', -4, -16], [5, 'P7', -8, -20],
    [5, 'N9', 0, -30], [5, 'N8', -2, -20], [5, 'M8', 2, -16], [5, 'K8', 5, -13], [5, 'P6', -9, -17],
    [170, 'H7', 40, 0], [170, 'G7', 54, 14], [170, 'G6', 39, 14], [170, 'E7', 125, 85], [170, 'E8', 148, 85], [170, 'E9', 185, 85], [170, 'D11', 395, 145], [170, 'C9', 330, 230],
    [170, 'JS5', 9, -9], [170, 'JS6', 12.5, -12.5], [170, 'JS7', 20, -20], [170, 'JS9', 50, -50], [170, 'J6', 18, -7], [170, 'J7', 26, -14], [170, 'J8', 41, -22],
    [170, 'K6', 4, -21], [170, 'K7', 12, -28], [170, 'K8', 20, -43], [170, 'M6', -8, -33], [170, 'M7', 0, -40], [170, 'N6', -20, -45], [170, 'N7', -12, -52], [170, 'N8', -4, -67], [170, 'N9', 0, -100],
    [170, 'P6', -36, -61], [170, 'P7', -28, -68], [170, 'P8', -43, -106], [170, 'P9', -43, -143], [170, 'R7', -53, -93], [170, 'S7', -93, -133], [170, 'S8', -108, -171]
  ];
  function selfTest() {
    var pass = 0, fail = 0, failures = [];
    function ck(name, cond) { if (cond) pass++; else { fail++; failures.push(name); } }
    /* 1. valori di riferimento */
    REF.forEach(function (r) {
      var c = parseClass(r[1]), o = limits(c.kind, c.letter, c.grade, r[0]);
      ck(r[0] + ' ' + r[1] + ' atteso ' + r[2] + '/' + r[3] + ' ottenuto ' + (o.ok ? o.up + '/' + o.lo : o.err), o.ok && o.up === r[2] && o.lo === r[3]);
    });
    /* 1a. SCOSTAMENTO FONDAMENTALE: quello determinato dalla lettera, cioè il più vicino alla linea dello zero.
       a…h → es · j…zc → ei · A…H → EI · J…ZC → ES · js/JS simmetriche (±IT/2, nessun fondamentale unico). */
    [['shaft', 'h6', 30, 0, 'es'], ['shaft', 'g6', 30, -7, 'es'], ['shaft', 'k6', 30, 2, 'ei'], ['shaft', 'p6', 30, 22, 'ei'],
     ['shaft', 'j6', 30, -4, 'ei'], ['hole', 'H7', 30, 0, 'EI'], ['hole', 'F8', 30, 20, 'EI'], ['hole', 'K7', 30, 6, 'ES'],
     ['hole', 'P7', 30, -14, 'ES'], ['hole', 'J7', 30, 12, 'ES']].forEach(function (r) {
      var c = parseClass(r[1]), o = limits(r[0], c.letter, c.grade, r[2]);
      ck('fd ' + r[1] + ' Ø' + r[2] + ': atteso ' + r[3] + ' (' + r[4] + ')', o.ok && o.fd === r[3] && o.fdTipo === r[4] && o.fdSimmetrico === false);
      ck('fd ' + r[1] + ': il fondamentale è uno dei due scostamenti', o.fd === o.up || o.fd === o.lo);
    });
    [['shaft', 'js6', 'js'], ['hole', 'JS7', 'JS']].forEach(function (r) {
      var c = parseClass(r[1]), o = limits(r[0], c.letter, c.grade, 30);
      ck('fd ' + r[1] + ': simmetrica, dichiarata come tale', o.ok && o.fdSimmetrico === true && o.fdTipo === r[2] && o.fd === o.up && o.up === -o.lo);
    });
    /* «Il fondamentale è il più vicino alla linea dello zero» è la descrizione corrente, ma NON è un teorema:
       j e J sono tabulate e stanno a cavallo dello zero, e lì il fondamentale può essere il più lontano
       (es. J7 Ø50: ES = +14, EI = −11, fondamentale ES). Il controllo vale su tutte le altre lettere, e su j/J
       si controlla invece che il fondamentale sia quello giusto per il verso della lettera. */
    ck('fd: fuori da j/J il fondamentale è il più vicino allo zero', (function () {
      var ls = 'a b c cd d e ef f fg g h k m n p r s t u v x y z za zb zc'.split(' '), ok = true;
      ls.forEach(function (L) {
        [['shaft', L], ['hole', L.toUpperCase()]].forEach(function (q) {
          var o = limits(q[0], q[1], 7, 50);
          if (!o.ok || o.fdSimmetrico) return;
          var vicino = Math.abs(o.up) <= Math.abs(o.lo) ? o.up : o.lo;
          if (o.fd !== vicino) ok = false;
        });
      });
      return ok;
    })());
    ck('fd: j e J stanno a cavallo dello zero e il fondamentale resta quello della lettera (j → ei, J → ES)', (function () {
      var a = limits('shaft', 'j', 7, 50), b = limits('hole', 'J', 7, 50);
      return a.ok && b.ok && a.up > 0 && a.lo < 0 && a.fd === a.lo && a.fdTipo === 'ei' &&
             b.up > 0 && b.lo < 0 && b.fd === b.up && b.fdTipo === 'ES';
    })());
    /* 1b. PROVENIENZA: ogni tabella dichiara norma, edizione, tabella, unità, algoritmo e test; i test dichiarati devono esistere */
    var PV = provenienza();
    ck('provenienza: ISO 286-1 e ISO 286-2 con edizione 2010 e fonte', PV.norme.ISO_286_1.edizione === '2010' && PV.norme.ISO_286_2.edizione === '2010' && /iso.org/.test(PV.norme.ISO_286_1.fonte) && /iso.org/.test(PV.norme.ISO_286_2.fonte));
    ck('provenienza: il Corrigendum 1:2013 è dichiarato come non confrontato', /Corrigendum 1:2013, NON confrontato/.test(PV.norme.ISO_286_2.stato));
    Object.keys(PV.tabelle).forEach(function (k) {
      var d = PV.tabelle[k];
      ck('provenienza ' + k + ': norma, tabella, unità, stato, algoritmo, test', !!PV.norme[d.norma] && d.tabella.length > 20 && d.unita.length > 1 && ['verificato-esterno', 'derivato', 'da-verificare'].indexOf(d.stato) >= 0 && d.algoritmo.length > 40 && d.test.length > 0);
    });
    ck('provenienza: i fori sono dichiarati DERIVATI, non trascritti', PV.tabelle.FORI.stato === 'derivato' && /\u0394/.test(PV.tabelle.FORI.algoritmo));
    ck('provenienza: nessuna tabella resta «da verificare» in questo modulo', Object.keys(PV.tabelle).every(function (k) { return PV.tabelle[k].stato !== 'da-verificare'; }));
    ck('provenienza: una tabella inesistente → null', provenienza('PIPPO') === null);

    /* 2. integrità tabelle */
    ck('IT righe', IT.length === 13 && IT.every(function (r) { return r.length === 20; }));
    Object.keys(FD_MAIN).forEach(function (k) { ck('FD_MAIN.' + k + ' len', FD_MAIN[k].length === 13); });
    Object.keys(FD_FINE).forEach(function (k) { ck('FD_FINE.' + k + ' len', FD_FINE[k].length === 25); });
    ck('F2M len', F2M.length === 25 && R_FINE.length === 25);
    for (var m = 0; m < 13; m++) for (var g = 1; g < 20; g++) ck('IT crescente per grado m' + m + ' g' + g, IT[m][g] > IT[m][g - 1]);
    for (var g2 = 0; g2 < 20; g2++) for (var m2 = 1; m2 < 13; m2++) ck('IT non decrescente per fascia', IT[m2][g2] >= IT[m2 - 1][g2]);
    /* 3. monotonia degli scostamenti lungo le fasce e ordine delle lettere a parità di fascia */
    LETTERS.forEach(function (L) {
      if (L === 'js' || L === 'j' || L === 'h') return;
      var prev = null;
      for (var fi = 0; fi < 25; fi++) { var v = shaftFD(L, fi); if (v === null) continue; if (prev !== null) ck('monotonia ' + L + ' @' + R_FINE[fi], Math.abs(v) >= Math.abs(prev)); prev = v; }
    });
    var ORD = ['a', 'b', 'c', 'cd', 'd', 'e', 'ef', 'f', 'fg', 'g', 'h', 'k', 'm', 'n', 'p', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z', 'za', 'zb', 'zc'];
    for (var fi2 = 0; fi2 < 25; fi2++) { var pv = null, pl = ''; ORD.forEach(function (L) { var v = shaftFD(L, fi2); if (v === null) return; if (pv !== null) ck('ordine ' + pl + '<' + L + ' @' + R_FINE[fi2], v >= pv); pv = v; pl = L; }); }
    /* 4. confini di fascia (limite superiore incluso) */
    ck('D=18 → IT7 18', limits('hole', 'H', 7, 18).up === 18);
    ck('D=18.001 → IT7 21', limits('hole', 'H', 7, 18.001).up === 21);
    ck('D=3 → IT7 10', limits('hole', 'H', 7, 3).up === 10);
    ck('D=500 ok', limits('hole', 'H', 7, 500).up === 63);
    ck('D=500.1 errore', limits('hole', 'H', 7, 500.1).ok === false);
    ck('D=0 errore', limits('hole', 'H', 7, 0).ok === false);
    /* 5. classi non previste */
    ck('t6 Ø20 non prevista', limits('shaft', 't', 6, 20).err === 'size');
    ck('v6 Ø12 non prevista', limits('shaft', 'v', 6, 12).err === 'size');
    ck('y6 Ø16 non prevista', limits('shaft', 'y', 6, 16).err === 'size');
    /* cd, ef, fg: ISO 286-1:2010 Tab. 4 le tabula fino a 50 mm (era ≤ 10 nell'edizione 1988); ef 18…30 = −28 per Cor.1:2013 */
    ck('ef7 Ø25 = −28/−49 (Cor.1:2013)', (function () { var o = limits('shaft', 'ef', 7, 25); return o.ok && o.up === -28 && o.lo === -49; })());
    ck('EF8 Ø20 = +61/+28 (foro derivato)', (function () { var o = limits('hole', 'EF', 8, 20); return o.ok && o.up === 61 && o.lo === 28; })());
    ck('cd9 Ø40 = −100/−162', (function () { var o = limits('shaft', 'cd', 9, 40); return o.ok && o.up === -100 && o.lo === -162; })());
    ck('fg6 Ø15 = −10/−21', (function () { var o = limits('shaft', 'fg', 6, 15); return o.ok && o.up === -10 && o.lo === -21; })());
    ck('cd10 Ø5 = −46/−94', (function () { var o = limits('shaft', 'cd', 10, 5); return o.ok && o.up === -46 && o.lo === -94; })());
    ck('ef7 Ø60 non prevista (Tab. 4 vuota oltre 50 mm)', limits('shaft', 'ef', 7, 60).err === 'size');
    ck('cd9 Ø80 non prevista', limits('shaft', 'cd', 9, 80).err === 'size');
    ck('FG7 Ø100 non prevista', limits('hole', 'FG', 7, 100).err === 'size');
    ck('cd/ef/fg: media geometrica dei vicini (c·d, e·f, f·g) arrotondata, in tutte le fasce fino a 50 mm', (function () {
      var ok = true; [[ 'c', 'cd', 'd' ], [ 'e', 'ef', 'f' ], [ 'f', 'fg', 'g' ]].forEach(function (tr) {
        for (var m = 0; m < 6; m++) { var a = FD_MAIN[tr[0]] ? FD_MAIN[tr[0]][m] : null, b = FD_MAIN[tr[2]][m], v = FD_MAIN[tr[1]][m];
          if (a === null) { var sum = 0, n = 0; for (var fi = 0; fi < 25; fi++) if (F2M[fi] === m) { sum += shaftFD(tr[0], fi); n++; } a = sum / n; }   /* c è a fasce fini: media della fascia principale */
          if (Math.abs(Math.round(-Math.sqrt(a * b)) - v) > 1) ok = false; }
      }); return ok; })());
    ['cd', 'ef', 'fg'].forEach(function (L) { [2, 8, 15, 25, 45].forEach(function (D) { var S = limits('shaft', L, 8, D), H = limits('hole', L, 8, D); ck('simmetria ' + L + ' Ø' + D, S.ok && H.ok && H.lo === -S.up && H.up === -S.lo); }); });
    ck('provenienza: ISO 286-1 dichiara il Cor.1:2013 letto e applicato', /Cor.*1:2013 LETTO/.test(PV.norme.ISO_286_1.stato));
    ck('j9 errore', limits('shaft', 'j', 9, 20).err === 'jgrade');
    ck('j8 Ø20 errore', limits('shaft', 'j', 8, 20).err === 'jgrade');
    ck('K9 Ø20 errore', limits('hole', 'K', 9, 20).err === 'kgrade');
    ck('g2 errore', limits('shaft', 'g', 2, 20).err === 'gradelow');
    ck('h1 ok', limits('shaft', 'h', 1, 20).lo === -1.5);
    ck('H14 Ø0.8 errore', limits('hole', 'H', 14, 0.8).err === 'it14');
    /* 6. simmetria: per A…H vale EI = −es a parità di grado */
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].forEach(function (L) {
      [2, 8, 25, 70, 170, 300, 450].forEach(function (D) { var S = limits('shaft', L, 8, D), H = limits('hole', L, 8, D); ck('simmetria ' + L + ' Ø' + D, S.ok && H.ok && H.lo === -S.up && H.up === -S.lo); });
    });
    /* 7. accoppiamenti */
    var f1 = fit(25, 'H7', 'g6'); ck('H7/g6 Ø25 gioco 7…41', f1.type === 'clearance' && f1.clrMin === 7 && f1.clrMax === 41);
    var f2 = fit(50, 'H7', 'p6'); ck('H7/p6 Ø50 interferenza 1…42', f2.type === 'interference' && f2.intMin === 1 && f2.intMax === 42);
    var f3 = fit(20, 'H7', 'k6'); ck('H7/k6 Ø20 incerto G19 I15', f3.type === 'transition' && f3.clrMax === 19 && f3.intMax === 15);
    var f4 = fit(25, 'H7', 'h6'); ck('H7/h6 Ø25 gioco 0…34', f4.type === 'clearance' && f4.clrMin === 0 && f4.clrMax === 34);
    /* 8. parser */
    var p1 = parse('25 H7/g6'); ck('parse 25 H7/g6', p1 && p1.D === 25 && p1.hole.letter === 'H' && p1.shaft.grade === 6);
    var p2 = parse('Ø12,5 js6'); ck('parse Ø12,5 js6', p2 && p2.D === 12.5 && !p2.hole && p2.shaft.letter === 'js');
    var p3 = parse('40g6/H7'); ck('parse 40g6/H7 (ordine inverso)', p3 && p3.hole.grade === 7 && p3.shaft.letter === 'g');
    ck('parse H7/H7 rifiutato', parse('25 H7/H6') === null);
    ck('parse Hs7 rifiutato', parse('25 Hs7') === null);
    ck('parse vuoto', parse('') === null);
    var d1 = dim('25 k6'); ck('dim 25 k6', d1.ok && d1.text === '\u00D825 k6' && d1.upMm === '+0.015' && d1.loMm === '+0.002' && Math.abs(d1.mean - 25.0085) < 1e-9);
    var d2 = dim(30, 'h6'); ck('dim 30 h6', d2.ok && d2.upMm === '0' && d2.loMm === '-0.013' && Math.abs(d2.min - 29.987) < 1e-9);
    var d3 = dim(20, 'js7'); ck('dim 20 js7 (mezzo micron)', d3.ok && d3.upMm === '+0.0105' && d3.loMm === '-0.0105');
    /* nucleo di formattazione (usato anche dagli altri progetti: cambiarlo cambia le quote dei loro disegni) */
    var pD = parts(limits('shaft', 'h', 11, 80), { sep: ',', trim: true, minus: '\u2212' });
    ck('parts: stile disegno (virgola, zeri tagliati, meno tipografico) 80 h11', pD.up === '0' && pD.lo === '\u22120,19' && pD.max === '80,0' && pD.min === '79,81', JSON.stringify(pD));
    var pK = parts(limits('shaft', 'k', 6, 25), { sep: ',', trim: true, minus: '\u2212' });
    ck('parts: 25 k6 stile disegno', pK.up === '+0,015' && pK.lo === '+0,002' && pK.cls === '\u00D825 k6' && pK.max === '25,015' && pK.min === '25,002', JSON.stringify(pK));
    var pJ = parts(limits('hole', 'JS', 7, 20), { sep: ',', trim: true, minus: '\u2212' });
    ck('parts: JS7 simmetrica e mezzo micron', pJ.dec === 4 && pJ.dev === '\u00B10,0105' && pJ.up === '+0,0105', JSON.stringify(pJ));
    ck('parts: senza opzioni = punto, zeri non tagliati, meno normale', (function () { var q = parts(limits('shaft', 'h', 11, 80), {}); return q.lo === '-0.190' && q.max === '80.000'; })());
    ck('parts: dec forzato', parts(limits('shaft', 'k', 6, 25), { sep: ',', dec: 4 }).up === '+0,0150');
    ck('devStr: +0,042 · \u22120,19 · 0 · mezzo micron', devStr(42, { sep: ',', trim: true, minus: '\u2212' }) === '+0,042' && devStr(-190, { sep: ',', trim: true, minus: '\u2212' }) === '\u22120,19' && devStr(0, {}) === '0' && devStr(10.5, { sep: ',' }) === '+0,0105');
    ck('devStr: senza taglio', devStr(-190, { sep: ',' }) === '-0,190');
    var fm = formats(limits('shaft', 'k', 6, 25), ','); ck('formati k6', fm.cls === 'Ø25 k6' && fm.dev === 'Ø25 +0,015/+0,002' && fm.both === 'Ø25 k6 (+0,015/+0,002)' && fm.lim === '25,015 / 25,002');
    var fm2 = formats(limits('hole', 'JS', 7, 20), '.'); ck('formati JS7 simmetrica', fm2.dev === 'Ø20 ±0.0105' && fm2.lim === '20.0105 / 19.9895');
    var fm3 = formats(limits('hole', 'H', 7, 12.5), ','); ck('formati H7 Ø12,5', fm3.dev === 'Ø12,5 +0,018/0' && fm3.lim === '12,518 / 12,500');
    ck('dim accoppiamento rifiutato', dim('25 H7/g6').ok === false);
    /* 9. geometria del diagramma: altezza zona = IT × px/µm, zero sulla linea dello zero */
    [[25, 'H', 7, 'g', 6], [170, 'P', 7, 's', 6], [3, 'H', 5, 'h', 4]].forEach(function (q) {
      var H = limits('hole', q[1], q[2], q[0]), S = limits('shaft', q[3], q[4], q[0]), g = diagramGeom([H, S]);
      ck('diagramma scala H Ø' + q[0], Math.abs((g.y(H.lo) - g.y(H.up)) - H.it * g.pxPerUm) < 1e-9);
      ck('diagramma scala S Ø' + q[0], Math.abs((g.y(S.lo) - g.y(S.up)) - S.it * g.pxPerUm) < 1e-9);
      ck('diagramma zone dentro gli assi Ø' + q[0], g.amin <= Math.min(H.lo, S.lo, 0) && g.amax >= Math.max(H.up, S.up, 0));
      ck('diagramma tacche intere Ø' + q[0], Math.abs((g.amax - g.amin) / g.step - Math.round((g.amax - g.amin) / g.step)) < 1e-9 && Math.abs(g.amin / g.step - Math.round(g.amin / g.step)) < 1e-9);
    });
    /* 9b. FORZATO: riferimenti esterni (TolerangeLab, screenshot App Store 26/09/2026) — Ø25 H7/u6, mozzo De 50 pieno, L 25, acciaio E 205000 ν 0,29 */
    (function () {
      var q = { De: 50, di: 0, L: 25, mu: 0.10, Eh: 205000, nuh: 0.29, Es: 205000, nus: 0.29 }, fu = fit(25, 'H7', 'u6');
      ck('forzato: H7/u6 Ø25 interferenza 27…61 µm', fu.type === 'interference' && fu.intMin === 27 && fu.intMax === 61);
      var a = pressCalc(25, 27, q), b = pressCalc(25, 61, { De: 50, di: 0, L: 25, mu: 0.20, Eh: 205000, nuh: 0.29, Es: 205000, nus: 0.29 });
      ck('forzato: pressione 83,02 / 187,57 MPa', Math.abs(a.p - 83.02) < 0.05 && Math.abs(b.p - 187.57) < 0.05);
      ck('forzato: forza assiale 16,3 / 73,66 kN', Math.abs(a.F / 1000 - 16.3) < 0.05 && Math.abs(b.F / 1000 - 73.66) < 0.05);
      ck('forzato: sollecitazione mozzo 138,37 / 312,62 MPa', Math.abs(a.sig - 138.37) < 0.05 && Math.abs(b.sig - 312.62) < 0.05);
      ck('forzato: albero cavo riduce la pressione, mozzo più grosso la aumenta', pressCalc(25, 27, { De: 50, di: 15, L: 25, mu: 0.1, Eh: 205000, nuh: 0.29, Es: 205000, nus: 0.29 }).p < a.p && pressCalc(25, 27, { De: 100, di: 0, L: 25, mu: 0.1, Eh: 205000, nuh: 0.29, Es: 205000, nus: 0.29 }).p > a.p);
      ck('forzato: dati impossibili → null', pressCalc(25, 27, { De: 20, di: 0, L: 25, mu: 0.1, Eh: 205000, nuh: 0.29, Es: 205000, nus: 0.29 }) === null && pressCalc(25, 27, { De: 50, di: 30, L: 25, mu: 0.1, Eh: 205000, nuh: 0.29, Es: 205000, nus: 0.29 }) === null);
    })();
    /* 9c. disegno fotografico: le strisce della foto seguono le quote calcolate */
    (function () {
      var H = limits('hole', 'H', 7, 25), S = limits('shaft', 'g', 6, 25), g = photoLayout(H, S, 25);
      ck('foto: bordo del blocco sulla linea del foro massimo', Math.abs((PH.A[1] + g.dyA) - g.yHmax) < 1e-9 && Math.abs((PH.C[0] + g.dyC) - (2 * PH.CY - g.yHmax)) < 1e-9);
      ck('foto: albero alto quanto il diametro minimo', Math.abs(g.shaftScale * PH.DPX - 2 * (PH.CY - g.ySmin)) < 1e-9);
      ck('foto: zona foro alta IT7·s/2', Math.abs((g.yHmin - g.yHmax) - H.it * g.s / 2) < 1e-9);
      ck('foto: scostamento più grande = 72 px', Math.abs(Math.max(Math.abs(H.up), Math.abs(H.lo), Math.abs(S.up), Math.abs(S.lo)) * g.s - PH.MAXPX) < 1e-9);
      var P = limits('shaft', 'p', 6, 25), gp = photoLayout(H, P, 25);
      ck('foto: H7/p6 albero max sopra foro min → interferenza', gp.ySmax < gp.yHmin && g.ySmax > g.yHmin);
      ck('foto: senza albero, albero a scala 1', Math.abs(photoLayout(H, null, 25).shaftScale - 1) < 1e-9);
    })();
    /* 9d. controllo misura (v3.9): scarti dai limiti, scostamento dal nominale, posizione nel campo di tolleranza */
    (function () {
      var H = limits('hole', 'H', 7, 25), S = limits('shaft', 'g', 6, 25), c;
      c = checkMeasure(H, 25.010); ck('misura 25,010 su H7: dentro, 11 dal max, 10 dal min, +10 dal nominale, 48%', c.ok && c.toMax === 11 && c.toMin === 10 && c.dev === 10 && c.pct === 48 && Math.abs(c.pos - 1000 / 21) < 1e-9);
      c = checkMeasure(H, 25.000); ck('misura 25,000 su H7: dentro al minimo, 0%', c.ok && c.pct === 0 && c.dev === 0);
      c = checkMeasure(H, 25.021); ck('misura 25,021 su H7: dentro al massimo, 100%', c.ok && c.pct === 100 && c.dev === 21);
      c = checkMeasure(H, 25.030); ck('misura 25,030 su H7: fuori, 9 oltre, 143%', !c.ok && c.toMax === -9 && c.pct === 143);
      c = checkMeasure(S, 24.985); ck('misura 24,985 su g6: dentro, −15 dal nominale, 38%', c.ok && c.dev === -15 && c.pct === 38);
      c = checkMeasure(S, 24.975); ck('misura 24,975 su g6: fuori sotto, −38%', !c.ok && c.toMin === -5 && c.pct === -38);
    })();
    /* 9f. glossario (v4.5): ogni lettera della norma ha una voce; explain() dà testo e numeri giusti */
    (function () {
      ck('glossario: tutte le ' + LETTERS.length + ' lettere di posizione hanno una voce', LETTERS.every(function (L) { return !!glossLetter(L); }) && GLOSS.letters.length === LETTERS.length);
      ck('glossario: i gradi IT1…IT18 sono tutti coperti, senza buchi', (function () { for (var g = 1; g <= 18; g++) if (!glossGrade(g)) return false; return true; })());
      ck('glossario: stesso numero di termini IT/EN', GLOSS.terms.it.length === GLOSS.terms.en.length && GLOSS.terms.it.length >= 12);
      var e1 = explain('H7', 25, 'it');
      ck('explain H7: «scostamento inferiore zero», mai la frase dell\'albero', /Scostamento inferiore zero/.test(e1.text) && !/ALBERO BASE/.test(e1.text) && /il sistema più usato/.test(e1.text));
      ck('explain h6: «scostamento superiore zero», albero base', /Scostamento superiore zero/.test(explain('h6', 25, 'it').text) && /ALBERO BASE/.test(explain('h6', 25, 'it').text));
      ck('explain H7 Ø25: foro base, grado IT7, +21 / 0 µm, 25,000 a 25,021', e1.ok && /FORO BASE/.test(e1.text) && /grado IT7/.test(e1.text) && /\+21 \/ 0 µm/.test(e1.text) && /25,000/.test(e1.text) && /25,021 mm/.test(e1.text) && /tolleranza 21 µm/.test(e1.text));
      var e2 = explain('g6', 25, 'it');
      ck('explain g6 Ø25: albero, gioco piccolo, sotto il nominale, −7 / −20', e2.ok && /albero/.test(e2.text) && /Gioco piccolo/.test(e2.text) && /SOTTO il nominale/.test(e2.text) && /−7 \/ −20 µm/.test(e2.text) && /24,980/.test(e2.text));
      var e3 = explain('P7', 25, 'en');
      ck('explain P7 Ø25 (en): hole, interference, below nominal', e3.ok && /hole/.test(e3.text) && /BELOW the nominal/.test(e3.text) && /interference/.test(e3.text) && /grade IT7/.test(e3.text));
      ck('explain k6: incerto, a cavallo del nominale', /a cavallo del nominale/.test(explain('k6', 30, 'it').text) && /incerto/.test(explain('k6', 30, 'it').text));
      ck('explain js7: simmetrica', /Simmetrica/.test(explain('js7', 30, 'it').text));
      ck('explain senza Ø: solo lettera e grado, nessun numero', (function () { var r = explain('H7', null, 'it'); return r.ok && !/A Ø/.test(r.text) && /FORO BASE/.test(r.text); })());
      ck('explain classe sbagliata → errore leggibile', !explain('Q7', 25, 'it').ok && /Scrivi una classe/.test(explain('', 25, 'it').err));
      ck('explain classe non prevista a quel Ø → avviso della norma', /non è prevista|solo per|non si applica/.test(explain('a9', 0.5, 'it').text));
    })();
    /* 9e. ricerca inversa (v4.1): ogni risultato rispetta tipo, vincoli e sistema; ordine per somma IT; App. A segnalata */
    (function () {
      function has(res, h, s2) { return res.some(function (r) { return r.hole === h && r.shaft === s2; }); }
      function sorted(res) { for (var i = 1; i < res.length; i++) if (res[i].itSum < res[i - 1].itSum) return false; return true; }
      var a = findFits(25, { type: 'clearance', min: 5, max: 45, basis: 'hole' });
      ck('trova gioco 5…45 Ø25 foro base: tutti H, con gioco, Gmin ≥ 5, Gmax ≤ 45', a.length > 0 && a.every(function (r) { return /^H\d/.test(r.hole) && r.type === 'clearance' && r.clrMin >= 5 && r.clrMax <= 45; }));
      ck('trova gioco 5…45: c\'è H7/g6 (7…41, App. A), non c\'è H8/f7 (20…74)', has(a, 'H7', 'g6') && a.filter(function (r) { return r.hole === 'H7' && r.shaft === 'g6'; })[0].pref === true && !has(a, 'H8', 'f7'));
      ck('trova: ordine per somma IT crescente', sorted(a) && sorted(findFits(60, { type: 'interference', basis: 'all' })));
      var b = findFits(25, { type: 'interference', max: 40, basis: 'hole' }), p6 = b.filter(function (r) { return r.hole === 'H7' && r.shaft === 'p6'; })[0];
      ck('trova forzato Imax ≤ 40 Ø25: c\'è H7/p6 con 1…35 µm, tutti con Imax ≤ 40', !!p6 && p6.intMin === 1 && p6.intMax === 35 && b.every(function (r) { return r.type === 'interference' && r.intMax <= 40; }));
      var c = findFits(25, { type: 'transition', basis: 'shaft' });
      ck('trova incerto albero base: tutti alberi h, c\'è K7/h6', c.length > 0 && c.every(function (r) { return /^h\d/.test(r.shaft) && r.type === 'transition'; }) && has(c, 'K7', 'h6'));
      var d = findFits(25, { type: 'transition', min: 10, max: 20, basis: 'shaft' });
      ck('trova incerto Imax ≤ 10, Gmax ≤ 20: vincoli rispettati', d.every(function (r) { return r.intMax <= 10 && r.clrMax <= 20; }));
      ck('trova: «tutte le coppie» ⊇ «foro base»', findFits(25, { type: 'clearance', basis: 'all' }).length >= findFits(25, { type: 'clearance', basis: 'hole' }).length);
      ck('trova: vincolo non numerico = nessun vincolo, virgola accettata', findFits(25, { type: 'clearance', min: 'abc' }).length === findFits(25, { type: 'clearance' }).length && findFits(25, { type: 'clearance', min: '7,0', max: '41,0' }).length === findFits(25, { type: 'clearance', min: 7, max: 41 }).length);
      ck('trova: coppie coerenti con fit()', a.every(function (r) { var f = fit(25, r.hole, r.shaft); return f.ok && f.type === r.type && f.clrMin === r.clrMin && f.clrMax === r.clrMax; }));
      ck('trova: vincoli impossibili → lista vuota', findFits(25, { type: 'clearance', min: 10, max: 12, basis: 'hole' }).length === 0);
    })();
    /* 10. tutte le colonne del regolo calcolabili in almeno una fascia */
    ['hole', 'shaft'].forEach(function (k) { COLS[k].forEach(function (c) { var pc = parseClass(c); ck('colonna ' + c, pc && pc.kind === k && limits(k, pc.letter, pc.grade, 5).ok); }); });
    return { pass: pass, fail: fail, total: pass + fail, failures: failures };
  }

  var API = { limits: limits, fit: fit, dim: dim, formats: formats, parts: parts, devStr: devStr, provenienza: provenienza, NORME: NORME, parse: parse, parseClass: parseClass, mount: mount, setLang: setLang, selfTest: selfTest, uiTest: uiTest, getUI: getUI, printLabel: printLabel, showAlert: showAlert, _fitDrawGeom: fitDrawGeom, _photoLayout: photoLayout, _fav: function () { return { list: fav, add: addFav, del: delFav }; }, _insp: insp, _pressCalc: pressCalc, _pressPreset: pressPreset,
           _diagramGeom: diagramGeom, measure: checkMeasure, openReport: openRep, reportData: reportData, findFits: findFits, explain: explain, GLOSS: GLOSS, repPrint: false, version: '4.7' };
  return API;
})();
/* TOL-ISO:JS END */
if (typeof module !== 'undefined' && module.exports) module.exports = TolISO;
