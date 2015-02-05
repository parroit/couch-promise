var assert = require('assert'),
    _ = require('lodash'),
    design = require('./design'),
    couch = require('../lib/couch-promise');


function createDb(done) {

    couch.createDb().then(function (res) {
        if (res.data.ok) {

            couch.updateDesign(design,'app')
                .then(function (res) {

                    if (res.data.ok) {

                        done();
                    } else {
                        done (new Error('Cannot update design:+', res.data.reason));
                    }

                }).then(null, done);
        } else {
            done (new Error('Cannot create database:', res.data.reason));
        }


    }).then(null, done);
}

describe('couch', function () {
    before(function(done){

        couch.init({
            db: 'http://localhost:5984/couch-promise'
        })

            .then(function (res) {
                
                couch.deleteDb().then(function(){
                    
                    createDb(done);
                },function(err){
                    if (err.statusCode == 404)    {
                        createDb(done);
                    } else {
                        done(err);
                    }
                });

            })
            .then(null,done);

    });

    it('is defined', function () {
        expect(couch).to.be.an('object');
    });

    function onErr (err) {
        console.log(err.stack);
        throw err;
    }
    var document;

    describe('create', function () {
        var models;

        var savedDocument;
        before(function (done) {
            document = {
                type: 'model',
                field1: 'value1',
                field2: 'value2',
                code: '1'
            };

            couch.update(document)
                .then(
                    function (result) {
                        models = result;

                        couch.getOne('app','models','"1"').then(function (result) {
                            //console.log(result)
                            savedDocument = result;
                            done();
                        }, onErr);

                    },onErr);
        });

        it('set document id',function(){
            expect(document._id).to.be.an('string');
        });

        it('set document revision',function(){
            expect(document._rev).to.be.an('string');
        });

        it('document is saved',function(){

            expect(_.isEqual(document,savedDocument)).to.be.equal(true);
        });

    });


    describe('update', function () {

        var savedDocument;
        before(function (done) {
            document.field1 = 'updated1';
            couch.update(document)
                .then(
                function (result) {
                    couch.getOne('app','models','"1"').then(function (result) {
                        //console.log(result)
                        savedDocument = result;
                        done();
                    }, onErr);

                },onErr);
        });



        it('document is saved',function(){

            expect(savedDocument.field1).to.be.equal('updated1');
        });

    });

    describe('all', function () {
        var models;


        before(function (done) {
            document = {
                type: 'model',
                field1: 'value1',
                field2: 'value2',
                code: '2'
            };
            couch.update(document)
                .then(function (result) {

                    couch.get('app','models').then(function (result) {
                        //console.log(result)
                        models = result;
                        done();
                    }, onErr);

                },onErr);
        });

        it('return all documents',function(){
            expect(models.length).to.be.equal(2);
        });

        it('return distinct documents',function(){
            expect(models[0].code).to.be.equal('1');
            expect(models[1].code).to.be.equal('2');
        });


    });

    describe('delete', function () {

        var savedDocument='ciao';
        before(function (done) {

            couch.delete('app','"1"','models')
                .then(
                function (result) {
                    couch.getOne('app','models','"1"').then(function (result) {

                        savedDocument = result;
                        done();
                    }, onErr);

                },onErr);
        });



        it('document is removed',function(){

            expect(savedDocument).to.be.equal(null);
        });

    });



});