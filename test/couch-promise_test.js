'use strict';

var expect = require("expect.js");
var couch_promise = require("../lib/couch-promise");


describe("couch_promise", function () {
    it("is defined", function () {
        expect(couch_promise).to.be.an('object');
    });
});
