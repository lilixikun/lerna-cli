class GitServer {
    constructor(type, token) {
        this.type = type;
        this.token = token;
    }

    setToken() { }
    createRepo() { }
    createOrgRepo() { }
    getRemote() { }
    getUser() { }
    getOrg() { }
}
module.exports = GitServer