"use strict";
const path = require("path");
const fs = require("fs");
const userhome = require("userhome");
const inquirer = require("inquirer");
const simpleGit = require("simple-git");
const semver = require("semver");
const terminalLink = require("terminal-link");
const fse = require("fs-extra");
const log = require("@aotu-cli/log");
const { readFile, writeFile, oraSpinner } = require("@aotu-cli/utils");
const GitHub = require("./Github");
const Gitee = require("./Gitee");

const CLI_HOME_PATH = ".aotu-cli";
const GIT_ROOT_DIR = ".git";
const GIT_SERVER_FILE = ".git_server";
const GIT_TOKEN_FILE = ".git_token";
const GIT_OWN_FILE = ".git_own";
const GIT_LOGIN_FILE = ".git_login";
const GIT_IGNORE_FILE = ".gitignore";
const REPO_OWNER_USER = "user"; // 用户仓库
const REPO_OWNER_ORG = "org"; // 组织仓库

const GITHUB = "GitHub";
const GITEE = "Gitee";

const VERSION_RELEASE = 'release';
const VERSION_DEVELOP = 'dev';

const GIT_SERVER_TYPES = [
    {
        name: "GitHub",
        value: GITHUB,
    },
    {
        name: "Gitee",
        value: GITEE,
    },
];

const GIT_OWNER_TYPE = [
    {
        name: "个人",
        value: REPO_OWNER_USER,
    },
    {
        name: "组织",
        value: REPO_OWNER_ORG,
    },
];

const GIT_OWNER_TYPE_ONLY = [
    {
        name: "个人",
        value: REPO_OWNER_USER,
    },
];

class Git {
    constructor(
        { name, version, dir },
        { refreshServer = false, refreshToken = false, refreshOwner = false }
    ) {
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
        this.branch = null; //本地开发分支
    }

    async prepare() {
        // 检查用户主目录
        this.checkHomePath();
        // 检查用户远程仓库类型
        await this.checkGitServer();
        // 获取git远程token
        await this.checkGitToken();
        // 获取远程仓库用户和组织信息
        await this.getUserAndOrgs();
        // 检查远程仓库类型
        await this.checkGitOwner();
        // 检测并创建远程仓库
        await this.checkRepo();
        // 检查并创建 .gitignore 文件
        this.checkGitIgnore();
        // 完成本地仓库初始化
        await this.init();
    }

    checkHomePath() {
        if (!this.homePath) {
            if (process.env.CLI_HOME_PATH) {
                this.homePath = process.env.CLI_HOME_PATH;
            } else {
                this.homePath = path.resolve(userhome, CLI_HOME_PATH);
            }
        }
        fse.ensureDirSync(this.homePath);
        if (!fs.existsSync(this.homePath)) {
            throw new Error("用户主目录获取失败！😭");
        }
    }

    async checkGitServer() {
        const gitServerPath = this.createPath(GIT_SERVER_FILE);
        let gitServer = readFile(gitServerPath);
        // 初次选择托管平台
        if (!gitServer || this.refreshServer) {
            gitServer = (
                await inquirer.prompt({
                    type: "list",
                    name: "gitServer",
                    message: "请选择你想要托管的Git平台",
                    choices: GIT_SERVER_TYPES,
                    default: GITHUB,
                })
            ).gitServer;
            writeFile(gitServerPath, gitServer);
            log.success("git server 写入成功😊 ", `${gitServer}➡️${gitServerPath}`);
        } else {
            log.success("git server 读取成功😊 ", `${gitServer}`);
        }
        this.gitServer = this.createGitServer(gitServer);
        if (!this.gitServer) {
            throw new Error("GitServer 初始化失败 😭");
        }
    }

    async checkGitToken() {
        const tokenPath = this.createPath(GIT_TOKEN_FILE);
        let token = readFile(tokenPath);
        if (!token || this.refreshToken) {
            log.warn(
                `${this.gitServer.type} token未生成 😭，请先生成 ${this.gitServer.type} token` +
                terminalLink("链接🔗", this.gitServer.getTokenHelpUrl())
            );
            token = (
                await inquirer.prompt({
                    type: "password",
                    name: "token",
                    message: "请将token复制到这里",
                    default: "",
                })
            ).token;
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
        this.orgs = await this.gitServer.getOrgs();
        if (!this.user) {
            throw new Error("用户或组织信息获取失败 😅");
        }
        log.success(this.gitServer.type + "用户和组织信息获取成功 😄 ");
    }

    async checkGitOwner() {
        const ownerPath = this.createPath(GIT_OWN_FILE);
        const loginPath = this.createPath(GIT_LOGIN_FILE);
        let owner = readFile(ownerPath);
        let login = readFile(loginPath);
        if (!owner || !login || this.refreshOwner) {
            log.notice(this.gitServer.type + " owner 未生成，先选择 owner");
            owner = (
                await inquirer.prompt({
                    type: "list",
                    name: "owner",
                    choices:
                        this.orgs && this.orgs.length > 0
                            ? GIT_OWNER_TYPE
                            : GIT_OWNER_TYPE_ONLY,
                    message: "请选择远程仓库类型",
                    default: "",
                })
            ).owner;
            if (owner === REPO_OWNER_USER) {
                login = this.user.login;
            } else {
                login = (
                    await inquirer.prompt({
                        type: "list",
                        name: "login",
                        choices: this.orgs.map((item) => ({
                            name: item.login,
                            value: item.login,
                        })),
                        message: "请选择",
                    })
                ).login;
            }
            writeFile(ownerPath, owner);
            writeFile(loginPath, login);
            log.success("git owner写入成功", `${owner} -> ${ownerPath}`);
            log.success("git login写入成功", `${login} -> ${loginPath}`);
        } else {
            log.success("git owner 获取成功", owner);
            log.success("git login 获取成功", login);
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
                log.success("远程仓库创建成功");
            } else {
                throw new Error("远程仓库创建失败");
            }
        }
        log.success("远程仓库信息获取成功");
        this.repo = repo;
    }

    checkGitIgnore() {
        const gitignore = path.resolve(this.dir, GIT_IGNORE_FILE);
        if (!fs.existsSync(gitignore)) {
            writeFile(
                gitignore,
                `.DS_Store
node_modules
/dist


# local env files
.env.local
.env.*.local

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`
            );
            log.success("写入gitignore成功!");
        }
    }

    createGitServer(gitServer) {
        if (gitServer === GITHUB) {
            return new GitHub();
        } else if (gitServer === GITEE) {
            return new Gitee();
        }
        return null;
    }

    createPath(file) {
        const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR);
        const filePath = path.resolve(rootDir, file);
        fse.ensureFileSync(filePath);
        return filePath;
    }

    async init() {
        if (this.getRemote()) {
            return true;
        }
        await this.initAndAddRemote();
        await this.initCommit();
    }

    async getCorrectVersion() {
        log.notice('获取代码分支');
        // 1. 获取远程发布分支
        const remoteBranchList = await this.getRemoteBranchList(VERSION_RELEASE);
        console.log(remoteBranchList);
        let releaseVersion = null;
        if (remoteBranchList && remoteBranchList.length > 0) {
            // 获取最近的线上版本
            releaseVersion = remoteBranchList[0];
        }
        log.verbose("线上最新版本号", releaseVersion)
        // 2. 生成本地开发分支
        const devVersion = this.version;
        if (!releaseVersion) {
            this.branch = `${VERSION_DEVELOP}/${devVersion}`;
        } else if (semver.gt(this.version, releaseVersion)) {
            log.info('当前版本大于线上最新版本', `${devVersion} >= ${releaseVersion}`);
            this.branch = `${VERSION_DEVELOP}/${devVersion}`;
        } else {
            log.notice('当前线上版本大于或等于本地版本', `${releaseVersion} >= ${devVersion}`);
            const incType = (await inquirer.prompt({
                type: 'list',
                name: 'incType',
                message: "自动升级版本，请选择升级版本类型",
                defaultValue: 'patch',
                choices: [
                    {
                        name: `小版本（${releaseVersion} -> ${semver.inc(releaseVersion, 'patch')}）`,
                        value: 'patch',
                    }, {
                        name: `中版本（${releaseVersion} -> ${semver.inc(releaseVersion, 'minor')}）`,
                        value: 'minor',
                    }, {
                        name: `大版本（${releaseVersion} -> ${semver.inc(releaseVersion, 'major')}）`,
                        value: 'major',
                    }
                ]
            })).incType
            const incVersion = semver.inc(releaseVersion, incType);
            this.branch = `${VERSION_DEVELOP}/${incVersion}`;
            this.version = incVersion;
            this.syncVersionToPackageJson();
        }

        log.verbose("本地开发分支", this.branch);
    }

    syncVersionToPackageJson() {
        const pkg = fse.readJsonSync(`${this.dir}/package.json`);
        if (pkg && pkg.version !== this.version) {
            pkg.version = this.version;
            fse.writeJsonSync(`${this.dir}/package.json`, pkg, { spaces: 2 });
        }
    }

    async getRemoteBranchList(type) {
        // git ls-remote --refs
        const remoteList = await this.git.listRemote(['--refs']);
        let reg;
        // refs/tags/1.0.0
        if (type === VERSION_RELEASE) {
            reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g;
        } else {
            reg = /.+?refs\/heads\/dev\/(\d+\.\d+\.\d+)/g;
        }
        return remoteList.split('\n').map(remote => {
            const match = reg.exec(remote);
            reg.lastIndex = 0; // 制为0从头开始批评 
            if (match && semver.valid(match[1])) {
                return match[1];
            }
        }).filter(_ => _).sort((a, b) => {
            if (semver.lte(b, a)) {
                if (a === b) return 0;
                return -1;
            }
            return 1;
        });
    }

    async commit() {
        // 1.生成开发分支
        await this.getCorrectVersion();
        // 2.检查 stash区
        await this.checkStash();
        // 3.检查代码冲突 (tips:误删除文件可以使用 git checkout -- file 进行还原)
        await this.checkConflicted();
        // 4.切换开发分支
        await this.checkoutBranch(this.branch);
        // 5.合并y远程master分支和开发分支
        await this.pullRemoteMasterAndBranch();
        // 6.将开发分支推送到远程仓库
        await this.pushRemoteRepo(this.branch);
    }

    async checkStash() {
        log.notice('检查 stash 记录');
        const stashList = await this.git.stashList();
        if (stashList.all.length > 0) {
            await this.git.stash(['pop']);
            log.success('stash pop 成功');
        }
    }

    async checkoutBranch() {
        const localBranchList = await this.git.branchLocal();
        if (localBranchList.all.indexOf(branch) >= 0) {
            await this.git.checkout(branch);
        } else {
            await this.git.checkoutLocalBranch(branch);
        }
        log.success(`分支切换到${branch}`);
    }

    async pullRemoteMasterAndBranch() {
        log.notice(`合并 [master] -> [${this.branch}]`);
        await this.pullRemoteRepo('master');
        log.success('合并远程 [master] 分支内容成功');
        await this.checkConflicted();
        log.notice('检查远程分支');
        const remoteBranchList = await this.getRemoteBranchList();
        if (remoteBranchList.indexOf(this.version) >= 0) {
            log.notice(`合并 [${this.branch}] -> [${this.branch}]`);
            await this.pullRemoteRepo(this.branch);
            log.success(`合并远程 [${this.branch}] 分支内容成功`);
            await this.checkConflicted();
        } else {
            log.success(`不存在远程分支 [${this.branch}]`);
        }
    }

    getRemote() {
        const gitPath = path.resolve(this.dir, GIT_ROOT_DIR);
        this.remote = this.gitServer.getRemote(this.login, this.name);
        if (fs.existsSync(gitPath)) {
            log.success('git 已完成初始化');
            return true;
        }
    }

    async initAndAddRemote() {
        log.notice("执行 git 初始化");
        await this.git.init(this.dir);
        log.notice('添加 git remote');
        const remotes = await this.git.getRemotes();
        log.verbose('git remotes', remotes);
        if (!remotes.find(item => item.name === 'origin')) {
            await this.git.addRemote('origin', this.remote);
        }
    }

    async initCommit() {
        await this.checkConflicted();
        await this.checkNotCommitted();
        if (await this.checkRemoteMaster()) {
            log.notice('远程存在 master 分支，强制合并');
            await this.pullRemoteRepo('master', { '--allow-unrelated-histories': null });
        } else {
            await this.pushRemoteRepo('master');
        }
    }

    async checkRemoteMaster() {
        return (await this.git.listRemote(['--refs'])).indexOf('refs/heads/master') >= 0;
    }

    async checkConflicted() {
        log.notice('代码冲突检查');
        const status = await this.git.status();
        if (status.conflicted.length > 0) {
            throw new Error('当前代码存在冲突，请手动处理合并后再试！');
        }
        log.success('代码检查通过');
    }

    async checkNotCommitted() {
        const status = await this.git.status();
        if (status.not_added.length > 0 ||
            status.created.length > 0 ||
            status.deleted.length > 0 ||
            status.modified.length > 0 ||
            status.renamed.length > 0) {
            log.verbose('status', status);
            await this.git.add(status.not_added);
            await this.git.add(status.created);
            await this.git.add(status.deleted);
            await this.git.add(status.modified);
            await this.git.add(status.renamed);
            let message;
            while (!message) {
                message = (await inquirer.prompt({
                    type: 'text',
                    message: '请输入 commit 信息：',
                    defaultValue: '',
                })).message;
            }
            await this.git.commit(message);
            log.success('本地 commit 提交成功');
        }
    }

    async pullRemoteRepo(branchName, options = {}) {
        log.notice(`同步远程 ${branchName} 分支代码`);
        await this.git.pull('origin', branchName, options).catch(err => {
            if (err.message.indexOf('Permission denied (publickey)') >= 0) {
                throw new Error(`请获取本地 ssh publickey 并配置到：${this.gitServer.getSSHKeysUrl()}，配置方法：${this.gitServer.getSSHKeysHelpUrl()}`);
            } else if (err.message.indexOf('Couldn\'t find remote ref ' + branchName) >= 0) {
                log.notice('获取远程 [' + branchName + '] 分支失败');
            } else {
                log.error(err.message);
            }
            log.error('请重新执行 aotu-cli publish，如仍然报错请尝试删除 .git 目录后重试');
            process.exit(0);
        });
    }

    async pushRemoteRepo(branchName) {
        log.notice(`推送代码至远程 ${branchName} 分支`);
        await this.git.push('origin', branchName);
        log.success('推送代码成功');
    };
}

module.exports = Git;
