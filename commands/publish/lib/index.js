'use strict';
const path = require("path")
const fs = require("fs")
const fse = require("fs-extra")
const Command = require("@aotu-cli/command");
const Git = require("@aotu-cli/git");
const log = require("@aotu-cli/log");

class PublishCommand extends Command {
    init() {
        this.options = {
            refreshServer: this._cmd.refreshServer,
            refreshToken: this._cmd.refreshToken,
            refreshOwner: this._cmd.refreshOwner,
            buildCmd: this._cmd.buildCmd
        }
    }
    async exec() {
        try {
            const startTime = new Date().getTime();
            // 1、初始化检查
            this.prepare()
            // 2、Git Flow 自动化
            const git = new Git(this.projectInfo, this.options);
            // 自动化提交准备和代码仓库初始化
            await git.prepare();
            // 代码自动化提交
            await git.commit();
            // 3、云构建和云发布
            await git.publish()
            const endTime = new Date().getTime();
            log.info("本地构建耗时", Math.floor((endTime - startTime) / 1000) + "秒⏰")
        } catch (e) {
            log.error(e.message);
            if (process.env.LOG_LEVEL === "verbose") {
                console.log(e);
            }
        }
    }

    prepare() {
        // 1、检查项目是否是 npm 项目
        const projectPath = process.cwd();
        const pkgPath = path.resolve(projectPath, "package.json");
        if (!fs.existsSync(pkgPath)) {
            throw new Error("package.json 文件不存在")
        }
        // 2、是否包含 name、version、scripts 命令
        const pkg = fse.readJSONSync(pkgPath);
        const { name, version, scripts } = pkg
        if (!name || !version || !scripts || !scripts.build) {
            throw new Error("package.json 信息不全 😭 、请检查是否存在 name、version和scripts（需要提供build命令）!")
        }
        this.projectInfo = {
            name,
            version,
            dir: projectPath
        }
    }
}

function init(argv) {
    return new PublishCommand(argv)
}

module.exports = init;
module.exports.PublishCommand = PublishCommand