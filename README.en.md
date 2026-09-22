# dsh-wsl-rclone

> **Languages:** [中文（首页）](./README.md) · **English** (this file)

Read-only rclone listremotes / lsf / about.

| | |
|---|---|
| Version | **0.1.0** |
| Kit | Optional companion to [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit); not in `install.sh` |

## Install

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-rclone
```

Batch link (optional): `bash dsh-wsl-kit/scripts/link-linux-plugins.sh`

## Tools

| Tool | Role |
|------|------|
| `rclone_status` | rclone on PATH |
| `rclone_listremotes` | list remotes |
| `rclone_lsf` | list remote files |
| `rclone_about` | about/quota |

## Config

`allowedRemotes / timeoutMs`

No copy/sync/delete. Prefer `allowedRemotes`. Never paste rclone.conf secrets.

## License

MIT
