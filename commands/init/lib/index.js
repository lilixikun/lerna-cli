'use strict';

const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const inquirer = require('inquirer');
const semver = require('semver');
const userHome = require('user-home')

const Package = require('@aotu-cli/package');
const Command = require('@aotu-cli/command');
const log = require('@aotu-cli/log');
const request = require('@aotu-cli/request')
const { spinnerStart, oraSpinner } = require('@aotu-cli/utils')
const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

class InitCommand extends Command {
    init() {
        this.projectName = this._argv[0] || '';
        this.force = !!this._cmd.force;
        log.verbose('projectName', this.projectName);
        log.verbose('force', this.force);
    }

    async exec() {
        try {
            // 1. 准备阶段
            const projectInfo = await this.prepare();
            if (projectInfo) {
                log.verbose('项目配置信息', projectInfo);
                this.projectInfo = projectInfo;
                // 2. 下载模版
                await this.downloadTemplate()
                // 3. 安装模版
            }
        } catch (e) {
            log.error(e.message);
        }
    }

    async downloadTemplate() {
        const { projectTemplate } = this.projectInfo;
        const templateInfo = this.template.find(item => item.npmName === projectTemplate);
        const targetPath = path.resolve(userHome, '.aotu-cli', 'template');
        const storeDir = path.resolve(userHome, '.aotu-cli', 'template', 'node_modules');
        const { npmName, version } = templateInfo;
        const pkg = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version,
        });
        if (!await pkg.exists()) {
            const ora = oraSpinner('正在下载模板...');
            await sleep();
            try {
                // await pkg.install();
                ora.succeed('下载模版成功!')
            } catch (e) {
                throw e
            } finally {
                ora.stop();
            }
        } else {
            const ora = oraSpinner('正在下载模板...');
            await sleep();
            try {
                await templateNpm.update();
                ora.success('更新模板成功');
            } catch (e) {
                throw e;
            } finally {
                ora.stop();
            }
        }
    }

    async prepare() {
        // 0. 判断模版是否存在
        const template = request();
        if (!template || template.length === 0) {
            throw new Error('模版不存在 😭')
        }
        this.template = template;
        // 1. 判断当前目录是否为空
        const localPath = process.cwd();
        if (!this.isDirEmpty(localPath)) {
            let ifContinue = false;
            if (!this.force) {
                // 询问是否继续创建
                ifContinue = (await inquirer.prompt({
                    type: 'confirm',
                    name: 'ifContinue',
                    default: false,
                    message: '当前文件夹不为空，是否继续创建项目？',
                })).ifContinue;
                if (!ifContinue) {
                    return;
                }
            }
            // 2. 强制创建项目 给出二次提示
            if (ifContinue || this.force) {
                const { confirmDelete } = await (inquirer.prompt(({
                    type: 'confirm',
                    name: 'confirmDelete',
                    default: false,
                    message: '是否确认清空当前目录下的文件？'
                })))
                if (confirmDelete) {
                    // 清空当前目录
                    fse.emptyDirSync(localPath)
                } else {
                    return
                }
            }
        }
        return this.getProjectInfo();
    }

    async getProjectInfo() {
        let projectInfo = {};
        // 1. 选择创建项目/组件
        const { type } = await (inquirer.prompt({
            type: 'list',
            name: 'type',
            message: '请选择初始化类型',
            default: TYPE_PROJECT,
            choices: [{
                name: '项目',
                value: TYPE_PROJECT
            }, {
                name: '组件',
                value: TYPE_COMPONENT
            }],
        }));
        log.verbose('type', type);
        if (type === TYPE_PROJECT) {
            // 2. 获取项目基本信息
            const project = await inquirer.prompt(
                [
                    {
                        type: 'input',
                        name: 'projectName',
                        message: '请输入项目名称!',
                        default: '',
                        validate: function (v) {
                            const done = this.async();
                            setTimeout(function () {
                                // 1.首字符必须为英文字符
                                // 2.尾字符必须为英文或数字，不能为字符
                                // 3.字符仅允许"-_"
                                if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
                                    done('请输入合法的项目名称');
                                    return;
                                }
                                done(null, true);
                            }, 0);
                        },
                        filter: function (v) {
                            return v
                        }
                    },
                    {
                        type: 'input',
                        name: 'projectVersion',
                        message: '请输入项目版本号',
                        default: '1.0.0',
                        validate: function (v) {
                            const done = this.async();
                            setTimeout(function () {
                                if (!(!!semver.valid(v))) {
                                    done('请输入合法的版本号');
                                    return;
                                }
                                done(null, true);
                            }, 0);
                        },
                        filter: function (v) {
                            if (!!semver.valid(v)) {
                                return semver.valid(v);
                            } else {
                                return v
                            }
                        }
                    },
                    {
                        type: 'list',
                        name: 'projectTemplate',
                        message: '请选择项目模板',
                        choices: this.createTemplateChoice()
                    }
                ])
            projectInfo = { type, ...project }
        } else if (type === TYPE_COMPONENT) {

        }
        return projectInfo;
    }

    isDirEmpty(localPath) {
        let fileList = fs.readdirSync(localPath);
        // 文件过滤的逻辑
        fileList = fileList.filter(file => (!file.startsWith('.') && ['node_modules'].indexOf(file) < 0));
        return !fileList || fileList.length <= 0;
    }

    createTemplateChoice() {
        return this.template.map(item => ({
            value: item.npmName,
            name: item.name,
        }));
    }
}

function init(argv) {
    return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;