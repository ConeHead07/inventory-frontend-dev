
const fs = require('fs');
const readline = require('readline');
const args = process.argv.slice(2);

const csvFile = args.length ? args[0] : '';
const sqlFile = csvFile + '.sql';

let fileFldStat = [];
let fileColNames =  [];
let increment = 0;

console.log( { csvFile });

if (!csvFile) {
  return;
}

const readInterface = readline.createInterface({
  input: fs.createReadStream( csvFile, { encoding: 'latin1' } ),
  output: null,
  console: false
});

let fh = fs.openSync( sqlFile, 'w');

readInterface.on( 'line', function(line) {

  ++increment;

  if (0 && increment > 5 ) {
    return 1;
  }

  const vals = line.split(';');
  let insertFlds = [];
  let insertVals = [];
  if ( !fileColNames.length ) {
    fileColNames = vals;
    console.log( '#37 ', fileColNames );
    return;
  }

  for(let i = 0; i  < vals.length; i++) {
    let val = vals[i].trim();
    let len = val.length;

    if (len && !(i in fileFldStat) || len > fileFldStat[i]) {
        fileFldStat[i] = len;
    }

    if (len) {
      insertFlds.push( fileColNames[i] );
      insertVals.push( '"' + val + '"');
    }
  }

  fs.writeSync(fh, 'INSERT INTO apo_bank_katalog(' + insertFlds.join(', ') + ') VALUES(' + insertVals.join(', ') + ");\n");

});

readInterface.on( 'close', function() {
  fs.closeSync( fh );
  for(let i in fileFldStat) {
    console.log(fileColNames[i], fileFldStat[i] );
  }
  console.log( { fileColNames } );

  let createTableCols = fileColNames.map(col => col + " VARCHAR(100) NULL");
  console.log( createTableCols.join( ",\n"));
});
console.log("Finised");
