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

    getRepo() {

    }
    getSSHKeysUrl() { }

    getTokenHelpUrl() {
        return "https://sindresorhus.com"
    }
    getSSHKeysHelpUrl() { }
    isHttpResponse = (response) => {
        return response && response.status && response.statusText &&
            response.headers && response.data && response.config;
    };

    handleResponse = (response) => {
        if (this.isHttpResponse(response) && response !== 200) {
            return null;
        } else {
            return response;
        }
    };
}
module.exports = GitServer