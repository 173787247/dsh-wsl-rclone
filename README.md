# dsh-wsl-rclone

> **语言：** **中文**（本页） · [English](./README.en.md)

rclone 只读：listremotes / lsf / about。

| | |
|---|---|
| 版本 | **0.1.0** |
| 套件 | [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit) **可选**，不在 `install.sh` |

## 安装

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-rclone
# 或本机 path：
# dsh plugin --profile web add /mnt/c/Users/YOU/Desktop/AIFullStackDevelopment/dsh-wsl-rclone
```

kit 批量链接（可选）：`bash dsh-wsl-kit/scripts/link-linux-plugins.sh`

## 工具

| 工具 | 作用 |
|------|------|
| `rclone_status` | rclone 是否可用 |
| `rclone_listremotes` | 远程名列表 |
| `rclone_lsf` | 列远程文件 |
| `rclone_about` | 用量/配额 |

## 配置要点

`allowedRemotes / timeoutMs`

无 copy/sync/delete。建议 `allowedRemotes` 限制 egress。勿把 rclone.conf 密钥贴进聊天。

## License

MIT
