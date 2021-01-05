#!/usr/bin/env node

const commander = require('commander');
const pkg = require('../package.json')

// 获取commander的单例
// const { program } = commander
// program.version(pkg.version).parse(process.argv)

const program = new commander.Command();

program
    .name(Object.keys(pkg.bin)[0])
    .usage('<commander> [options]')
    .version(pkg.version)
    .option('-d,--debug', '是否开启调试模式', false)
    .option('-e,--envName <envName>', '获取环境变量')
    .parse(process.argv)

// console.log(program.envName)
// 打印脚手架信息
// program.outputHelp()

// command 注册命令
const clone = program.command('clone');
clone
    .description('clone a res')
    .action(() => {
        console.log('do clone');
    })

// addCommand 注册子命令
const server = new commander.Command('server');
server
    .command('start [port]')
    .description('start service at some port')
    .action((port) => {
        console.log('do service start', port);
    })

server
    .command('stop')
    .description('stop service')
    .action(() => {
        console.log('stop service');
    })

program.addCommand(server)
// 监听所有的command
// program
//     .arguments('<cmd> [options]')
//     .description('test command', {
//         cmd: 'command on run',
//         options: 'options for command'
//     })
//     .action((cmd, options) => {
//         console.log(cmd, options);
//     })

// 高级定制一：自定义help信息
// program.helpInformation = function () {
//     return ''
// }

// program.on('--help', function () {
//     console.log('your help');
// })

// 高级定制2：实现debug模式
program.on('option:debug', function () {
    if (program.debug) {
        process.env.LOG_LEVEL = 'verbose';
    }
    console.log(process.env.LOG_LEVEL);
})

// 高级定制3:对未知命令进行监控
program.on('command:*', function (obj) {
    console.error('未知的命令' + obj[0]);
    const allCommands = program.commands.map(cmd => cmd.name())
    console.log(allCommands)
})

program
    .parse(program.argv)