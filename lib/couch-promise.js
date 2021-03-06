/*
 * couch-promise
 * https://github.com/parroit/couch-promise
 *
 * Copyright (c) 2013 parroit
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('lodash'),
    url = require('url'),
    querystring = require('querystring'),
    requesty = require('requesty');

function _uriToOptions(uri, method) {

    uri = url.parse(uri);


    return {
        scheme: uri.protocol || 'http',
        hostname: uri.hostname,
        host: uri.hostname,
        port: uri.port || (uri.protocol === 'https:' ? 443 : 80),
        path: uri.pathname + (uri.search || ''),
        method: method
    };
}

function stringifyFunctions(object, noStringify) {


    _.forEach(object, function(value, key) {

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



function CouchPromise() {

}

CouchPromise.prototype = {

    _authenticate: function(headers) {
        if (this.sessionCookie) {
            headers.cookie = this.sessionCookie;
        }

        if (!('Content-Length' in headers)) {
            headers['Content-Length'] = '0';
        }


        return headers;
    },

    _requesty: function(uri, method, headers, body) {
        var authInfo = this.auth;
        var login = this.login.bind(this);
        var authenticate = this._authenticate.bind(this);

        function reloginUnhautorized(err) {

                if (err.statusCode != 401 || !authInfo) {
                    //console.log('will throw ERR');
                    //console.dir(err);
                    throw err;
                }

                //console.log('re-login: %s:%s',authInfo.user, authInfo.password);

                return login(authInfo.user, authInfo.password)
                    .then(function(result) {
                        //console.log('re-login done');
                        //console.dir(result);
                        return requesty(uri, method, authenticate(headers), body);
                    });

            }
            //console.log('requesty')
        return requesty(uri, method, headers, body)
            .then(null, reloginUnhautorized);
    },


    login: function(user, password) {

        var _this = this;
        var url = _this.options.uri.scheme + '//' + _this.options.uri.hostname + ':' + _this.options.uri.port + '/_session';

        var body = querystring.stringify({
            name: user,
            password: password
        });

        return requesty(
            url,
            'POST', {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            },
            body
        )

        .then(function(res) {
            //console.dir(res)
            if (res.data.ok) {
                _this.sessionCookie = res.headers['set-cookie'];
                _this.auth = {
                    user: user,
                    password: password
                };
            }
            return _this.sessionCookie;
        })

        .then(null, function(err) {
            if (err)
            //console.log('Cannot login to couchdb:\n%s', err.stack);
                throw err;



        });




    },

    init: function(options) {
        this.options = options;
        this.options.uri = _uriToOptions(options.db);
        /*
        return requesty (this.options.db + '/','GET',this._authenticate({
            Accept: 'application/json'
        }));
        */

        return {
            then: function(resolve, reject) {
                //console.log ('resolve is:')
                //console.dir (resolve)
                if (resolve) {
                    resolve();
                }
                return this;
            }
        };
    },

    deleteDb: function() {
        //console.log('deleteDb')
        return this._requesty(this.options.db + '/', 'DELETE', this._authenticate({
            Accept: 'application/json'
        }));

    },

    createDb: function() {


        return this._requesty(this.options.db + '/', 'PUT', this._authenticate({
            Accept: 'application/json'
        }));

    },

    updateDesign: function(designDocument, designId) {
        var body = stringifyFunctions(designDocument);
        var _this = this;
        return this._requesty(
            _this.options.db + '/_design/' + designId,
            'PUT',
            this._authenticate({
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }),
            body
        );

    },

    delete: function(document, code, searchView) {
        var _this = this;

        return this.getOne(document, searchView, code).then(function(res) {
            if (!res) {
                return null;
            }

            return _this._requesty(
                _this.options.db + '/' + res._id + '?rev=' + res._rev,
                'DELETE',
                _this._authenticate({
                    Accept: 'application/json'
                })
            ).then(function(res2) {
                    //console.dir(res2)
                    if (!res2.data.ok)
                        throw new Error(res2.data.reason);

                    return true;
                },
                function(err) {
                    //console.dir('delete:'+err)
                    if (err.statusCode == 404)
                        return false;
                    throw err;
                });
        });



    },
    getOne: function(document, view, key) {

        return this.get(document, view, key).then(function(result) {

            if (!_.isArray(result)) {
                throw new Error('result is not an array');
            }

            if (result.length > 1) {
                throw new Error(result.length + ' results retrieved');

            }

            if (result.length === 0) {
                return null;

            }

            return result[0];


        });
    },
    get: function(document, view, key) {
        var url = this.options.db + '/_design/' + document + '/_view/' + view + (key ? '?key=' + key : '');
        //console.log(url)
        return this._requesty(url, 'GET', this._authenticate({
                Accept: 'application/json'
            }))
            .then(
                function(res) {
                    return _.map(res.data.rows, function(row) {
                        var value = row.value;
                        value._id = row.id;
                        value._rev = row.value._rev;
                        return value;
                    });
                },
                function(err) {
                    //console.dir(err);
                    if (err.statusCode == 404)
                        return [];
                    throw err;
                }
            );




    },


    update: function(document) {
        var body = JSON.stringify(document);
        return this._requesty(
            this.options.db + (document.id ? '/' + document.id : ''),
            document.id ? 'PUT' : 'POST',
            this._authenticate({
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }),
            body

        ).then(function(res) {
            //console.log(res)
            document._rev = res.data.rev;
            document._id = res.data.id;
            return res;

        });




    }
};


function newInstance() {
    return new CouchPromise();
}

var couchPromise = module.exports = newInstance();

couchPromise.newInstance = newInstance;


