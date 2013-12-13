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

function stringifyFunctions(object, noStringify) {


    _.forEach(object, function (value, key) {

        if (_.isFunction(value)) {
            object[key] = value.toString();

        } else if (_.isObject(value)) {

            object[key] = stringifyFunctions(value, true);

        }
    });

    if (noStringify)
        return object;

    return JSON.stringify(object);


}
var app = module.exports = {
    init: function (options) {
        this.options = options;
        return requesty (app.options.db + "/","GET",{Accept: "application/json"});

    },

    deleteDb: function () {

        return requesty (app.options.db + "/","DELETE",{Accept: "application/json"});

    },

    createDb: function () {

        return requesty (app.options.db + "/","PUT",{Accept: "application/json"});

    },

    updateDesign: function (designDocument,designId) {

        return requesty (
            app.options.db + "/_design/"+designId,
            "PUT",
            {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            stringifyFunctions(designDocument)
        );

    },

    delete: function (document,code,searchView) {


        return app.getOne(document, searchView, code).then(function(res){
            if (!res){
                return null;
            }

            return requesty(
                app.options.db + "/" + res._id + "?rev=" + res._rev,
                'DELETE',
                {Accept: "application/json"}
            ).then(function (res2) {
                    //console.dir(res2)
                    if (!res2.data.ok)
                        throw new Error(res2.data.reason);

                    return true;
                },
                function(err){
                    //console.dir("delete:"+err)
                    if (err.statusCode == 404)
                        return false;
                    throw err;
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
        //console.log(url)
        return requesty (url,"GET",{Accept: "application/json"})
            .then(
                function(res){
                    return _.map(res.data.rows, function (row) {
                        var value = row.value;
                        value._id = row.id;
                        value._rev = row.value._rev;
                        return value;
                    });
                },
                function(err){
                    console.dir(err)
                    if (err.statusCode==404)
                        return [];
                    throw err;
                }
        );




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
                document._id = res.data.id;
                return res;

            },function(err){
                console.dir(err)
            });




    }
};