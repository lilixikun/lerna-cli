'use strict';
const io = require("socket.io-client")
const log = require("@aotu-cli/log")

const WS_SERVER = "ws://127.0.0.1:7001"
const TIME_OUT = 5 * 60
const DISCONNECT_TIME_OUT = 5 * 1000

const FAILED_CODE = ["prepare failed", "download failed", "install failed", "build failed",
    "pre-publish failed", "publish failed"]

function parseMsg(msg) {
    const action = msg.data.action
    const message = msg.data.paylod.message
    return {
        action,
        message
    }
}

class Cloudbuild {
    constructor(git, options) {
        this.git = git
        this.buildCmd = options.buildCmd
        this.prod = options.prod
        this.timeout = TIME_OUT
    }

    doTimeout(fn, timeout) {
        this.timer && clearTimeout(this.timer)
        log.info(`设置任务超时时间：${timeout / 1000}秒`);
        this.timer = setTimeout(fn, timeout);
    }

    prepare() {
        // 获取OSS文件
        // 判断OSS文件是否存在
        // 如果存在切处于正式发布，则询问用户是否进行覆盖发布
    }

    init() {
        return new Promise((resolve, reject) => {
            const socket = io(WS_SERVER, {
                query: {
                    repo: this.git.remote,
                    name: this.git.name,
                    branch: this.git.branch,
                    version: this.git.version,
                    buildCmd: this.buildCmd,
                    prod: this.prod
                }
            });
            this.socket = socket;
            socket.on("connect", () => {
                clearTimeout(this.timer)
                const { id } = socket
                log.success(`云构建任务创建成功、任务ID：${id}`)
                socket.on(id, (msg) => {
                    const { action, message } = parseMsg(msg);
                    log.success(action, message)
                })
                resolve()
            })

            socket.on("disconnect", () => {
                log.success("disconnect", "云构建任务断开");
                disconnect();
            })

            socket.on("error", (err) => {
                log.error("error", "云构建出错", err);
                disconnect();
                reject()
            })

            const disconnect = () => {
                clearTimeout(this.timer);
                socket.disconnect();
                socket.close();
            }

            this.doTimeout(() => {
                log.error("云构建服务器连接超时、自动终止😭");
                disconnect()
            }, DISCONNECT_TIME_OUT)
        })
    }

    build() {
        return new Promise((resolve, reject) => {
            this.socket.emit("build");
            this.socket.on("build", (msg) => {
                const { action, message } = parseMsg(msg);
                if (FAILED_CODE.indexOf(action) >= 0) {
                    log.error(action, message)
                    clearTimeout(this.timer);
                    this.socket.disconnect();
                    this.socket.close();
                } else {
                    log.success(action, message)
                }
            });
            this.socket.on("building", (msg) => {
                console.log(msg);
            });
        })
    }
}

module.exports = Cloudbuild;
