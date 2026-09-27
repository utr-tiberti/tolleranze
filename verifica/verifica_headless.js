/* coda per verifica.sh: stampa autotest interno + verifica esterna */
var _st = TolISO.selfTest();
var _nl = String.fromCharCode(10);
'AUTOTEST INTERNO: ' + _st.pass + '/' + _st.total + (_st.fail ? ' FALLITI: ' + _st.failures.join(' | ') : ' OK') + _nl + _nl +
'VERIFICA ESTERNA (TolISO v' + TolISO.version + ')' + _nl + tolVerifyText(tolVerify(TolISO, TOL_DATASETS));
