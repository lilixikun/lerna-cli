"use strict";

const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const semver = require("semver");
const userHome = require("user-home");
const glob = require("glob");
const ejs = require("ejs");

const Package = require("@aotu-cli/package");
const Command = require("@aotu-cli/command");
const log = require("@aotu-cli/log");
const request = require("@aotu-cli/request");
const {
  spinnerStart,
  oraSpinner,
  sleep,
  execAsync,
} = require("@aotu-cli/utils");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";
const WHITE_COMMAND = ["npm", "cnpm", "yarn"];
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose("项目配置信息", projectInfo);
        this.projectInfo = projectInfo;
        // 2. 下载模版
        await this.downloadTemplate();
        // 3. 安装模版
        await this.installTemplate();
      }
    } catch (e) {
      log.error(e.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(e);
      }
    }
  }

  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );
    const targetPath = path.resolve(userHome, ".aotu-cli", "template");
    const storeDir = path.resolve(
      userHome,
      ".aotu-cli",
      "template",
      "node_modules"
    );
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const pkg = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!(await pkg.exists())) {
      const ora = oraSpinner("正在下载模板...");
      await sleep();
      try {
        await pkg.install();
      } catch (e) {
        throw e;
      } finally {
        if (await pkg.exists()) {
          ora.succeed("下载模版成功!");
          this.pkg = pkg;
        }
        ora.stop("下载失败😭");
      }
    } else {
      const ora = oraSpinner("正在更新模板...");
      await sleep();
      try {
        await pkg.update();
      } catch (e) {
        throw e;
      } finally {
        if (await pkg.exists()) {
          ora.succeed("更新模板成功");
          this.pkg = pkg;
        }
      }
    }
  }

  async prepare() {
    // 0. 判断模版是否存在
    const template = request();
    if (!template || template.length === 0) {
      throw new Error("模版不存在 😭");
    }
    this.template = template;
    // 1. 判断当前目录是否为空
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false,
            message: "当前文件夹不为空，是否继续创建项目？",
          })
        ).ifContinue;
        if (!ifContinue) {
          return;
        }
      }
      // 2. 强制创建项目 给出二次提示
      if (ifContinue || this.force) {
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录下的文件？",
        });
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        } else {
          return;
        }
      }
    }
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    // 验证项目名称是否合法
    function isValidName(v) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
        v
      );
    }
    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
    // 1. 选择创建项目/组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    log.verbose("type", type);
    this.template = this.template.filter((item) => item.tag.includes(type));
    const title = type === TYPE_PROJECT ? "项目" : "组件";
    let projectNamePrompt = {
      type: "input",
      name: "projectName",
      message: `请输入${title}名称!`,
      default: "",
      validate: function (v) {
        const done = this.async();
        setTimeout(function () {
          // 1.首字符必须为英文字符
          // 2.尾字符必须为英文或数字，不能为字符
          // 3.字符仅允许"-_"
          if (!isValidName(v)) {
            done(`请输入合法的${title}名称`);
            return;
          }
          done(null, true);
        }, 0);
      },
      filter: function (v) {
        return v;
      },
    };

    const projectPrompt = [];
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push(
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本号`,
        default: "1.0.0",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
            if (!!!semver.valid(v)) {
              done("请输入合法的版本号");
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: function (v) {
          if (!!semver.valid(v)) {
            return semver.valid(v);
          } else {
            return v;
          }
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请选择${title}模板`,
        choices: this.createTemplateChoice(),
      }
    );
    if (type === TYPE_PROJECT) {
      // 2. 获取项目基本信息
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: "input",
        name: "componentDescription",
        message: "请输入组件描述信息",
        default: "",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
            if (!v) {
              done("请输入组件描述信息");
              return;
            }
            done(null, true);
          }, 0);
        },
      };
      projectPrompt.push(descriptionPrompt);
      // 2. 获取组件基本信息
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...component,
      };
    }
    // 生成classname abcAcc -> abc-acc
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    // 和模版的 ejs 名字对应上
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }
    return projectInfo;
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      const { type } = this.templateInfo;
      if (type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error("无法识别项目模板类型！");
      }
    } else {
      throw new Error("项目模板信息不存在！");
    }
  }

  // 白名单检测
  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async execCommand(command, errMsg) {
    let ret;
    if (command) {
      const cmdArray = command.split(" ");
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) {
        throw new Error("命令不存在！命令：" + command);
      }
      const args = cmdArray.slice(1);
      ret = await execAsync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
    if (ret !== 0) {
      throw new Error(errMsg);
    }
    return ret;
  }

  async ejsRender(options) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    console.log(projectInfo);
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          dir: dir,
          ignore: options.ignore || "",
          nodir: true,
        },
        function (err, files) {
          if (err) {
            reject(err);
          }
          Promise.all(
            files.map((file) => {
              const filePath = path.join(dir, file);
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                  if (err) {
                    reject1(err);
                  } else {
                    fse.writeFileSync(filePath, result);
                    resolve1(result);
                  }
                });
              });
            })
          );
        }
      );
    });
  }

  async installNormalTemplate() {
    const ora = oraSpinner("正在安装模板...");
    await sleep();
    try {
      // 拷贝模板代码至当前目录  模版得放在 template 下面才能进行 ejs 渲染
      const templatePath = path.resolve(this.pkg.cacheFilePath, "template");
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
      log.verbose(`从${templatePath}拷贝到${targetPath}`);
    } catch (e) {
      throw e;
    } finally {
      ora.succeed("模版安装成功!");
    }
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ["**/node_modules/**", ...templateIgnore];
    await this.ejsRender({ ignore });
    const { installCommand, startCommand } = this.templateInfo;
    // 安装依赖
    await this.execCommand(installCommand, "依赖安装失败！");
    // 启动命令执行
    await this.execCommand(startCommand, "启动执行命令失败！");
  }

  async installCustomTemplate() {
    console.log("自定义安装");
    // 查询自定义模板的入口文件
    console.log(this.pkg);
    if (await this.pkg.exists()) {
      const rootFile = this.pkg.getRootFilePath();
      console.log(rootFile);
      if (fs.existsSync(rootFile)) {
        log.notice("开始执行自定义模板");
        const templatePath = path.resolve(this.pkg.cacheFilePath, "template");
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd(),
        };
        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        log.verbose("code", code);
        await execAsync("node", ["-e", code], {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        log.success("自定义模板安装成功");
      } else {
        throw new Error("自定义模板入口文件不存在！");
      }
    }
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤的逻辑
    fileList = fileList.filter(
      (file) => !file.startsWith(".") && ["node_modules"].indexOf(file) < 0
    );
    return !fileList || fileList.length <= 0;
  }

  createTemplateChoice() {
    return this.template.map((item) => ({
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
