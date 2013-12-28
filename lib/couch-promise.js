/*
 * couch-promise
 * https://github.com/parroit/couch-promise
 *
 * Copyright (c) 2013 parroit
 * Licensed under the MIT license.
 */

'use strict';

var _ = require("lodash"),
    url = require('url'),
    querystring = require("querystring"),
    requesty = require('requesty');

function _uriToOptions(uri, method) {

    uri = url.parse(uri);


    return {
        scheme: uri.protocol || "http",
        hostname: uri.hostname,
        host: uri.hostname,
        port: uri.port || (uri.protocol === "https:" ? 443 : 80),
        path: uri.pathname + (uri.search || ""),
        method: method
    };
}
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
//noinspection ReservedWordAsName
var app = module.exports = {
    _authenticate: function(headers){
        if (this.sessionCookie){
            headers["cookie"] = this.sessionCookie;
        }

        if (!("Content-Length" in headers)){
            headers["Content-Length"] = "0";
        }
        return headers;
    },
    login: function (user,password) {

        var _this = this;
        var url = _this.options.uri.scheme + "//" + _this.options.uri.hostname + ":" + _this.options.uri.port + "/_session";

        var body = querystring.stringify({
            name:user,
            password:password
        });

        return requesty (
            url,
            "POST",
            {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body)
            },
            body
        )

            .then(function (res) {
                if(res.data.ok){
                    _this.sessionCookie = res.headers['set-cookie'];
                }
                return _this.sessionCookie;
            })

            .then(null, function (err) {
                if (err)
                    console.log("Cannot login to couchdb:\n%s", err.stack);
                throw err;



            });




    },

    init: function (options) {
        this.options = options;
        this.options.uri = _uriToOptions(app.options.db);
        return requesty (app.options.db + "/","GET",this._authenticate({
            Accept: "application/json"
        }));

    },

    deleteDb: function () {

        return requesty (app.options.db + "/","DELETE",this._authenticate( {Accept: "application/json"}));

    },

    createDb: function () {


        return requesty (app.options.db + "/","PUT", this._authenticate({Accept: "application/json"}));

    },

    updateDesign: function (designDocument,designId) {
        var body = stringifyFunctions(designDocument);
        return requesty (
            app.options.db + "/_design/"+designId,
            "PUT",
            this._authenticate({
                Accept: "application/json",
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }),
            body
        );

    },

    delete: function (document,code,searchView) {
        var _this = this;

        return app.getOne(document, searchView, code).then(function(res){
            if (!res){
                return null;
            }

            return requesty(
                app.options.db + "/" + res._id + "?rev=" + res._rev,
                'DELETE',
                _this._authenticate({Accept: "application/json"})
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
        return requesty (url,"GET",this._authenticate({Accept: "application/json"}))
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
                console.dir(err);
                if (err.statusCode==404)
                    return [];
                throw err;
            }
        );




    },


    update: function (document) {
        var body = JSON.stringify(document);
        return requesty(
            app.options.db + (document.id ? "/" +document.id :""),
            document.id ? 'PUT' : 'POST',
            this._authenticate({
                Accept: "application/json",
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }),
            body

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