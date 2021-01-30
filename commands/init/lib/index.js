'use strict';

const Command = require('@aotu-cli/command');
const log = require('@aotu-cli/log');

class InitCommand extends Command {
    init() {
        this.projectName = this._argv[0] || '';
        this.force = !!this._cmd.force;
        log.verbose('projectName', this.projectName);
        log.verbose('force', this.force);
    }

    exec() {
        console.log('init的业务逻辑');
    }
}

function init(argv) {
    return new InitCommand(argv);
}


module.exports = init;
module.exports.InitCommand = InitCommand;