import BN = require('bn.js')
import { PrecompileInput } from './types'
import { ExecResult } from '../evm'
const assert = require('assert')

export default function(opts: PrecompileInput): ExecResult {
  console.log('Entered Exit Precompile')
  assert(opts.data)
  assert(opts.data.byteLength >= 32)
  console.log(opts.data)
  const to = opts.data.slice(0, 32);
  const data = opts.data.slice(32);
  const gasUsed = new BN(0)
  console.log({
    to,
    data,
    caller: opts.caller,
    value: opts.value
  })
  return {
    gasUsed,
    returnValue: new Buffer(0),
    exits: [{
      to,
      caller: opts.caller,
      value: opts.value,
      data,
    }]
  }
}
