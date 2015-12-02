'use strict';

// quick check on the nric number.
// http://codingncryptography.tripod.com/01NRIC.htm
//

module.exports = { validate: validate };
var st = [ "J", "Z", "I", "H", "G", "F", "E", "D", "C", "B", "A" ];
var fg = [ "X", "W", "U", "T", "R", "Q", "P", "N", "M", "L", "K" ];
function validate(ic) {
  var icArray = new Array(9);
  for (var i = 0; i < 9; i++) {
    icArray[i] = ic.charAt(i);
  }
  icArray[1] *= 2;
  icArray[2] *= 7;
  icArray[3] *= 6;
  icArray[4] *= 5;
  icArray[5] *= 4;
  icArray[6] *= 3;
  icArray[7] *= 2;
  var weight = 0;
  for (i = 1; i < 8; i++) {
    weight += parseInt(icArray[i]);
  }
  var offset = (icArray[0] === "T" || icArray[0] === "G") ? 4 : 0;
  var temp = (offset + weight) % 11;
  var theAlpha;
  if (icArray[0] === "S" || icArray[0] === "T") {
    theAlpha = st[temp];
  } else if (icArray[0] === "F" || icArray[0] === "G") {
    theAlpha = fg[temp];
  }
  return (icArray[8] === theAlpha);
}
console.log('validate', validate('G5059636U'));
