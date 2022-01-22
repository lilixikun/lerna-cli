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
        }, {
            Accept: 'application/vnd.github.v3+json',
        });
    };


    /**
     * 创建组织仓库
     * @param {*} repo 
     * @param {*} login 
     * @returns 
     */
    createOrgRepo = (repo, login) => {
        return this.request.post('/orgs/' + login + '/repos', {
            name: repo,
        }, {
            Accept: 'application/vnd.github.v3+json',
        });
    };

    getRemote = (login, repo) => {
        return `git@github.com:${login}/${repo}.git`;
    };

    getSSHKeysUrl = () => {
        return 'https://github.com/settings/keys';
    };

    getTokenHelpUrl() {
        return "https://github.com/settings/tokens"
    };

    getSSHKeysHelpUrl = () => {
        return 'https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/connecting-to-github-with-ssh';
    };
}
module.exports = GitHub