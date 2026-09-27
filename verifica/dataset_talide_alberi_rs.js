/* Dataset di verifica ESTERNO per TolISO — valori trascritti dalla fonte, MAI calcolati dal modulo.
   Formato: fasce = [oltre, fino a] mm · classi = {classe: [[scarto sup, scarto inf] per fascia]} in µm · null = casella assente/illeggibile */
var TOL_DATASETS = (typeof TOL_DATASETS !== 'undefined') ? TOL_DATASETS : [];
TOL_DATASETS.push({
 "id": "talide-alberi-rs",
 "fonte": "Regolo in cartoncino «Tolleranze ISO» Talide Utensili (adesivo UTR Tiberti 1952), trascritto il 19/09/2026 dalle foto dell'utente ingrandite 3× — lato ALBERO BASE, colonne r/s a fasce intermedie",
 "tipo": "shaft",
 "fasce": [
  [0,3], [3,6], [6,10], [10,18], [18,30], [30,50], [50,65], [65,80], [80,100], [100,120], [120,140], [140,160], [160,180]
 ],
 "classi": {
  "r6": [
   [16,10], [23,15], [28,19], [34,23], [41,28], [50,34], [60,41], [62,43], [73,51], [76,54], [88,63], [90,65], [93,68]
  ],
  "r7": [
   [20,10], [27,15], [34,19], [41,23], [49,28], [59,34], [71,41], [73,43], [86,51], [89,54], [103,63], [105,65], [108,68]
  ],
  "s6": [
   [20,14], [27,19], [32,23], [39,28], [48,35], [59,43], [72,53], [78,59], [93,71], [101,79], [117,92], [125,100], [133,108]
  ],
  "s7": [
   [24,14], [31,19], [38,23], [46,28], [56,35], [68,43], [83,53], [89,59], [106,71], [114,79], [132,92], [140,100], [148,108]
  ]
 }
});
