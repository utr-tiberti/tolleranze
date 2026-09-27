/* Dataset di verifica ESTERNO per TolISO — valori trascritti dalla fonte, MAI calcolati dal modulo.
   Formato: fasce = [oltre, fino a] mm · classi = {classe: [[scarto sup, scarto inf] per fascia]} in µm · null = casella assente/illeggibile */
var TOL_DATASETS = (typeof TOL_DATASETS !== 'undefined') ? TOL_DATASETS : [];
TOL_DATASETS.push({
 "id": "talide-fori-fini",
 "fonte": "Regolo in cartoncino «Tolleranze ISO» Talide Utensili (adesivo UTR Tiberti 1952), trascritto il 19/09/2026 dalle foto dell'utente ingrandite 3× — lato FORO BASE, colonne a fasce intermedie",
 "tipo": "hole",
 "fasce": [
  [0,3], [3,6], [6,10], [10,18], [18,30], [30,50], [50,65], [65,80], [80,100], [100,120], [120,140], [140,160], [160,180]
 ],
 "classi": {
  "S7": [
   [-14,-24], [-15,-27], [-17,-32], [-21,-39], [-27,-48], [-34,-59], [-42,-72], [-48,-78], [-58,-93], [-66,-101], [-77,-117], [-85,-125], [-93,-133]
  ],
  "S8": [
   [-14,-28], [-19,-37], [-23,-45], [-28,-55], [-35,-68], [-43,-82], [-53,-99], [-59,-105], [-71,-125], [-79,-133], [-92,-155], [-100,-163], [-108,-171]
  ],
  "R7": [
   [-10,-20], [-11,-23], [-13,-28], [-16,-34], [-20,-41], [-25,-50], [-30,-60], [-32,-62], [-38,-73], [-41,-76], [-48,-88], [-50,-90], [-53,-93]
  ]
 }
});
