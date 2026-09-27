/* Dataset di verifica ESTERNO per TolISO — valori trascritti dalla fonte, MAI calcolati dal modulo.
   Formato: fasce = [oltre, fino a] mm · classi = {classe: [[scarto sup, scarto inf] per fascia]} in µm · null = casella assente/illeggibile */
var TOL_DATASETS = (typeof TOL_DATASETS !== 'undefined') ? TOL_DATASETS : [];
TOL_DATASETS.push({
 "id": "talide-fori-c9",
 "fonte": "Regolo in cartoncino «Tolleranze ISO» Talide Utensili (adesivo UTR Tiberti 1952), trascritto il 19/09/2026 dalle foto dell'utente ingrandite 3× — cursore, colonna C9",
 "tipo": "hole",
 "fasce": [
  [0,3], [3,6], [6,10], [10,18], [18,30], [30,40], [40,50], [50,65], [65,80], [80,100], [100,120], [120,140], [140,160], [160,180]
 ],
 "classi": {
  "C9": [
   [85,60], [100,70], [116,80], [138,95], [162,110], [182,120], [192,130], [214,140], [224,150], [257,170], [267,180], [300,200], [310,210], [330,230]
  ]
 }
});
