'use strict';

// installCommand  npm  install
// startCommand npm serve
// tag
// ignore

/**
 * name 模版名称
 * npmName npm 包名
 * version 版本号 可以是 latest 最新
 * type 类型 分为标准和自定义
 * installCommand 安装命令
 * startCommand 项目启动名称
 * tag 标记
 * ignore 忽略文件
 */

function request() {
    return [
        { name: 'vue2开发模版', npmName: '@aotu-cli/vue2', version: '1.0.0', type: "normal" },
        { name: 'vue3开发模版', npmName: '@aotu-cli/vue3', version: '1.0.0', type: "custom" },
        { name: 'vue2后台开发模版', npmName: 'imooc-cli-dev-template-vue-element-admin', installCommand: "npm install --registry https://registry.npm.taobao.org", startCommand: 'npm run dev', version: '1.0.0', type: 'normal' },
        { name: 'koa开发模版', npmName: 'koa', version: 'latest', type: 'normal', installCommand: "npm install" }
    ]
}
module.exports = request;
