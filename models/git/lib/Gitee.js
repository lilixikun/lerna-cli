const GitServer = require('./GitServer')
const GiteeRequest = require('./GiteeRequest')

// Gitee OpenApi 详见 https://gitee.com/api/v5/swagger#/getV5ReposOwnerRepoStargazers?ex=no
class Gitee extends GitServer {
    constructor() {
        super("gitee")
        this.request = null
    }

    setToken = (token) => {
        super.setToken(token);
        this.request = new GiteeRequest(token);
    }

    getUser = () => {
        return this.request.get("/user")
    }

    /**
     * 获取用户所属组织
     * @param {*} username 
     * @returns 
     */
    getOrg = (username) => {
        return this.request.get(`/users/${username}/orgs`)
    }

    /**
     * 获取远程仓库
     * @param {*} owner 
     * @param {*} repo 
     */
    getRepo = (owner, repo) => {
        return this.request.get(`/repos/${owner}/${repo}`).then(response => {
            return this.handleResponse(response);
        });
    }

    /**
     * 创建远程仓库
     * @returns 
     */
    createRepo = (repo) => {
        return this.request.post('/user/repos', {
            name: repo,
        });
    };

    /**
     * 创建组织仓库
     * @param {*} repo 
     * @param {*} login 
     * @returns 
     */
    createOrgRepo = (repo, login) => {
        return this.request.post(`/orgs/${login}/repos`, {
            name: repo,
        });
    };

    getRemote = (login, repo) => {
        return `git@gitee.com:${login}/${repo}.git`;
    };
    getSSHKeyUrl = () => {
        return "https://gitee.com/profile/sshkeys";
    }
    getTokenUrl = () => {
        return "https://gitee.com/personal_access_tokens"
    }
}
module.exports = Gitee