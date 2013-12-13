/*
 * couch-promise
 * https://github.com/parroit/couch-promise
 *
 * Copyright (c) 2013 parroit
 * Licensed under the MIT license.
 */

'use strict';

var _ = require("lodash"),
    requesty = require('requesty');

var app = module.exports = {
    init: function (options) {
        this.options = options;
        return requesty (app.options.db + "/","GET",{Accept: "application/json"});

    },



    delete: function (document,code) {


        return app.getOne(document, "byCode", code).then(function(res){
            if (!res){
                return null;
            }

            return requesty(
                app.options.db + "/" + res.id + "?rev=" + res._rev,
                'DELETE',
                {Accept: "application/json"}
            ).then(function (res2) {
                    //console.dir(res2)
                    if (!res2.data.ok)
                        throw new Error(res2.data.reason);

                    return true;
                });
        });



    },
    getOne: function (document, view, key) {

        return app.get(document, view, key).then(function (result) {

            if (!_.isArray(result)) {
                throw new Error("result is not an array");
            }

            if (result.length > 1) {
                throw new Error(result.length + " results retrieved");

            }

            if (result.length == 0) {
                return null;

            }

            return result[0];


        });
    },
    get: function (document, view, key) {
        var url = app.options.db + "/_design/" + document + "/_view/" + view + (key ? "?key=" + key : "");

        return requesty (url,"GET",{Accept: "application/json"}).then(function(res){
            return _.map(res.data.rows, function (row) {
                var value = row.value;
                value.id = row.id;
                value.rev = row.value._rev;
                return value;
            });
        });




    },


    update: function (document) {

        return requesty(
            app.options.db + (document.id ? "/" +document.id :""),
            document.id ? 'PUT' : 'POST',
            {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            JSON.stringify(document)

        ).then(function(res){
                //console.log(res)
                document._rev = res.data.rev;
                return res;

            },function(err){
                console.dir(err)
            });




    }
};