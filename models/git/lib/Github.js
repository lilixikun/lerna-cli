const GitServer = require('./GitServer')
const GithubRequest = require('./GithubRequest')

class GitHub extends GitServer {
    constructor() {
        super("github")
    }

    setToken(token) {
        super.setToken(token);
        this.request = new GithubRequest(token);
    }

    getUser() {
        return this.request.get("/user")
    }

    /**
     * 获取用户所属组织
     * @param {*} username 
     * @returns 
     */
    getOrg() {
        return this.request.get(`/user/orgs`)
    }
    getSSHKeyUrl() {
        return "https://github.com/settings/keys";
    }
    getTokenUrl() {
        return "https://github.com/settings/tokens"
    }
}
module.exports = GitHub