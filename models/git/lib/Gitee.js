const GitServer = require('./GitServer')
const GiteeRequest = require('./GiteeRequest')

// Gitee OpenApi 详见 https://gitee.com/api/v5/swagger#/getV5ReposOwnerRepoStargazers?ex=no
class Gitee extends GitServer {
    constructor() {
        super("gitee")
        this.request = null
    }

    setToken(token) {
        super.setToken(token);
        this.request = new GiteeRequest(token);
    }

    getUser() {
        return this.request.get("/user")
    }

    /**
     * 获取用户所属组织
     * @param {*} username 
     * @returns 
     */
    getOrg(username) {
        return this.request.get(`/users/${username}/orgs`)
    }

    getSSHKeyUrl() {
        return "https://gitee.com/profile/sshkeys";
    }
    getTokenUrl() {
        return "https://gitee.com/personal_access_tokens"
    }
}
module.exports = Gitee