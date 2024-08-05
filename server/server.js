(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('http'), require('fs'), require('crypto')) :
        typeof define === 'function' && define.amd ? define(['http', 'fs', 'crypto'], factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Server = factory(global.http, global.fs, global.crypto));
}(this, (function (http, fs, crypto) {
    'use strict';

    function _interopDefaultLegacy(e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var http__default = /*#__PURE__*/_interopDefaultLegacy(http);
    var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
    var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);

    class ServiceError extends Error {
        constructor(message = 'Service Error') {
            super(message);
            this.name = 'ServiceError';
        }
    }

    class NotFoundError extends ServiceError {
        constructor(message = 'Resource not found') {
            super(message);
            this.name = 'NotFoundError';
            this.status = 404;
        }
    }

    class RequestError extends ServiceError {
        constructor(message = 'Request error') {
            super(message);
            this.name = 'RequestError';
            this.status = 400;
        }
    }

    class ConflictError extends ServiceError {
        constructor(message = 'Resource conflict') {
            super(message);
            this.name = 'ConflictError';
            this.status = 409;
        }
    }

    class AuthorizationError extends ServiceError {
        constructor(message = 'Unauthorized') {
            super(message);
            this.name = 'AuthorizationError';
            this.status = 401;
        }
    }

    class CredentialError extends ServiceError {
        constructor(message = 'Forbidden') {
            super(message);
            this.name = 'CredentialError';
            this.status = 403;
        }
    }

    var errors = {
        ServiceError,
        NotFoundError,
        RequestError,
        ConflictError,
        AuthorizationError,
        CredentialError
    };

    const { ServiceError: ServiceError$1 } = errors;


    function createHandler(plugins, services) {
        return async function handler(req, res) {
            const method = req.method;
            console.info(`<< ${req.method} ${req.url}`);

            // Redirect fix for admin panel relative paths
            if (req.url.slice(-6) == '/admin') {
                res.writeHead(302, {
                    'Location': `http://${req.headers.host}/admin/`
                });
                return res.end();
            }

            let status = 200;
            let headers = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            };
            let result = '';
            let context;

            // NOTE: the OPTIONS method results in undefined result and also it never processes plugins - keep this in mind
            if (method == 'OPTIONS') {
                Object.assign(headers, {
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Credentials': false,
                    'Access-Control-Max-Age': '86400',
                    'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-Authorization, X-Admin'
                });
            } else {
                try {
                    context = processPlugins();
                    await handle(context);
                } catch (err) {
                    if (err instanceof ServiceError$1) {
                        status = err.status || 400;
                        result = composeErrorObject(err.code || status, err.message);
                    } else {
                        // Unhandled exception, this is due to an error in the service code - REST consumers should never have to encounter this;
                        // If it happens, it must be debugged in a future version of the server
                        console.error(err);
                        status = 500;
                        result = composeErrorObject(500, 'Server Error');
                    }
                }
            }

            res.writeHead(status, headers);
            if (context != undefined && context.util != undefined && context.util.throttle) {
                await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
            }
            res.end(result);

            function processPlugins() {
                const context = { params: {} };
                plugins.forEach(decorate => decorate(context, req));
                return context;
            }

            async function handle(context) {
                const { serviceName, tokens, query, body } = await parseRequest(req);
                if (serviceName == 'admin') {
                    return ({ headers, result } = services['admin'](method, tokens, query, body));
                } else if (serviceName == 'favicon.ico') {
                    return ({ headers, result } = services['favicon'](method, tokens, query, body));
                }

                const service = services[serviceName];

                if (service === undefined) {
                    status = 400;
                    result = composeErrorObject(400, `Service "${serviceName}" is not supported`);
                    console.error('Missing service ' + serviceName);
                } else {
                    result = await service(context, { method, tokens, query, body });
                }

                // NOTE: logout does not return a result
                // in this case the content type header should be omitted, to allow checks on the client
                if (result !== undefined) {
                    result = JSON.stringify(result);
                } else {
                    status = 204;
                    delete headers['Content-Type'];
                }
            }
        };
    }



    function composeErrorObject(code, message) {
        return JSON.stringify({
            code,
            message
        });
    }

    async function parseRequest(req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const tokens = url.pathname.split('/').filter(x => x.length > 0);
        const serviceName = tokens.shift();
        const queryString = url.search.split('?')[1] || '';
        const query = queryString
            .split('&')
            .filter(s => s != '')
            .map(x => x.split('='))
            .reduce((p, [k, v]) => Object.assign(p, { [k]: decodeURIComponent(v) }), {});
        const body = await parseBody(req);

        return {
            serviceName,
            tokens,
            query,
            body
        };
    }

    function parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => body += chunk.toString());
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    resolve(body);
                }
            });
        });
    }

    var requestHandler = createHandler;

    class Service {
        constructor() {
            this._actions = [];
            this.parseRequest = this.parseRequest.bind(this);
        }

        /**
         * Handle service request, after it has been processed by a request handler
         * @param {*} context Execution context, contains result of middleware processing
         * @param {{method: string, tokens: string[], query: *, body: *}} request Request parameters
         */
        async parseRequest(context, request) {
            for (let { method, name, handler } of this._actions) {
                if (method === request.method && matchAndAssignParams(context, request.tokens[0], name)) {
                    return await handler(context, request.tokens.slice(1), request.query, request.body);
                }
            }
        }

        /**
         * Register service action
         * @param {string} method HTTP method
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        registerAction(method, name, handler) {
            this._actions.push({ method, name, handler });
        }

        /**
         * Register GET action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        get(name, handler) {
            this.registerAction('GET', name, handler);
        }

        /**
         * Register POST action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        post(name, handler) {
            this.registerAction('POST', name, handler);
        }

        /**
         * Register PUT action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        put(name, handler) {
            this.registerAction('PUT', name, handler);
        }

        /**
         * Register PATCH action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        patch(name, handler) {
            this.registerAction('PATCH', name, handler);
        }

        /**
         * Register DELETE action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        delete(name, handler) {
            this.registerAction('DELETE', name, handler);
        }
    }

    function matchAndAssignParams(context, name, pattern) {
        if (pattern == '*') {
            return true;
        } else if (pattern[0] == ':') {
            context.params[pattern.slice(1)] = name;
            return true;
        } else if (name == pattern) {
            return true;
        } else {
            return false;
        }
    }

    var Service_1 = Service;

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var util = {
        uuid
    };

    const uuid$1 = util.uuid;


    const data = fs__default['default'].existsSync('./data') ? fs__default['default'].readdirSync('./data').reduce((p, c) => {
        const content = JSON.parse(fs__default['default'].readFileSync('./data/' + c));
        const collection = c.slice(0, -5);
        p[collection] = {};
        for (let endpoint in content) {
            p[collection][endpoint] = content[endpoint];
        }
        return p;
    }, {}) : {};

    const actions = {
        get: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            return responseData;
        },
        post: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            // TODO handle collisions, replacement
            let responseData = data;
            for (let token of tokens) {
                if (responseData.hasOwnProperty(token) == false) {
                    responseData[token] = {};
                }
                responseData = responseData[token];
            }

            const newId = uuid$1();
            responseData[newId] = Object.assign({}, body, { _id: newId });
            return responseData[newId];
        },
        put: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens.slice(0, -1)) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined && responseData[tokens.slice(-1)] !== undefined) {
                responseData[tokens.slice(-1)] = body;
            }
            return responseData[tokens.slice(-1)];
        },
        patch: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined) {
                Object.assign(responseData, body);
            }
            return responseData;
        },
        delete: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (responseData.hasOwnProperty(token) == false) {
                    return null;
                }
                if (i == tokens.length - 1) {
                    const body = responseData[token];
                    delete responseData[token];
                    return body;
                } else {
                    responseData = responseData[token];
                }
            }
        }
    };

    const dataService = new Service_1();
    dataService.get(':collection', actions.get);
    dataService.post(':collection', actions.post);
    dataService.put(':collection', actions.put);
    dataService.patch(':collection', actions.patch);
    dataService.delete(':collection', actions.delete);


    var jsonstore = dataService.parseRequest;

    /*
     * This service requires storage and auth plugins
     */

    const { AuthorizationError: AuthorizationError$1 } = errors;



    const userService = new Service_1();

    userService.get('me', getSelf);
    userService.post('register', onRegister);
    userService.post('login', onLogin);
    userService.get('logout', onLogout);


    function getSelf(context, tokens, query, body) {
        if (context.user) {
            const result = Object.assign({}, context.user);
            delete result.hashedPassword;
            return result;
        } else {
            throw new AuthorizationError$1();
        }
    }

    function onRegister(context, tokens, query, body) {
        return context.auth.register(body);
    }

    function onLogin(context, tokens, query, body) {
        return context.auth.login(body);
    }

    function onLogout(context, tokens, query, body) {
        return context.auth.logout();
    }

    var users = userService.parseRequest;

    const { NotFoundError: NotFoundError$1, RequestError: RequestError$1 } = errors;


    var crud = {
        get,
        post,
        put,
        patch,
        delete: del
    };


    function validateRequest(context, tokens, query) {
        /*
        if (context.params.collection == undefined) {
            throw new RequestError('Please, specify collection name');
        }
        */
        if (tokens.length > 1) {
            throw new RequestError$1();
        }
    }

    function parseWhere(query) {
        const operators = {
            '<=': (prop, value) => record => record[prop] <= JSON.parse(value),
            '<': (prop, value) => record => record[prop] < JSON.parse(value),
            '>=': (prop, value) => record => record[prop] >= JSON.parse(value),
            '>': (prop, value) => record => record[prop] > JSON.parse(value),
            '=': (prop, value) => record => record[prop] == JSON.parse(value),
            ' like ': (prop, value) => record => record[prop].toLowerCase().includes(JSON.parse(value).toLowerCase()),
            ' in ': (prop, value) => record => JSON.parse(`[${/\((.+?)\)/.exec(value)[1]}]`).includes(record[prop]),
        };
        const pattern = new RegExp(`^(.+?)(${Object.keys(operators).join('|')})(.+?)$`, 'i');

        try {
            let clauses = [query.trim()];
            let check = (a, b) => b;
            let acc = true;
            if (query.match(/ and /gi)) {
                // inclusive
                clauses = query.split(/ and /gi);
                check = (a, b) => a && b;
                acc = true;
            } else if (query.match(/ or /gi)) {
                // optional
                clauses = query.split(/ or /gi);
                check = (a, b) => a || b;
                acc = false;
            }
            clauses = clauses.map(createChecker);

            return (record) => clauses
                .map(c => c(record))
                .reduce(check, acc);
        } catch (err) {
            throw new Error('Could not parse WHERE clause, check your syntax.');
        }

        function createChecker(clause) {
            let [match, prop, operator, value] = pattern.exec(clause);
            [prop, value] = [prop.trim(), value.trim()];

            return operators[operator.toLowerCase()](prop, value);
        }
    }


    function get(context, tokens, query, body) {
        validateRequest(context, tokens);

        let responseData;

        try {
            if (query.where) {
                responseData = context.storage.get(context.params.collection).filter(parseWhere(query.where));
            } else if (context.params.collection) {
                responseData = context.storage.get(context.params.collection, tokens[0]);
            } else {
                // Get list of collections
                return context.storage.get();
            }

            if (query.sortBy) {
                const props = query.sortBy
                    .split(',')
                    .filter(p => p != '')
                    .map(p => p.split(' ').filter(p => p != ''))
                    .map(([p, desc]) => ({ prop: p, desc: desc ? true : false }));

                // Sorting priority is from first to last, therefore we sort from last to first
                for (let i = props.length - 1; i >= 0; i--) {
                    let { prop, desc } = props[i];
                    responseData.sort(({ [prop]: propA }, { [prop]: propB }) => {
                        if (typeof propA == 'number' && typeof propB == 'number') {
                            return (propA - propB) * (desc ? -1 : 1);
                        } else {
                            return propA.localeCompare(propB) * (desc ? -1 : 1);
                        }
                    });
                }
            }

            if (query.offset) {
                responseData = responseData.slice(Number(query.offset) || 0);
            }
            const pageSize = Number(query.pageSize) || 10;
            if (query.pageSize) {
                responseData = responseData.slice(0, pageSize);
            }

            if (query.distinct) {
                const props = query.distinct.split(',').filter(p => p != '');
                responseData = Object.values(responseData.reduce((distinct, c) => {
                    const key = props.map(p => c[p]).join('::');
                    if (distinct.hasOwnProperty(key) == false) {
                        distinct[key] = c;
                    }
                    return distinct;
                }, {}));
            }

            if (query.count) {
                return responseData.length;
            }

            if (query.select) {
                const props = query.select.split(',').filter(p => p != '');
                responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                function transform(r) {
                    const result = {};
                    props.forEach(p => result[p] = r[p]);
                    return result;
                }
            }

            if (query.load) {
                const props = query.load.split(',').filter(p => p != '');
                props.map(prop => {
                    const [propName, relationTokens] = prop.split('=');
                    const [idSource, collection] = relationTokens.split(':');
                    console.log(`Loading related records from "${collection}" into "${propName}", joined on "_id"="${idSource}"`);
                    const storageSource = collection == 'users' ? context.protectedStorage : context.storage;
                    responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                    function transform(r) {
                        const seekId = r[idSource];
                        const related = storageSource.get(collection, seekId);
                        delete related.hashedPassword;
                        r[propName] = related;
                        return r;
                    }
                });
            }

        } catch (err) {
            console.error(err);
            if (err.message.includes('does not exist')) {
                throw new NotFoundError$1();
            } else {
                throw new RequestError$1(err.message);
            }
        }

        context.canAccess(responseData);

        return responseData;
    }

    function post(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length > 0) {
            throw new RequestError$1('Use PUT to update records');
        }
        context.canAccess(undefined, body);

        body._ownerId = context.user._id;
        let responseData;

        try {
            responseData = context.storage.add(context.params.collection, body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function put(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.set(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function patch(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.merge(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function del(context, tokens, query, body) {
        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing);

        try {
            responseData = context.storage.delete(context.params.collection, tokens[0]);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    /*
     * This service requires storage and auth plugins
     */

    const dataService$1 = new Service_1();
    dataService$1.get(':collection', crud.get);
    dataService$1.post(':collection', crud.post);
    dataService$1.put(':collection', crud.put);
    dataService$1.patch(':collection', crud.patch);
    dataService$1.delete(':collection', crud.delete);

    var data$1 = dataService$1.parseRequest;

    const imgdata = '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Td4DLneAwSddMiRH8tMU8nng/Yy+KQsM3AKBNbe35j5OH4A0dbV8AxwcAqMFyl73eHd3e2//nmn29wOGi3Kv+RixSgAAEkxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOmlwdGNFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpwbHVzPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3htcC8xLjAvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgeG1sbnM6eG1wUmlnaHRzPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvcmlnaHRzLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOjdjZDM3NWM3LTcwNmItNDlkMy1hOWRkLWNmM2Q3MmMwY2I4ZCIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NGY2YTJlYy04ZjA5LTRkZTMtOTY3ZC05MTUyY2U5NjYxNTAiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxMmE1NzI5Mi1kNmJkLTRlYjQtOGUxNi1hODEzYjMwZjU0NWYiCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09IldpbmRvd3MiCiAgIEdJTVA6VGltZVN0YW1wPSIxNjEzMzAwNzI5NTMwNjQzIgogICBHSU1QOlZlcnNpb249IjIuMTAuMTIiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICBwaG90b3Nob3A6Q3JlZGl0PSJHZXR0eSBJbWFnZXMvaVN0b2NrcGhvdG8iCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIgogICB4bXBSaWdodHM6V2ViU3RhdGVtZW50PSJodHRwczovL3d3dy5pc3RvY2twaG90by5jb20vbGVnYWwvbGljZW5zZS1hZ3JlZW1lbnQ/dXRtX21lZGl1bT1vcmdhbmljJmFtcDt1dG1fc291cmNlPWdvb2dsZSZhbXA7dXRtX2NhbXBhaWduPWlwdGN1cmwiPgogICA8aXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgIDxpcHRjRXh0OkxvY2F0aW9uU2hvd24+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvblNob3duPgogICA8aXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgIDxpcHRjRXh0OlJlZ2lzdHJ5SWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpSZWdpc3RyeUlkPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjOTQ2M2MxMC05OWE4LTQ1NDQtYmRlOS1mNzY0ZjdhODJlZDkiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoV2luZG93cykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjEtMDItMTRUMTM6MDU6MjkiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogICA8cGx1czpJbWFnZVN1cHBsaWVyPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VTdXBwbGllcj4KICAgPHBsdXM6SW1hZ2VDcmVhdG9yPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VDcmVhdG9yPgogICA8cGx1czpDb3B5cmlnaHRPd25lcj4KICAgIDxyZGY6U2VxLz4KICAgPC9wbHVzOkNvcHlyaWdodE93bmVyPgogICA8cGx1czpMaWNlbnNvcj4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgcGx1czpMaWNlbnNvclVSTD0iaHR0cHM6Ly93d3cuaXN0b2NrcGhvdG8uY29tL3Bob3RvL2xpY2Vuc2UtZ20xMTUwMzQ1MzQxLT91dG1fbWVkaXVtPW9yZ2FuaWMmYW1wO3V0bV9zb3VyY2U9Z29vZ2xlJmFtcDt1dG1fY2FtcGFpZ249aXB0Y3VybCIvPgogICAgPC9yZGY6U2VxPgogICA8L3BsdXM6TGljZW5zb3I+CiAgIDxkYzpjcmVhdG9yPgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaT5WbGFkeXNsYXYgU2VyZWRhPC9yZGY6bGk+CiAgICA8L3JkZjpTZXE+CiAgIDwvZGM6Y3JlYXRvcj4KICAgPGRjOmRlc2NyaXB0aW9uPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5TZXJ2aWNlIHRvb2xzIGljb24gb24gd2hpdGUgYmFja2dyb3VuZC4gVmVjdG9yIGlsbHVzdHJhdGlvbi48L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC9kYzpkZXNjcmlwdGlvbj4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PmWJCnkAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQflAg4LBR0CZnO/AAAARHRFWHRDb21tZW50AFNlcnZpY2UgdG9vbHMgaWNvbiBvbiB3aGl0ZSBiYWNrZ3JvdW5kLiBWZWN0b3IgaWxsdXN0cmF0aW9uLlwvEeIAAAMxSURBVHja7Z1bcuQwCEX7qrLQXlp2ynxNVWbK7dgWj3sl9JvYRhxACD369erW7UMzx/cYaychonAQvXM5ABYkpynoYIiEGdoQog6AYfywBrCxF4zNrX/7McBbuXJe8rXx/KBDULcGsMREzCbeZ4J6ME/9wVH5d95rogZp3npEgPLP3m2iUSGqXBJS5Dr6hmLm8kRuZABYti5TMaailV8LodNQwTTUWk4/WZk75l0kM0aZQdaZjMqkrQDAuyMVJWFjMB4GANXr0lbZBxQKr7IjI7QvVWkok/Jn5UHVh61CYPs+/i7eL9j3y/Au8WqoAIC34k8/9k7N8miLcaGWHwgjZXE/awyYX7h41wKMCskZM2HXAddDkTdglpSjz5bcKPbcCEKwT3+DhxtVpJvkEC7rZSgq32NMSBoXaCdiahDCKrND0fpX8oQlVsQ8IFQZ1VARdIF5wroekAjB07gsAgDUIbQHFENIDEX4CQANIVe8Iw/ASiACLXl28eaf579OPuBa9/mrELUYHQ1t3KHlZZnRcXb2/c7ygXIQZqjDMEzeSrOgCAhqYMvTUE+FKXoVxTxgk3DEPREjGzj3nAk/VaKyB9GVIu4oMyOlrQZgrBBEFG9PAZTfs3amYDGrP9Wl964IeFvtz9JFluIvlEvcdoXDOdxggbDxGwTXcxFRi/LdirKgZUBm7SUdJG69IwSUzAMWgOAq/4hyrZVaJISSNWHFVbEoCFEhyBrCtXS9L+so9oTy8wGqxbQDD350WTjNESVFEB5hdKzUGcV5QtYxVWR2Ssl4Mg9qI9u6FCBInJRXgfEEgtS9Cgrg7kKouq4mdcDNBnEHQvWFTdgdgsqP+MiluVeBM13ahx09AYSWi50gsF+I6vn7BmCEoHR3NBzkpIOw4+XdVBBGQUioblaZHbGlodtB+N/jxqwLX/x/NARfD8ADxTOCKIcwE4Lw0OIbguMYcGTlymEpHYLXIKx8zQEqIfS2lGJPaADFEBR/PMH79ErqtpnZmTBlvM4wgihPWDEEhXn1LISj50crNgfCp+dWHYQRCfb2zgfnBZmKGAyi914anK9Coi4LOMhoAn3uVtn+AGnLKxPUZnCuAAAAAElFTkSuQmCC';
    const img = Buffer.from(imgdata, 'base64');

    var favicon = (method, tokens, query, body) => {
        console.log('serving favicon...');
        const headers = {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        };
        let result = img;

        return {
            headers,
            result
        };
    };

    var require$$0 = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n    <meta charset=\"UTF-8\">\r\n    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n    <title>SUPS Admin Panel</title>\r\n    <style>\r\n        * {\r\n            padding: 0;\r\n            margin: 0;\r\n        }\r\n\r\n        body {\r\n            padding: 32px;\r\n            font-size: 16px;\r\n        }\r\n\r\n        .layout::after {\r\n            content: '';\r\n            clear: both;\r\n            display: table;\r\n        }\r\n\r\n        .col {\r\n            display: block;\r\n            float: left;\r\n        }\r\n\r\n        p {\r\n            padding: 8px 16px;\r\n        }\r\n\r\n        table {\r\n            border-collapse: collapse;\r\n        }\r\n\r\n        caption {\r\n            font-size: 120%;\r\n            text-align: left;\r\n            padding: 4px 8px;\r\n            font-weight: bold;\r\n            background-color: #ddd;\r\n        }\r\n\r\n        table, tr, th, td {\r\n            border: 1px solid #ddd;\r\n        }\r\n\r\n        th, td {\r\n            padding: 4px 8px;\r\n        }\r\n\r\n        ul {\r\n            list-style: none;\r\n        }\r\n\r\n        .collection-list a {\r\n            display: block;\r\n            width: 120px;\r\n            padding: 4px 8px;\r\n            text-decoration: none;\r\n            color: black;\r\n            background-color: #ccc;\r\n        }\r\n        .collection-list a:hover {\r\n            background-color: #ddd;\r\n        }\r\n        .collection-list a:visited {\r\n            color: black;\r\n        }\r\n    </style>\r\n    <script type=\"module\">\nimport { html, render } from 'https://unpkg.com/lit-html@1.3.0?module';\nimport { until } from 'https://unpkg.com/lit-html@1.3.0/directives/until?module';\n\nconst api = {\r\n    async get(url) {\r\n        return json(url);\r\n    },\r\n    async post(url, body) {\r\n        return json(url, {\r\n            method: 'POST',\r\n            headers: { 'Content-Type': 'application/json' },\r\n            body: JSON.stringify(body)\r\n        });\r\n    }\r\n};\r\n\r\nasync function json(url, options) {\r\n    return await (await fetch('/' + url, options)).json();\r\n}\r\n\r\nasync function getCollections() {\r\n    return api.get('data');\r\n}\r\n\r\nasync function getRecords(collection) {\r\n    return api.get('data/' + collection);\r\n}\r\n\r\nasync function getThrottling() {\r\n    return api.get('util/throttle');\r\n}\r\n\r\nasync function setThrottling(throttle) {\r\n    return api.post('util', { throttle });\r\n}\n\nasync function collectionList(onSelect) {\r\n    const collections = await getCollections();\r\n\r\n    return html`\r\n    <ul class=\"collection-list\">\r\n        ${collections.map(collectionLi)}\r\n    </ul>`;\r\n\r\n    function collectionLi(name) {\r\n        return html`<li><a href=\"javascript:void(0)\" @click=${(ev) => onSelect(ev, name)}>${name}</a></li>`;\r\n    }\r\n}\n\nasync function recordTable(collectionName) {\r\n    const records = await getRecords(collectionName);\r\n    const layout = getLayout(records);\r\n\r\n    return html`\r\n    <table>\r\n        <caption>${collectionName}</caption>\r\n        <thead>\r\n            <tr>${layout.map(f => html`<th>${f}</th>`)}</tr>\r\n        </thead>\r\n        <tbody>\r\n            ${records.map(r => recordRow(r, layout))}\r\n        </tbody>\r\n    </table>`;\r\n}\r\n\r\nfunction getLayout(records) {\r\n    const result = new Set(['_id']);\r\n    records.forEach(r => Object.keys(r).forEach(k => result.add(k)));\r\n\r\n    return [...result.keys()];\r\n}\r\n\r\nfunction recordRow(record, layout) {\r\n    return html`\r\n    <tr>\r\n        ${layout.map(f => html`<td>${JSON.stringify(record[f]) || html`<span>(missing)</span>`}</td>`)}\r\n    </tr>`;\r\n}\n\nasync function throttlePanel(display) {\r\n    const active = await getThrottling();\r\n\r\n    return html`\r\n    <p>\r\n        Request throttling: </span>${active}</span>\r\n        <button @click=${(ev) => set(ev, true)}>Enable</button>\r\n        <button @click=${(ev) => set(ev, false)}>Disable</button>\r\n    </p>`;\r\n\r\n    async function set(ev, state) {\r\n        ev.target.disabled = true;\r\n        await setThrottling(state);\r\n        display();\r\n    }\r\n}\n\n//import page from '//unpkg.com/page/page.mjs';\r\n\r\n\r\nfunction start() {\r\n    const main = document.querySelector('main');\r\n    editor(main);\r\n}\r\n\r\nasync function editor(main) {\r\n    let list = html`<div class=\"col\">Loading&hellip;</div>`;\r\n    let viewer = html`<div class=\"col\">\r\n    <p>Select collection to view records</p>\r\n</div>`;\r\n    display();\r\n\r\n    list = html`<div class=\"col\">${await collectionList(onSelect)}</div>`;\r\n    display();\r\n\r\n    async function display() {\r\n        render(html`\r\n        <section class=\"layout\">\r\n            ${until(throttlePanel(display), html`<p>Loading</p>`)}\r\n        </section>\r\n        <section class=\"layout\">\r\n            ${list}\r\n            ${viewer}\r\n        </section>`, main);\r\n    }\r\n\r\n    async function onSelect(ev, name) {\r\n        ev.preventDefault();\r\n        viewer = html`<div class=\"col\">${await recordTable(name)}</div>`;\r\n        display();\r\n    }\r\n}\r\n\r\nstart();\n\n</script>\r\n</head>\r\n<body>\r\n    <main>\r\n        Loading&hellip;\r\n    </main>\r\n</body>\r\n</html>";

    const mode = process.argv[2] == '-dev' ? 'dev' : 'prod';

    const files = {
        index: mode == 'prod' ? require$$0 : fs__default['default'].readFileSync('./client/index.html', 'utf-8')
    };

    var admin = (method, tokens, query, body) => {
        const headers = {
            'Content-Type': 'text/html'
        };
        let result = '';

        const resource = tokens.join('/');
        if (resource && resource.split('.').pop() == 'js') {
            headers['Content-Type'] = 'application/javascript';

            files[resource] = files[resource] || fs__default['default'].readFileSync('./client/' + resource, 'utf-8');
            result = files[resource];
        } else {
            result = files.index;
        }

        return {
            headers,
            result
        };
    };

    /*
     * This service requires util plugin
     */

    const utilService = new Service_1();

    utilService.post('*', onRequest);
    utilService.get(':service', getStatus);

    function getStatus(context, tokens, query, body) {
        return context.util[context.params.service];
    }

    function onRequest(context, tokens, query, body) {
        Object.entries(body).forEach(([k, v]) => {
            console.log(`${k} ${v ? 'enabled' : 'disabled'}`);
            context.util[k] = v;
        });
        return '';
    }

    var util$1 = utilService.parseRequest;

    var services = {
        jsonstore,
        users,
        data: data$1,
        favicon,
        admin,
        util: util$1
    };

    const { uuid: uuid$2 } = util;


    function initPlugin(settings) {
        const storage = createInstance(settings.seedData);
        const protectedStorage = createInstance(settings.protectedData);

        return function decoreateContext(context, request) {
            context.storage = storage;
            context.protectedStorage = protectedStorage;
        };
    }


    /**
     * Create storage instance and populate with seed data
     * @param {Object=} seedData Associative array with data. Each property is an object with properties in format {key: value}
     */
    function createInstance(seedData = {}) {
        const collections = new Map();

        // Initialize seed data from file    
        for (let collectionName in seedData) {
            if (seedData.hasOwnProperty(collectionName)) {
                const collection = new Map();
                for (let recordId in seedData[collectionName]) {
                    if (seedData.hasOwnProperty(collectionName)) {
                        collection.set(recordId, seedData[collectionName][recordId]);
                    }
                }
                collections.set(collectionName, collection);
            }
        }


        // Manipulation

        /**
         * Get entry by ID or list of all entries from collection or list of all collections
         * @param {string=} collection Name of collection to access. Throws error if not found. If omitted, returns list of all collections.
         * @param {number|string=} id ID of requested entry. Throws error if not found. If omitted, returns of list all entries in collection.
         * @return {Object} Matching entry.
         */
        function get(collection, id) {
            if (!collection) {
                return [...collections.keys()];
            }
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!id) {
                const entries = [...targetCollection.entries()];
                let result = entries.map(([k, v]) => {
                    return Object.assign(deepCopy(v), { _id: k });
                });
                return result;
            }
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            const entry = targetCollection.get(id);
            return Object.assign(deepCopy(entry), { _id: id });
        }

        /**
         * Add new entry to collection. ID will be auto-generated
         * @param {string} collection Name of collection to access. If the collection does not exist, it will be created.
         * @param {Object} data Value to store.
         * @return {Object} Original value with resulting ID under _id property.
         */
        function add(collection, data) {
            const record = assignClean({ _ownerId: data._ownerId }, data);

            let targetCollection = collections.get(collection);
            if (!targetCollection) {
                targetCollection = new Map();
                collections.set(collection, targetCollection);
            }
            let id = uuid$2();
            // Make sure new ID does not match existing value
            while (targetCollection.has(id)) {
                id = uuid$2();
            }

            record._createdOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Replace entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Record will be replaced!
         * @return {Object} Updated entry.
         */
        function set(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = targetCollection.get(id);
            const record = assignSystemProps(deepCopy(data), existing);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Modify entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Shallow merge will be performed!
         * @return {Object} Updated entry.
         */
        function merge(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = deepCopy(targetCollection.get(id));
            const record = assignClean(existing, data);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Delete entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @return {{_deletedOn: number}} Server time of deletion.
         */
        function del(collection, id) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            targetCollection.delete(id);

            return { _deletedOn: Date.now() };
        }

        /**
         * Search in collection by query object
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {Object} query Query object. Format {prop: value}.
         * @return {Object[]} Array of matching entries.
         */
        function query(collection, query) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            const result = [];
            // Iterate entries of target collection and compare each property with the given query
            for (let [key, entry] of [...targetCollection.entries()]) {
                let match = true;
                for (let prop in entry) {
                    if (query.hasOwnProperty(prop)) {
                        const targetValue = query[prop];
                        // Perform lowercase search, if value is string
                        if (typeof targetValue === 'string' && typeof entry[prop] === 'string') {
                            if (targetValue.toLocaleLowerCase() !== entry[prop].toLocaleLowerCase()) {
                                match = false;
                                break;
                            }
                        } else if (targetValue != entry[prop]) {
                            match = false;
                            break;
                        }
                    }
                }

                if (match) {
                    result.push(Object.assign(deepCopy(entry), { _id: key }));
                }
            }

            return result;
        }

        return { get, add, set, merge, delete: del, query };
    }


    function assignSystemProps(target, entry, ...rest) {
        const whitelist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let prop of whitelist) {
            if (entry.hasOwnProperty(prop)) {
                target[prop] = deepCopy(entry[prop]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }


    function assignClean(target, entry, ...rest) {
        const blacklist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let key in entry) {
            if (blacklist.includes(key) == false) {
                target[key] = deepCopy(entry[key]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }

    function deepCopy(value) {
        if (Array.isArray(value)) {
            return value.map(deepCopy);
        } else if (typeof value == 'object') {
            return [...Object.entries(value)].reduce((p, [k, v]) => Object.assign(p, { [k]: deepCopy(v) }), {});
        } else {
            return value;
        }
    }

    var storage = initPlugin;

    const { ConflictError: ConflictError$1, CredentialError: CredentialError$1, RequestError: RequestError$2 } = errors;

    function initPlugin$1(settings) {
        const identity = settings.identity;

        return function decorateContext(context, request) {
            context.auth = {
                register,
                login,
                logout
            };

            const userToken = request.headers['x-authorization'];
            if (userToken !== undefined) {
                let user;
                const session = findSessionByToken(userToken);
                if (session !== undefined) {
                    const userData = context.protectedStorage.get('users', session.userId);
                    if (userData !== undefined) {
                        console.log('Authorized as ' + userData[identity]);
                        user = userData;
                    }
                }
                if (user !== undefined) {
                    context.user = user;
                } else {
                    throw new CredentialError$1('Invalid access token');
                }
            }

            function register(body) {
                if (body.hasOwnProperty(identity) === false ||
                    body.hasOwnProperty('password') === false ||
                    body[identity].length == 0 ||
                    body.password.length == 0) {
                    throw new RequestError$2('Missing fields');
                } else if (context.protectedStorage.query('users', { [identity]: body[identity] }).length !== 0) {
                    throw new ConflictError$1(`A user with the same ${identity} already exists`);
                } else {
                    const newUser = Object.assign({}, body, {
                        [identity]: body[identity],
                        hashedPassword: hash(body.password)
                    });
                    const result = context.protectedStorage.add('users', newUser);
                    delete result.hashedPassword;

                    const session = saveSession(result._id);
                    result.accessToken = session.accessToken;

                    return result;
                }
            }

            function login(body) {
                const targetUser = context.protectedStorage.query('users', { [identity]: body[identity] });
                if (targetUser.length == 1) {
                    if (hash(body.password) === targetUser[0].hashedPassword) {
                        const result = targetUser[0];
                        delete result.hashedPassword;

                        const session = saveSession(result._id);
                        result.accessToken = session.accessToken;

                        return result;
                    } else {
                        throw new CredentialError$1('Login or password don\'t match');
                    }
                } else {
                    throw new CredentialError$1('Login or password don\'t match');
                }
            }

            function logout() {
                if (context.user !== undefined) {
                    const session = findSessionByUserId(context.user._id);
                    if (session !== undefined) {
                        context.protectedStorage.delete('sessions', session._id);
                    }
                } else {
                    throw new CredentialError$1('User session does not exist');
                }
            }

            function saveSession(userId) {
                let session = context.protectedStorage.add('sessions', { userId });
                const accessToken = hash(session._id);
                session = context.protectedStorage.set('sessions', session._id, Object.assign({ accessToken }, session));
                return session;
            }

            function findSessionByToken(userToken) {
                return context.protectedStorage.query('sessions', { accessToken: userToken })[0];
            }

            function findSessionByUserId(userId) {
                return context.protectedStorage.query('sessions', { userId })[0];
            }
        };
    }


    const secret = 'This is not a production server';

    function hash(string) {
        const hash = crypto__default['default'].createHmac('sha256', secret);
        hash.update(string);
        return hash.digest('hex');
    }

    var auth = initPlugin$1;

    function initPlugin$2(settings) {
        const util = {
            throttle: false
        };

        return function decoreateContext(context, request) {
            context.util = util;
        };
    }

    var util$2 = initPlugin$2;

    /*
     * This plugin requires auth and storage plugins
     */

    const { RequestError: RequestError$3, ConflictError: ConflictError$2, CredentialError: CredentialError$2, AuthorizationError: AuthorizationError$2 } = errors;

    function initPlugin$3(settings) {
        const actions = {
            'GET': '.read',
            'POST': '.create',
            'PUT': '.update',
            'PATCH': '.update',
            'DELETE': '.delete'
        };
        const rules = Object.assign({
            '*': {
                '.create': ['User'],
                '.update': ['Owner'],
                '.delete': ['Owner']
            }
        }, settings.rules);

        return function decorateContext(context, request) {
            // special rules (evaluated at run-time)
            const get = (collectionName, id) => {
                return context.storage.get(collectionName, id);
            };
            const isOwner = (user, object) => {
                return user._id == object._ownerId;
            };
            context.rules = {
                get,
                isOwner
            };
            const isAdmin = request.headers.hasOwnProperty('x-admin');

            context.canAccess = canAccess;

            function canAccess(data, newData) {
                const user = context.user;
                const action = actions[request.method];
                let { rule, propRules } = getRule(action, context.params.collection, data);

                if (Array.isArray(rule)) {
                    rule = checkRoles(rule, data);
                } else if (typeof rule == 'string') {
                    rule = !!(eval(rule));
                }
                if (!rule && !isAdmin) {
                    throw new CredentialError$2();
                }
                propRules.map(r => applyPropRule(action, r, user, data, newData));
            }

            function applyPropRule(action, [prop, rule], user, data, newData) {
                // NOTE: user needs to be in scope for eval to work on certain rules
                if (typeof rule == 'string') {
                    rule = !!eval(rule);
                }

                if (rule == false) {
                    if (action == '.create' || action == '.update') {
                        delete newData[prop];
                    } else if (action == '.read') {
                        delete data[prop];
                    }
                }
            }

            function checkRoles(roles, data, newData) {
                if (roles.includes('Guest')) {
                    return true;
                } else if (!context.user && !isAdmin) {
                    throw new AuthorizationError$2();
                } else if (roles.includes('User')) {
                    return true;
                } else if (context.user && roles.includes('Owner')) {
                    return context.user._id == data._ownerId;
                } else {
                    return false;
                }
            }
        };



        function getRule(action, collection, data = {}) {
            let currentRule = ruleOrDefault(true, rules['*'][action]);
            let propRules = [];

            // Top-level rules for the collection
            const collectionRules = rules[collection];
            if (collectionRules !== undefined) {
                // Top-level rule for the specific action for the collection
                currentRule = ruleOrDefault(currentRule, collectionRules[action]);

                // Prop rules
                const allPropRules = collectionRules['*'];
                if (allPropRules !== undefined) {
                    propRules = ruleOrDefault(propRules, getPropRule(allPropRules, action));
                }

                // Rules by record id 
                const recordRules = collectionRules[data._id];
                if (recordRules !== undefined) {
                    currentRule = ruleOrDefault(currentRule, recordRules[action]);
                    propRules = ruleOrDefault(propRules, getPropRule(recordRules, action));
                }
            }

            return {
                rule: currentRule,
                propRules
            };
        }

        function ruleOrDefault(current, rule) {
            return (rule === undefined || rule.length === 0) ? current : rule;
        }

        function getPropRule(record, action) {
            const props = Object
                .entries(record)
                .filter(([k]) => k[0] != '.')
                .filter(([k, v]) => v.hasOwnProperty(action))
                .map(([k, v]) => [k, v[action]]);

            return props;
        }
    }

    var rules = initPlugin$3;

    var identity = "email";
    var protectedData = {
        users: {
            "35c62d76-8152-4626-8712-eeb96381bea8": {
                email: "peter@abv.bg",
                username: "Peter",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1"
            },
            "847ec027-f659-4086-8032-5173e2f9c93a": {
                email: "george@abv.bg",
                username: "George",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1"
            },
            "60f0cf0b-34b0-4abd-9769-8c42f830dffc": {
                email: "admin@abv.bg",
                username: "Admin",
                hashedPassword: "fac7060c3e17e6f151f247eacb2cd5ae80b8c36aedb8764e18a41bbdc16aa302"
            }
        },
        sessions: {
        }
    };
    var seedData = {
        appliances: {
            "17bfe2b8-488f-45c3-9606-af1ff81335ef": {
                _ownerId: "c9d5869b-5c82-4eb6-a60d-5451cbef13a5",
                image: "data:image/jpeg;base64,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",
                title: "Washing Machine",
                brand: "Bosch",
                price: "549.99",
                description: "Introducing the Bosch Washing Machine, designed to effortlessly handle your laundry needs with precision and ease. Built for efficiency and reliability, this washing machine is the perfect blend of advanced technology and user-friendly features.",
                _createdOn: 1721401199744,
                _id: "17bfe2b8-488f-45c3-9606-af1ff81335ef"
            },
            "198411db-64ce-44e4-b15d-977219608893": {
                _ownerId: "c9d5869b-5c82-4eb6-a60d-5451cbef13a5",
                image: "data:image/jpeg;base64,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",
                title: "Oven",
                brand: "Beko",
                price: "244.99",
                description: "Transform your kitchen into a culinary haven with the MasterChef 5000 Electric Convection Oven. Perfect for aspiring chefs and seasoned cooks alike, this oven combines cutting-edge technology with intuitive design to elevate your cooking experience.",
                _createdOn: 1721401370166,
                _id: "198411db-64ce-44e4-b15d-977219608893"
            },
            "16f4182e-fc8f-4253-a478-049344c1f162": {
                _ownerId: "c9d5869b-5c82-4eb6-a60d-5451cbef13a5",
                image: "data:image/jpeg;base64,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",
                title: "Dishwasher",
                brand: "Miele",
                price: "269.99",
                description: "Simplify your kitchen cleanup with the SparkleClean 3000 Series Dishwasher, a powerhouse appliance designed to handle your dishes with efficiency and style. Engineered with advanced technology and user-friendly features, this dishwasher promises to revolutionize the way you clean.",
                _createdOn: 1721401461765,
                _id: "16f4182e-fc8f-4253-a478-049344c1f162"
            }
        },
        recipes: {
            "3987279d-0ad4-4afb-8ca9-5b256ae3b298": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                name: "Easy Lasagna",
                img: "assets/lasagna.jpg",
                ingredients: [
                    "1 tbsp Ingredient 1",
                    "2 cups Ingredient 2",
                    "500 g  Ingredient 3",
                    "25 g Ingredient 4"
                ],
                steps: [
                    "Prepare ingredients",
                    "Mix ingredients",
                    "Cook until done"
                ],
                _createdOn: 1613551279012
            },
            "8f414b4f-ab39-4d36-bedb-2ad69da9c830": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                name: "Grilled Duck Fillet",
                img: "assets/roast.jpg",
                ingredients: [
                    "500 g  Ingredient 1",
                    "3 tbsp Ingredient 2",
                    "2 cups Ingredient 3"
                ],
                steps: [
                    "Prepare ingredients",
                    "Mix ingredients",
                    "Cook until done"
                ],
                _createdOn: 1613551344360
            },
            "985d9eab-ad2e-4622-a5c8-116261fb1fd2": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                name: "Roast Trout",
                img: "assets/fish.jpg",
                ingredients: [
                    "4 cups Ingredient 1",
                    "1 tbsp Ingredient 2",
                    "1 tbsp Ingredient 3",
                    "750 g  Ingredient 4",
                    "25 g Ingredient 5"
                ],
                steps: [
                    "Prepare ingredients",
                    "Mix ingredients",
                    "Cook until done"
                ],
                _createdOn: 1613551388703
            }
        },
        comments: {
            "4f41657e-c46c-42e3-917c-865d79467939": {
                _ownerId: "1754521e-ed51-46a1-b5a8-ee0f82e9cc3a",
                applianceId: "17bfe2b8-488f-45c3-9606-af1ff81335ef",
                username: "Pesho",
                text: "I purchased this washing machine a few weeks ago, and I couldn’t be happier with my choice! It provides the perfect balance of performance and convenience.",
                _createdOn: 1722876298396,
                _id: "4f41657e-c46c-42e3-917c-865d79467939"
            },
            "dbaedc90-9ed2-48ca-8a94-6314fc8d8816": {
                _ownerId: "1754521e-ed51-46a1-b5a8-ee0f82e9cc3a",
                applianceId: "198411db-64ce-44e4-b15d-977219608893",
                username: "Peter",
                text: "I’ve been using this oven for a few months now, and it has exceeded my expectations. It combines modern features with user-friendly controls, making it a fantastic addition to my kitchen.",
                _createdOn: 1722876428619,
                _id: "dbaedc90-9ed2-48ca-8a94-6314fc8d8816"
            },
            "a4e64e0b-9af9-48f4-b41e-7ef3dc360063": {
                _ownerId: "1754521e-ed51-46a1-b5a8-ee0f82e9cc3a",
                applianceId: "198411db-64ce-44e4-b15d-977219608893",
                username: "Ivaylo",
                text: "Peter I’ve been considering this oven for a while and your insights are really helpful. I especially appreciate your mention of the even cooking and easy-to-clean features.",
                replyToId: "dbaedc90-9ed2-48ca-8a94-6314fc8d8816",
                _createdOn: 1722876454044,
                _id: "a4e64e0b-9af9-48f4-b41e-7ef3dc360063"
            }
        },
        records: {
            i01: {
                name: "John1",
                val: 1,
                _createdOn: 1613551388703
            },
            i02: {
                name: "John2",
                val: 1,
                _createdOn: 1613551388713
            },
            i03: {
                name: "John3",
                val: 2,
                _createdOn: 1613551388723
            },
            i04: {
                name: "John4",
                val: 2,
                _createdOn: 1613551388733
            },
            i05: {
                name: "John5",
                val: 2,
                _createdOn: 1613551388743
            },
            i06: {
                name: "John6",
                val: 3,
                _createdOn: 1613551388753
            },
            i07: {
                name: "John7",
                val: 3,
                _createdOn: 1613551388763
            },
            i08: {
                name: "John8",
                val: 2,
                _createdOn: 1613551388773
            },
            i09: {
                name: "John9",
                val: 3,
                _createdOn: 1613551388783
            },
            i10: {
                name: "John10",
                val: 1,
                _createdOn: 1613551388793
            }
        },
        catches: {
            "07f260f4-466c-4607-9a33-f7273b24f1b4": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                angler: "Paulo Admorim",
                weight: 636,
                species: "Atlantic Blue Marlin",
                location: "Vitoria, Brazil",
                bait: "trolled pink",
                captureTime: 80,
                _createdOn: 1614760714812,
                _id: "07f260f4-466c-4607-9a33-f7273b24f1b4"
            },
            "bdabf5e9-23be-40a1-9f14-9117b6702a9d": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                angler: "John Does",
                weight: 554,
                species: "Atlantic Blue Marlin",
                location: "Buenos Aires, Argentina",
                bait: "trolled pink",
                captureTime: 120,
                _createdOn: 1614760782277,
                _id: "bdabf5e9-23be-40a1-9f14-9117b6702a9d"
            }
        },
        furniture: {
        },
        orders: {
        },
        movies: {
            "1240549d-f0e0-497e-ab99-eb8f703713d7": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "Black Widow",
                description: "Natasha Romanoff aka Black Widow confronts the darker parts of her ledger when a dangerous conspiracy with ties to her past arises. Comes on the screens 2020.",
                img: "https://miro.medium.com/max/735/1*akkAa2CcbKqHsvqVusF3-w.jpeg",
                _createdOn: 1614935055353,
                _id: "1240549d-f0e0-497e-ab99-eb8f703713d7"
            },
            "143e5265-333e-4150-80e4-16b61de31aa0": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "Wonder Woman 1984",
                description: "Diana must contend with a work colleague and businessman, whose desire for extreme wealth sends the world down a path of destruction, after an ancient artifact that grants wishes goes missing.",
                img: "https://pbs.twimg.com/media/ETINgKwWAAAyA4r.jpg",
                _createdOn: 1614935181470,
                _id: "143e5265-333e-4150-80e4-16b61de31aa0"
            },
            "a9bae6d8-793e-46c4-a9db-deb9e3484909": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "Top Gun 2",
                description: "After more than thirty years of service as one of the Navy's top aviators, Pete Mitchell is where he belongs, pushing the envelope as a courageous test pilot and dodging the advancement in rank that would ground him.",
                img: "https://i.pinimg.com/originals/f2/a4/58/f2a458048757bc6914d559c9e4dc962a.jpg",
                _createdOn: 1614935268135,
                _id: "a9bae6d8-793e-46c4-a9db-deb9e3484909"
            }
        },
        likes: {
        },
        ideas: {
            "833e0e57-71dc-42c0-b387-0ce0caf5225e": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "Best Pilates Workout To Do At Home",
                description: "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Minima possimus eveniet ullam aspernatur corporis tempore quia nesciunt nostrum mollitia consequatur. At ducimus amet aliquid magnam nulla sed totam blanditiis ullam atque facilis corrupti quidem nisi iusto saepe, consectetur culpa possimus quos? Repellendus, dicta pariatur! Delectus, placeat debitis error dignissimos nesciunt magni possimus quo nulla, fuga corporis maxime minus nihil doloremque aliquam quia recusandae harum. Molestias dolorum recusandae commodi velit cum sapiente placeat alias rerum illum repudiandae? Suscipit tempore dolore autem, neque debitis quisquam molestias officia hic nesciunt? Obcaecati optio fugit blanditiis, explicabo odio at dicta asperiores distinctio expedita dolor est aperiam earum! Molestias sequi aliquid molestiae, voluptatum doloremque saepe dignissimos quidem quas harum quo. Eum nemo voluptatem hic corrupti officiis eaque et temporibus error totam numquam sequi nostrum assumenda eius voluptatibus quia sed vel, rerum, excepturi maxime? Pariatur, provident hic? Soluta corrupti aspernatur exercitationem vitae accusantium ut ullam dolor quod!",
                img: "./images/best-pilates-youtube-workouts-2__medium_4x3.jpg",
                _createdOn: 1615033373504,
                _id: "833e0e57-71dc-42c0-b387-0ce0caf5225e"
            },
            "247efaa7-8a3e-48a7-813f-b5bfdad0f46c": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                title: "4 Eady DIY Idea To Try!",
                description: "Similique rem culpa nemo hic recusandae perspiciatis quidem, quia expedita, sapiente est itaque optio enim placeat voluptates sit, fugit dignissimos tenetur temporibus exercitationem in quis magni sunt vel. Corporis officiis ut sapiente exercitationem consectetur debitis suscipit laborum quo enim iusto, labore, quod quam libero aliquid accusantium! Voluptatum quos porro fugit soluta tempore praesentium ratione dolorum impedit sunt dolores quod labore laudantium beatae architecto perspiciatis natus cupiditate, iure quia aliquid, iusto modi esse!",
                img: "./images/brightideacropped.jpg",
                _createdOn: 1615033452480,
                _id: "247efaa7-8a3e-48a7-813f-b5bfdad0f46c"
            },
            "b8608c22-dd57-4b24-948e-b358f536b958": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                title: "Dinner Recipe",
                description: "Consectetur labore et corporis nihil, officiis tempora, hic ex commodi sit aspernatur ad minima? Voluptas nesciunt, blanditiis ex nulla incidunt facere tempora laborum ut aliquid beatae obcaecati quidem reprehenderit consequatur quis iure natus quia totam vel. Amet explicabo quidem repellat unde tempore et totam minima mollitia, adipisci vel autem, enim voluptatem quasi exercitationem dolor cum repudiandae dolores nostrum sit ullam atque dicta, tempora iusto eaque! Rerum debitis voluptate impedit corrupti quibusdam consequatur minima, earum asperiores soluta. A provident reiciendis voluptates et numquam totam eveniet! Dolorum corporis libero dicta laborum illum accusamus ullam?",
                img: "./images/dinner.jpg",
                _createdOn: 1615033491967,
                _id: "b8608c22-dd57-4b24-948e-b358f536b958"
            }
        },
        catalog: {
            "53d4dbf5-7f41-47ba-b485-43eccb91cb95": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                make: "Table",
                model: "Swedish",
                year: 2015,
                description: "Medium table",
                price: 235,
                img: "./images/table.png",
                material: "Hardwood",
                _createdOn: 1615545143015,
                _id: "53d4dbf5-7f41-47ba-b485-43eccb91cb95"
            },
            "f5929b5c-bca4-4026-8e6e-c09e73908f77": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                make: "Sofa",
                model: "ES-549-M",
                year: 2018,
                description: "Three-person sofa, blue",
                price: 1200,
                img: "./images/sofa.jpg",
                material: "Frame - steel, plastic; Upholstery - fabric",
                _createdOn: 1615545572296,
                _id: "f5929b5c-bca4-4026-8e6e-c09e73908f77"
            },
            "c7f51805-242b-45ed-ae3e-80b68605141b": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                make: "Chair",
                model: "Bright Dining Collection",
                year: 2017,
                description: "Dining chair",
                price: 180,
                img: "./images/chair.jpg",
                material: "Wood laminate; leather",
                _createdOn: 1615546332126,
                _id: "c7f51805-242b-45ed-ae3e-80b68605141b"
            }
        },
        teams: {
            "34a1cab1-81f1-47e5-aec3-ab6c9810efe1": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                name: "Storm Troopers",
                logoUrl: "/assets/atat.png",
                description: "These ARE the droids we're looking for",
                _createdOn: 1615737591748,
                _id: "34a1cab1-81f1-47e5-aec3-ab6c9810efe1"
            },
            "dc888b1a-400f-47f3-9619-07607966feb8": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                name: "Team Rocket",
                logoUrl: "/assets/rocket.png",
                description: "Gotta catch 'em all!",
                _createdOn: 1615737655083,
                _id: "dc888b1a-400f-47f3-9619-07607966feb8"
            },
            "733fa9a1-26b6-490d-b299-21f120b2f53a": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                name: "Minions",
                logoUrl: "/assets/hydrant.png",
                description: "Friendly neighbourhood jelly beans, helping evil-doers succeed.",
                _createdOn: 1615737688036,
                _id: "733fa9a1-26b6-490d-b299-21f120b2f53a"
            }
        },
        members: {
            "cc9b0a0f-655d-45d7-9857-0a61c6bb2c4d": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                teamId: "34a1cab1-81f1-47e5-aec3-ab6c9810efe1",
                status: "member",
                _createdOn: 1616236790262,
                _updatedOn: 1616236792930
            },
            "61a19986-3b86-4347-8ca4-8c074ed87591": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                teamId: "dc888b1a-400f-47f3-9619-07607966feb8",
                status: "member",
                _createdOn: 1616237188183,
                _updatedOn: 1616237189016
            },
            "8a03aa56-7a82-4a6b-9821-91349fbc552f": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                teamId: "733fa9a1-26b6-490d-b299-21f120b2f53a",
                status: "member",
                _createdOn: 1616237193355,
                _updatedOn: 1616237195145
            },
            "9be3ac7d-2c6e-4d74-b187-04105ab7e3d6": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                teamId: "dc888b1a-400f-47f3-9619-07607966feb8",
                status: "member",
                _createdOn: 1616237231299,
                _updatedOn: 1616237235713
            },
            "280b4a1a-d0f3-4639-aa54-6d9158365152": {
                _ownerId: "60f0cf0b-34b0-4abd-9769-8c42f830dffc",
                teamId: "dc888b1a-400f-47f3-9619-07607966feb8",
                status: "member",
                _createdOn: 1616237257265,
                _updatedOn: 1616237278248
            },
            "e797fa57-bf0a-4749-8028-72dba715e5f8": {
                _ownerId: "60f0cf0b-34b0-4abd-9769-8c42f830dffc",
                teamId: "34a1cab1-81f1-47e5-aec3-ab6c9810efe1",
                status: "member",
                _createdOn: 1616237272948,
                _updatedOn: 1616237293676
            }
        }
    };
    var rules$1 = {
        users: {
            ".create": false,
            ".read": [
                "Owner"
            ],
            ".update": false,
            ".delete": false
        },
        members: {
            ".update": "isOwner(user, get('teams', data.teamId))",
            ".delete": "isOwner(user, get('teams', data.teamId)) || isOwner(user, data)",
            "*": {
                teamId: {
                    ".update": "newData.teamId = data.teamId"
                },
                status: {
                    ".create": "newData.status = 'pending'"
                }
            }
        }
    };
    var settings = {
        identity: identity,
        protectedData: protectedData,
        seedData: seedData,
        rules: rules$1
    };

    const plugins = [
        storage(settings),
        auth(settings),
        util$2(),
        rules(settings)
    ];

    const server = http__default['default'].createServer(requestHandler(plugins, services));

    const port = 3030;
    server.listen(port);
    console.log(`Server started on port ${port}. You can make requests to http://localhost:${port}/`);
    console.log(`Admin panel located at http://localhost:${port}/admin`);

    var softuniPracticeServer = {

    };

    return softuniPracticeServer;

})));
