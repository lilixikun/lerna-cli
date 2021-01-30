'use strict';

const path = require('path')

module.exports = function formatPath(p) {
    if (p && typeof (p) === 'string') {
        const sep = p.sep
        if (sep === '/') {
            return p
        } else {
            return p.replace(/\\/g, '/')
        }
    }
    return p
}
