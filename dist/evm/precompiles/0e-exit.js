"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BN = require("bn.js");
var assert = require('assert');
function default_1(opts) {
    console.log('Entered Exit Precompile');
    assert(opts.data);
    assert(opts.data.byteLength > 32);
    console.log(opts.data);
    var to = opts.data.slice(0, 32);
    var data = opts.data.slice(32);
    var gasUsed = new BN(0);
    console.log({
        to: to,
        data: data,
        caller: opts.caller,
        value: opts.value
    });
    return {
        gasUsed: gasUsed,
        returnValue: new Buffer(0),
        exits: [{
                to: to,
                caller: opts.caller,
                value: opts.value,
                data: data,
            }]
    };
}
exports.default = default_1;
//# sourceMappingURL=0e-exit.js.map