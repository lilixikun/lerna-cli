"use strict";

/**
 * name 模版名称
 * npmName npm 包名
 * version 版本号 可以是 latest 最新
 * type 类型 分为标准 normal 和自定义 custom
 * installCommand 安装命令
 * startCommand 项目启动名称
 * tag 标记
 * ignore 忽略文件
 */
function request() {
  return [
    {
      name: "vue3开发模版",
      npmName: "vite-antd-template",
      version: "1.0.0",
      type: "normal",
      tag: ["project"],
      installCommand: "npm install --registry=https://registry.npm.taobao.org",
      startCommand: "npm run dev",
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
      name: "乐高组件模版",
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
