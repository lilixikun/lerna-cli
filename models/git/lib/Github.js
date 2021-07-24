const GitServer = require('./GitServer')

class GitHub extends GitServer {
    constructor() {
        super("github")
    }
}
module.exports = GitHub