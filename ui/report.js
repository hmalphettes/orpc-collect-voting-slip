'use strict'

const jquery = require('jquery')
require('jquery-ui')
// const pivottable =
require('pivottable')

// var derivers = jquery.pivotUtilities.derivers

jquery.getJSON('/pivotmembers', function (mps) {
  // jquery("#output").pivot(mps, {
  //   rows: [
  //     'famname', 'firstname', 'middlename', 'preferredname', 'birthdate', 'mbrstatus'
  //   ],
  //   cols: [
  //     'gender', 'maritalstatus', 'country', 'yearjoin'
  //   ]
  //   // derivedAttributes: {
  //   //   "Age Bin": derivers.bin("Age", 10),
  //   //   "Gender Imbalance": function(mp) {
  //   //     return mp.Gender === "Male" ? 1 : -1
  //   //   }
  //   // }
  // })

  jquery('#output').pivotUI(mps, {
    rows: [
      /* 'famname', 'firstname', 'middlename', 'preferredname', 'birthdate',*/ 'mbrstatus'
    ],
    cols: [
      'country'//, 'yearjoin', 'gender', 'maritalstatus'
    ]
    // derivedAttributes: {
    //   "Age Bin": derivers.bin("Age", 10),
    //   "Gender Imbalance": function(mp) {
    //     return mp.Gender === "Male" ? 1 : -1
    //   }
    // }
  })
})
