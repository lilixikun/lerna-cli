class GitServer {
    constructor(type, token) {
        this.type = type;
        this.token = token;
    }

    setToken(token) {
        this.token = token
    }
    createRepo() { }
    createOrgRepo() { }
    getRemote() { }
    getUser() { }
    getOrg() { }

    getSSHKeyUrl() { }
    getTokenUrl() {
        return "https://sindresorhus.com"
    }
}
module.exports = GitServer