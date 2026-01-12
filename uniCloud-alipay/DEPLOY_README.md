部署云函数（uploadFile）到腾讯云 TCB

前提
- 已在腾讯云控制台创建环境并获取 `envId`
- 本地安装 CloudBase CLI：`npm i -g @cloudbase/cli`
- 已登录 CloudBase CLI：`cloudbase login`

步骤（CLI）
1. 在终端设置环境变量（或在 CI 中注入）：
   export TCB_ENV_ID=prod-xxxxx

2. 运行部署脚本：
   bash android/uniCloud/deploy_uploadFile.sh

3. 部署完成后，在云函数控制台可以看到函数 `uploadFile`，并记下其 envId 与 region。

客户端配置
- 在 `android/manifest.json` 的 `uniCloud.tcb.envId` 中填写你的 envId，或在 `App.vue` 中把 `uni.cloud.init({ env: 'your-env-id' })` 的 'your-env-id' 替换为真实 envId。

本地测试
- 把真实配置写入 `android/uniCloud/project.config.json`（注意该目录已建议加入 .gitignore），或在本地运行时把 TCB_ENV_ID 导出并使用 CLI 部署。


