"use strict";

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
    {
      name: "vue2开发模版",
      npmName: "@aotu-cli/vue2",
      version: "1.0.0",
      type: "normal",
      tag: ["project"],
    },
    {
      name: "vue3开发模版",
      npmName: "imooc-cli-dev-template-custom-vue2",
      version: "1.0.1",
      type: "custom",
      tag: ["project"],
      ignore: ["**/public/**"],
    },
    {
      name: "vue2后台开发模版",
      npmName: "imooc-cli-dev-template-vue-element-admin",
      version: "1.0.0",
      type: "normal",
      installCommand: "npm install --registry=https://registry.npm.taobao.org",
      startCommand: "npm run dev",
      tag: ["project"],
      ignore: ["**/public/**"],
    },
    {
      name: "koa开发模版",
      npmName: "koa",
      version: "latest",
      type: "normal",
      installCommand: "npm install",
      tag: ["project"],
    },
    {
      name: "慕课乐高组件模版",
      npmName: "imooc-cli-dev-lego-component",
      version: "1.0.0",
      type: "normal",
      installCommand: "npm install",
      startCommand: "npm run serve",
      tag: ["component"],
      ignore: ["**/public/**"],
    },
  ];
}
module.exports = request;
