'use strict';
const path = require("path")
const fs = require("fs")
const userhome = require("userhome")
const inquirer = require("inquirer")
const simpleGit = require('simple-git');
const terminalLink = require('terminal-link')
const fse = require("fs-extra")
const log = require("@aotu-cli/log")
const { readFile, writeFile } = require("@aotu-cli/utils")
const GitHub = require("./Github")
const Gitee = require('./Gitee')

const CLI_HOME_PATH = ".aotu-cli";
const GIT_ROOT_DIR = ".git"
const GIT_SERVER_FILE = ".git_server";
const GIT_TOKEN_FILE = ".git_token";
const GITHUB = "GitHub"
const GITEE = "Gitee"
const GIT_SERVER_TYPES = [{
    name: "GitHub",
    value: GITHUB
}, {
    name: "Gitee",
    value: GITEE
}]

class Git {
    constructor({ name, version, dir }, { refreshServer = false, refreshToken = false }) {
        this.name = name;
        this.version = version;
        this.dir = dir;
        this.git = simpleGit(dir);
        this.gitServer = null;
        this.homePath = null;
        this.user = null;
        this.orgs = null;
        this.refreshServer = refreshServer;
        this.refreshToken = refreshToken
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
