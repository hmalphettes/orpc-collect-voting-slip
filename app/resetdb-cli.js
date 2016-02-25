'use strict'

try {
  require('../env')
} catch (x) {
  console.log('No custom configuration: all default parameters')
}

/**
 * Meant to be called on the command line.
 */
require('./slip').reset(function (e) {
  if (e) {
    console.error('Error reseting the DB', e)
    process.exit(1)
  }
  console.log('Done reseting the DB')
  process.exit()
})
