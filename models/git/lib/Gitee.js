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
        return this.request.get('/user').then(response => {
            return this.handleResponse(response);
        });
    }

    /**
     * 获取用户所属组织 
     * @returns 
     */
    getOrgs = () => {
        return this.request.get('/user/orgs', {
            page: 1,
            per_page: 100,
            admin: true,
        }).then(response => {
            return this.handleResponse(response);
        });
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
    getSSHKeysUrl = () => {
        return "https://gitee.com/profile/sshkeys";
    };

    getTokenHelpUrl = () => {
        return "https://gitee.com/personal_access_tokens"
    };

    getSSHKeysHelpUrl = () => {
        return 'https://gitee.com/help/articles/4191';
    };
}
module.exports = Gitee