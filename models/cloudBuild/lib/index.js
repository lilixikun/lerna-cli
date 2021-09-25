'use strict';
const io = require("socket.io-client")
const log = require("@aotu-cli/log")

const WS_SERVER = "ws://127.0.0.1:7001"
const TIME_OUT = 5 * 60
const DISCONNECT_TIME_OUT = 5 * 1000

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
        this.timeout = TIME_OUT
        this.init()
    }

    doTimeout(fn, timeout) {
        this.timer && clearTimeout(this.timer)
        log.info(`设置任务超时时间：${timeout / 1000}秒`);
        this.timer = setTimeout(fn, timeout);
    }

    init() {
        const socket = io(WS_SERVER, {
            query: {
                repo: this.git.remote
            }
        });
        socket.on("connect", () => {
            clearTimeout(this.timer)
            const { id } = socket
            log.success(`云构建任务创建成功、任务ID：${id}`)
            socket.on(id, (msg) => {
                const { action, message } = parseMsg(msg);
                log.success(action, message)
            })
        })

        socket.on("disconnect", () => {
            log.success("disconnect", "云构建任务断开");
            disconnect();
        })

        socket.on("error", (err) => {
            log.error("error", "云构建出错", err);
            disconnect();
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
    }
}

// socket.on('connect', () => {
//     console.log('connect!');
//     socket.emit('chat', 'hello world!');
// });

// socket.on('res', msg => {
//     console.log('res from server: %s!', msg);
// });
module.exports = Cloudbuild;
