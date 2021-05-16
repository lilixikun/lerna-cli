const semver = require("semver");
const path = require("path");
const colors = require("colors/safe");
const log = require("@aotu-cli/log");
const userHome = require("user-home");
const commander = require("commander");
const exec = require("@aotu-cli/exec");
const pathExists = require("path-exists").sync;
const figlet = require("figlet");
const dewuStr = figlet.textSync("   De Wu");
const Printer = require("@darkobits/lolcatjs");

const pkg = require("../package.json");
const constant = require("./constant");

const program = new commander.Command();
/**
 * tip
 *  require 默认可以加载 .js/.json/.node
 *  .js -> module.export/exports
 *  .json -> JSON.parse
 * 如果不是 这三种结尾的 node 默认会当作 .js 来执行  如 .txt 里面写入代码 也是正常读取
 */

module.exports = core;

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (error) {
    log.error(error.message);
    if (program.debug) {
      console.log(error);
    }
  }
}

/**
 * 检查版本号
 * @param {*} params
 */
function checkPkgVersion() {
  log.info("cli", pkg.version);
}

/**
 * 检查 root 启动
 */
function checkRoot() {
  // root 启动的目录无法操作，需要进行降级
  // sudo 启动 打印就是 0  正常就是 501
  const rootCheck = require("root-check");
  rootCheck();
}

/**
 * 检测用户主目录
 */
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前用户主目录不存在，请检查!"));
  }
}

/**
 * 检查环境变量
 */
function checkEnv() {
  const dotenv = require("dotenv");
  const dotenvPath = path.resolve(userHome, ".env");
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultConfig();
  log.verbose("环境变量", process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

async function checkGlobalUpdate() {
  // 获取最新版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 调用 API 拿到所有版本号
  const { getNpmSemverVersion } = require("@aotu-cli/get-npm-info");
  // 提取所有版本号，对比那些版本号大于当前版本号
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
  // 获取最新版本号，提示用户更新到该版本
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(`请手动更新 ${npmName}，当前版本：${lastVersion}，最新版本 ${lastVersion}
                  更新命令：npm install -g ${npmName}`)
    );
  }
}

async function prepare() {
  checkPkgVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "是否指定本地调试文件", "");

  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化项目")
    .action(exec);

  program.command("clear [type]").action(exec);

  // 开启debug模式
  program.on("option:debug", function () {
    if (program.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
  });

  // program.helpInformation = function () {
  //   return Printer.default.fromString(
  //     `   \n      欢迎使用前端平台脚手架 ${pkg.version}\n    https://poizon.feishu.cn/wiki/wikcn3APD6AnJ9acreDrHhPuvKg\n   ${dewuStr}`
  //   );
  // };

  program.on("--help", function () {
    console.log(
      Printer.default.fromString(
        `   \n      欢迎使用前端平台脚手架 ${pkg.version}\n    https://poizon.feishu.cn/wiki/wikcn3APD6AnJ9acreDrHhPuvKg\n   ${dewuStr}`
      )
    );
  });

  // 指定targetPath 利用环境变量进行业务解耦
  program.on("option:targetPath", function () {
    process.env.CLI_TARGET_PATH = program.targetPath;
  });

  // 对未知命令的监听
  program.on("command:*", function (obj) {
    console.log(colors.red("未知的命令：" + obj[0]));
    const availableCommands = program.commands.map((cmd) => cmd.name());
    if (availableCommands.length > 0) {
      console.log(colors.green("可用命令：" + availableCommands.join(",")));
    }
  });
  program.parse(program.args);
  // 对用户没有输入命令时候的处理
  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log();
  }
}
