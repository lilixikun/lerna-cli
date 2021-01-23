const semver = require('semver')
const path = require('path')
const colors = require('colors/safe')
const log = require('@aotu-cli/log')
const userHome = require('user-home');
const pathExists = require('path-exists').sync

const pkg = require('../package.json')
const constant = require('./constant')

let args
// console.log(semver.gte("10.14.2", "8.0"));
console.log(semver.gt('10.2.3', '9.0.0'));
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
        checkPkgVersion()
        checkNodeVersion()
        checkRoot()
        checkUserHome()
        checkInputArgs()
        checkEnv()
     await checkGlobalUpdate()
    } catch (error) {
        log.error(error.message)
    }
}

/**
 * 检查版本号
 * @param {*} params 
 */
function checkPkgVersion() {
    log.info('cli', pkg.version)
}

/**
 * 检查Node版本
 */
function checkNodeVersion() {
    // 获取当前Node版本
    const currentVersion = process.version;
    const lowestVersion = constant.LOWEST_NODE_VERSION;
    // 比对最低版本号
    if (!semver.gte(currentVersion, lowestVersion)) {
        throw new Error(colors.red(`aotu-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`))
    }
}

/**
 * 检查 root 启动
 */
function checkRoot() {
    // root 启动的目录无法操作，需要进行降级
    console.log(process.geteuid());
    // sudo 启动 打印就是 0  正常就是 501

    const rootCheck = require('root-check')
    rootCheck()
}

/**
 * 检测用户主目录
 */
function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前用户主目录不存在，请检查!'))
    }
}

/**
 * 检查入参
 */
function checkInputArgs() {
    args = require('minimist')(process.argv.slice(2))
    checkArgs()
}

function checkArgs() {
    if (args.debug) {
        process.env.LOG_LEVEL = 'verbose'
    } else {
        process.env.LOG_LEVEL = 'info'
    }
    log.level = process.env.LOG_LEVEL;
}

/**
 * 检查环境变量
 */
function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env')
    if (pathExists(dotenvPath)) {
        dotenv.config({
            path: dotenvPath
        })
    }
    createDefaultConfig()
    log.verbose('环境变量', process.env.CLI_HOME_PATH)
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    };
    if (process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}


async function checkGlobalUpdate() {
    // 获取最新版本号和模块名
    const currentVersion = pkg.version;
    const npmName = pkg.name;
    // 调用 API 拿到所有版本号
    const { getNpmSemverVersion } = require('get-npm-info');
    // 提取所有版本号，对比那些版本号大于当前版本号
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
    // 获取最新版本号，提示用户更新到该版本
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        log.warn(colors.yellow(`请手动更新 ${npmName}，当前版本：${lastVersion}，最新版本 ${lastVersion}
                  更新命令：npm install -g ${npmName}`))
    }
}