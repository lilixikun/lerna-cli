'use strict';
const path = require("path")
const npminstall = require('npminstall')
const fse = require('fs-extra')
const pathExists = require('path-exists').sync;
const pkgDir = require('pkg-dir').sync;

const formatPath = require('@aotu-cli/format-path');
const { isObject } = require('@aotu-cli/utils')
const { getDefaultRegistry, getNpmLatestVersion } = require('@aotu-cli/get-npm-info')

class Package {
    constructor(options) {
        if (!options) {
            throw new Error('Package类的options参数不能为空！');
        }
        if (!isObject(options)) {
            throw new Error('Package类的options参数必须为对象！');
        }
        // Package的目标路径
        this.targetPath = options.targetPath;
        // 缓存Package的路径
        this.storeDir = options.storeDir;
        // Package的name
        this.packageName = options.packageName;
        // Package的version
        this.packageVersion = options.packageVersion;
        // package的缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace('/', '_');
    }

    async prepare() {
        // 创建缓存目录
        if (this.storeDir && !pathExists(this.storeDir)) {
            console.log(this.storeDir);
            fse.mkdirSync(this.storeDir);
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName)
        }
    }

    // 路径拼接
    get cacheFilePath() {
        // @imooc-cli/init 1.1.2
        // _@imooc-cli_init@1.1.2@@imooc-cli/init
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
    }

    getSpecificCacheFilePath(packageVersion) {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`);
    }

    // 判断当前Package是否存在
    async exists() {
        if (this.storeDir) {
            await this.prepare();
            return pathExists(this.cacheFilePath)
        } else {
            return pathExists(this.targetPath)
        }
    }

    // 安装Package
    async install() {
        await this.prepare();
        return npminstall({
            root: this.targetPath,
            storePath: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [{
                name: this.packageName,
                version: this.packageVersion
            }]
        })
    }

    async update() {
        await this.prepare();
        // 1. 获取最新的npm模块版本号
        const latestPackageVersion = await getNpmLatestVersion(this.packageName);
        // 2. 查询最新版本号对应的路径是否存在
        const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
        // 3. 如果不存在，则直接安装最新版本
        if (!latestFilePath) {
            await npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [{
                    name: this.packageName,
                    version: latestPackageVersion
                }]
            })
            this.packageVersion = latestPackageVersion
        }
    }

    // 获取入口文件的路径
    getRootFilePath() {
        function _getRootFile(targetPath) {
            // 1. 获取package.json所在目录
            const dir = pkgDir(targetPath);
            if (dir) {
                // 2. 读取pack.json
                const pkgFile = require(path.resolve(dir, 'package.json'));
                // 3. 寻找main/lib
                if (pkgFile && pkgFile.main) {
                    // 4. 路径的兼容(macOS/windows)
                    return formatPath(path.resolve(dir, pkgFile.main));
                }
            }
            return null
        }
        if (this.storeDir) {
            return _getRootFile(this.cacheFilePath)
        } else {
            return _getRootFile(this.targetPath)
        }
    }

}

module.exports = Package;

