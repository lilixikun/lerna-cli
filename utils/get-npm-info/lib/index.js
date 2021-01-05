'use strict';

const urljoin = require('url-join');
const axios = require('axios');

function getNpmInfo(npmName, registry) {
    if (!npmName) {
        return null
    }
    const registryUrl = registry || getDefaultRegistry();
    const npmInfoUrl = urljoin(registryUrl, npmName);
    return axios.get(npmInfoUrl).then(response => {
        if (response.status === 200) {
            return response.data;
        }
        return null
    }).catch(err => {
        return Promise.reject(err)
    })
}

function getDefaultRegistry(isOriginal = false) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}

async function getNpmVersion(npmName, registry) {
    const data = await getNpmInfo(npmName)
    if (data) {
        return Object.keys(data.versions)
    }
    return []
}

function getNpmSemverVersions(baseVersion, versions) {
    // 防止接口返回未出现排序
    versions = versions.filter(item => item >= baseVersion).sort((a, b) => a - b);
    return versions
}

async function getNpmSemverVersion(baseVersion, npmName, registry) {
    const versions = await getNpmVersion(npmName);
    const newVersions = getNpmSemverVersions(baseVersion, versions);
    if (newVersions && newVersions.length) {
        // 返回排序后的首位 也就是最大版本号
        return newVersions[0]
    }
}

module.exports = {
    getNpmVersion,
    getNpmSemverVersion
};
