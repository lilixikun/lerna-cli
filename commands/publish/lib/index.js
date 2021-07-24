'use strict';
const Command = require("@aotu-cli/command");
const log = require("@aotu-cli/log");


class PublishCommand extends Command {
    init() {
        console.log("init");
    }
    exec() {
        try {
            throw new Error("22")
        } catch (e) {
            log.error(e.message);
            if (process.env.LOG_LEVEL === "verbose") {
                console.log(e);
            }
        }
    }
}

function init(argv) {
    return new PublishCommand(argv)
}

module.exports = init;
module.exports.PublishCommand = PublishCommand