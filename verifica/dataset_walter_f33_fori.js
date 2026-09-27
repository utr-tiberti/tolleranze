/* Dataset di verifica ESTERNO per TolISO — valori trascritti dalla fonte, MAI calcolati dal modulo.
   Formato: fasce = [oltre, fino a] mm · classi = {classe: [[scarto sup, scarto inf] per fascia]} in µm · null = casella assente/illeggibile */
var TOL_DATASETS = (typeof TOL_DATASETS !== 'undefined') ? TOL_DATASETS : [];
TOL_DATASETS.push({
 "id": "walter-f33-fori",
 "tipo": "hole",
 "fonte": "Walter Technical Compendium 2025 (EN), pag. F33 «ISO tolerances» — estrazione automatica dal PDF (pymupdf), nessuna trascrizione manuale",
 "note": "Prima riga stampata «> 3» = fino a 3 mm. H12 in mm sul catalogo, convertito in µm.",
 "fasce": [
  [0,3], [3,6], [6,10], [10,18], [18,30], [30,50], [50,80], [80,120], [120,180], [180,250]
 ],
 "classi": {
  "H6": [
   [6,0], [8,0], [9,0], [11,0], [13,0], [16,0], [19,0], [22,0], [25,0], [29,0]
  ],
  "H7": [
   [10,0], [12,0], [15,0], [18,0], [21,0], [25,0], [30,0], [35,0], [40,0], [46,0]
  ],
  "H11": [
   [60,0], [75,0], [90,0], [110,0], [130,0], [160,0], [190,0], [220,0], [250,0], [290,0]
  ],
  "H12": [
   [100,0], [120,0], [150,0], [180,0], [210,0], [250,0], [300,0], [350,0], [400,0], [460,0]
  ]
 }
});
