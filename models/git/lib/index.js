'use strict';
const path = require("path")
const fs = require("fs")
const userhome = require("userhome")
const inquirer = require("inquirer")
const simpleGit = require('simple-git');
const terminalLink = require('terminal-link')
const fse = require("fs-extra")
const log = require("@aotu-cli/log")
const { readFile, writeFile, oraSpinner } = require("@aotu-cli/utils")
const GitHub = require("./Github")
const Gitee = require('./Gitee')

const CLI_HOME_PATH = ".aotu-cli";
const GIT_ROOT_DIR = ".git"
const GIT_SERVER_FILE = ".git_server";
const GIT_TOKEN_FILE = ".git_token";
const GIT_OWN_FILE = ".git_own";
const GIT_LOGIN_FILE = ".git_login";
const REPO_OWNER_USER = 'user'; // 用户仓库
const REPO_OWNER_ORG = 'org'; // 组织仓库

const GITHUB = "GitHub"
const GITEE = "Gitee"
const GIT_SERVER_TYPES = [{
    name: "GitHub",
    value: GITHUB
}, {
    name: "Gitee",
    value: GITEE
}]

const GIT_OWNER_TYPE = [{
    name: '个人',
    value: REPO_OWNER_USER,
}, {
    name: '组织',
    value: REPO_OWNER_ORG,
}];

const GIT_OWNER_TYPE_ONLY = [{
    name: '个人',
    value: REPO_OWNER_USER,
}];

class Git {
    constructor({ name, version, dir }, { refreshServer = false, refreshToken = false, refreshOwner = false }) {
        this.name = name;
        this.version = version;
        this.dir = dir; // 源码目录
        this.git = simpleGit(dir);
        this.gitServer = null;
        this.homePath = null;
        this.user = null; // 用户信息
        this.orgs = null; // 用户所属组织
        this.owner = null; // 远程仓库类型
        this.repo = null; // git 仓库
        this.login = null; // 远程仓库登录名
        this.refreshServer = refreshServer; // 是否强制刷新远程Git类型
        this.refreshToken = refreshToken; // 是否强制刷新远程Gittoken
        this.refreshOwner = refreshOwner; // 强制刷新 owner
        this.prepare();
    }

    async prepare() {
        // 检查用户主目录
        this.checkHomePath()
        // 检查用户远程仓库类型
        await this.checkGitServer()
        // 获取git远程token
        await this.checkGitToken()
        // 获取远程仓库用户和组织信息
        await this.getUserAndOrgs()
        // 检查远程仓库类型
        await this.checkGitOwner()
        // 检测并创建远程仓库
        await this.checkRepo()
    }

    checkHomePath() {
        if (!this.homePath) {
            if (process.env.CLI_HOME_PATH) {
                this.homePath = process.env.CLI_HOME_PATH
            } else {
                this.homePath = path.resolve(userhome, CLI_HOME_PATH)
            }
        }
        fse.ensureDirSync(this.homePath);
        if (!fs.existsSync(this.homePath)) {
            throw new Error("用户主目录获取失败！😭")
        }
    }

    async checkGitServer() {
        const gitServerPath = this.createPath(GIT_SERVER_FILE);
        let gitServer = readFile(gitServerPath)
        // 初次选择托管平台
        if (!gitServer || this.refreshServer) {
            gitServer = (await inquirer.prompt({
                type: "list",
                name: "gitServer",
                message: "请选择你想要托管的Git平台",
                choices: GIT_SERVER_TYPES,
                default: GITHUB,
            })).gitServer
            writeFile(gitServerPath, gitServer)
            log.success("git server 写入成功😊 ", `${gitServer}➡️${gitServerPath}`)
        } else {
            log.success("git server 读取成功😊 ", `${gitServer}`)
        }
        this.gitServer = this.createGitServer(gitServer)
        if (!this.gitServer) {
            throw new Error("GitServer 初始化失败 😭")
        }
    }

    async checkGitToken() {
        const tokenPath = this.createPath(GIT_TOKEN_FILE);
        let token = readFile(tokenPath);
        if (!token || this.refreshToken) {
            log.warn(`${this.gitServer.type} token未生成 😭，请先生成 ${this.gitServer.type} token` + terminalLink('链接🔗', this.gitServer.getTokenUrl()));
            token = (await inquirer.prompt({
                type: "password",
                name: "token",
                message: "请将token复制到这里",
                default: "",
            })).token
            console.log("token", token);
            writeFile(tokenPath, token);
            log.success("token 写入成功😊 ", `${token}➡️${tokenPath}`);
        } else {
            log.success("token 读取成功😊 ", `${tokenPath}`, token);
        }
        this.token = token;
        this.gitServer.setToken(token);
    }

    async getUserAndOrgs() {
        this.user = await this.gitServer.getUser();
        if (!this.user) {
            throw new Error("未获取到当前用户信息 😅")
        }
        this.orgs = await this.gitServer.getOrg(this.user.login);
        if (!this.orgs) {
            throw new Error("未获取到当前用户组织信息 😅")
        }
        console.log(this.user);
        console.log(this.orgs);
        log.success(this.gitServer.type + "用户和组织信息获取成功 😄 ");
    }

    async checkGitOwner() {
        const ownerPath = this.createPath(GIT_OWN_FILE);
        const loginPath = this.createPath(GIT_LOGIN_FILE);
        let owner = readFile(ownerPath);
        let login = readFile(loginPath);
        if (!owner || !login || this.refreshOwner) {
            log.notice(this.gitServer.type + ' owner 未生成，先选择 owner');
            owner = (await inquirer.prompt({
                type: 'list',
                name: "owner",
                choices: this.orgs && this.orgs.length > 0 ? GIT_OWNER_TYPE : GIT_OWNER_TYPE_ONLY,
                message: '请选择远程仓库类型',
                default: ""
            })).owner;
            if (owner === REPO_OWNER_USER) {
                login = this.user.login;
            } else {
                login = (await inquirer.prompt({
                    type: 'list',
                    name: 'login',
                    choices: this.orgs.map(item => ({
                        name: item.login,
                        value: item.login,
                    })),
                    message: '请选择',
                })).login;
            }
            writeFile(ownerPath, owner);
            writeFile(loginPath, login);
            log.success('git owner写入成功', `${owner} -> ${ownerPath}`);
            log.success('git login写入成功', `${login} -> ${loginPath}`);
        } else {
            log.success('git owner 获取成功', owner);
            log.success('git login 获取成功', login);
        }
        this.owner = owner;
        this.login = login;
    }

    async checkRepo() {
        let repo = await this.gitServer.getRepo(this.login, this.name);
        if (!repo) {
            const ora = oraSpinner("开始创建远程仓库...");
            try {
                if (this.owner === REPO_OWNER_USER) {
                    repo = await this.gitServer.createRepo(this.name);
                } else {
                    repo = await this.gitServer.createOrgRepo(this.name, this.login);
                }
            } finally {
                ora.stop();
            }
            if (repo) {
                log.success('远程仓库创建成功');
            } else {
                throw new Error('远程仓库创建失败');
            }
        }
        log.success('远程仓库信息获取成功');
        this.repo = repo;
    }

    createGitServer(gitServer) {
        if (gitServer === GITHUB) {
            return new GitHub()
        } else if (gitServer === GITEE) {
            return new Gitee()
        }
        return null
    }

    createPath(file) {
        const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR);
        const filePath = path.resolve(rootDir, file);
        fse.ensureFileSync(filePath);
        return filePath
    }

    init() {
        // console.log("git init");
    }
}

module.exports = Git;
