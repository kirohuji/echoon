# whisper.cpp（whisper-server）独立部署

用于在 TTS（如 MiniMax）未返回词级时间戳时，由后端可选调用 `whisper-server` 的 `/inference` 接口（`response_format=verbose_json`），在返回的 JSON 中读取 **`segments[].words[]`** 的 **`start` / `end`（秒）**，再映射到业务所需的纳秒时间轴（例如与 Cartesia 相同的 `DocumentWordTimestamp`）。

官方项目：[ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp)（含 [Docker 说明](https://github.com/ggml-org/whisper.cpp#docker)）。

## 端口与模型（默认）

- 宿主机端口：**2610** → 容器内 **8080**（见本目录 `docker-compose.yml`）。
- 默认模型：**`ggml-medium.bin`**（medium，约 1.5 GiB；实际以 `models/` 内文件与 `WHISPER_GGML_MODEL` 为准）。
- 绑定地址：默认 **`0.0.0.0`**（便于局域网或他机访问）。与业务长期同机时建议将 **`WHISPER_BIND=127.0.0.1`** 写入 `.env`，避免无鉴权服务暴露在公网。

## 安全

- `whisper-server` **无内置鉴权**。`0.0.0.0` 暴露时，任何能连上端口的主机都可调用推理；生产环境请改为 **仅本机绑定**、**内网 / VPN**，或前置 **带鉴权的反向代理**。
- **切勿**把 root 密码写入仓库、`.env` 或脚本；请使用 **SSH 公钥** 并定期轮换凭据。

## 准备模型

在本目录下创建 **`models/`**，放入与 `.env` 中 **`WHISPER_GGML_MODEL`** 一致的文件（默认 **`ggml-medium.bin`**）。

下载示例：[Hugging Face ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp)。

## 配置

若仓库内提供 `.env.example`：

```bash
cp .env.example .env
# 按需编辑 WHISPER_BIND、WHISPER_HOST_PORT、WHISPER_GGML_MODEL
```

## 启动

```bash
cd whisper   # 或所在仓库中的 whisper 目录
docker compose up -d
```

模型加载完成后，健康检查：

```bash
curl -sS http://127.0.0.1:2610/health
```

期望返回：`{"status":"ok"}`。

## 词级时间戳（verbose_json）

调用 `/inference` 时使用 **`response_format=verbose_json`**。返回 JSON 中：

- **`segments[]`**：句段级 **`start` / `end`**（秒）。
- **`segments[].words[]`**：词级 **`word`、`start`、`end`**（秒），以及 **`probability`** 等。

便于对齐 TTS/对齐字幕时间轴时，以 **`words[]`** 为准做细粒度对齐。

## 从其他服务器测试（远程客户端）

只要 **网络可达** whisper 所在主机的 **`IP:2610`**（或域名、Tailscale 地址等），即可在 **另一台机器** 上当客户端测试。

1. **健康检查**（将 `WHISPER_HOST` 换成实际地址）：

   ```bash
   curl -sS http://WHISPER_HOST:2610/health
   ```

2. **本目录探测脚本**（需 **Node.js**；默认服务地址为 **`http://100.109.23.12:2610`**，亦可在第 1 个参数或 `WHISPER_TEST_BASE` 中覆盖；默认上传同目录 **`test.mp3`**）：

   ```bash
   node test-inference.mjs
   node test-inference.mjs http://WHISPER_HOST:2610
   WHISPER_TEST_BASE=http://WHISPER_HOST:2610 node test-inference.mjs
   ```

   更换音频文件：

   ```bash
   WHISPER_TEST_AUDIO=/path/to/sample.mp3 WHISPER_TEST_BASE=http://WHISPER_HOST:2610 node test-inference.mjs
   ```

3. **远端机器**还需放行出站访问该地址；**whisper 所在机**若在公网，需在防火墙/安全组放行 **2610/tcp**（仅在你明确需要公网访问时）。

## 手动调用 /inference

```bash
curl -sS http://127.0.0.1:2610/inference \
  -F "file=@/path/to/sample.mp3" \
  -F "response_format=verbose_json" \
  -F "temperature=0.0"
```

## 示例结果文件（可选）

可将某次成功推理的完整响应保存为 JSON，便于在本机查看结构或对比效果，例如：

- **`test-inference-result.json`**：`verbose_json` 完整正文（含所有 **`words`** 时间戳）。
- **`test-inference-result.txt`**：人工可读的片段摘要（若本地生成了该文件）；**词级时间仍以 JSON 为准**。

在容器内跑 whisper、而宿主机访问映射端口异常时，可在容器内用 `curl -sS http://127.0.0.1:8080/health` 验证，再将 JSON 拷贝到宿主机。

## 与 echoon 后端对接

后端环境变量 **`WHISPER_INFERENCE_URL`** 须指向 **`/inference`**，例如：

- 后端与 whisper 同 Docker 网络：`http://whisper:8080/inference`
- 后端在 whisper 宿主机上：`http://127.0.0.1:2610/inference`
- 后端在另一台机（内网 / Tailscale，**务必加固访问控制**）：`http://<内网或 TS IP>:2610/inference`

可选：`WHISPER_LANGUAGE`、`WHISPER_TIMEOUT_MS`（默认 600000）、`WHISPER_SPLIT_ON_WORD=true`。

## 与主仓库 Compose 同网（可选）

若主项目在根目录提供 **`docker compose --profile whisper`**，模型目录与端口以主仓库 **`docker-compose.yml` / `.env.example`** 为准。

## GPU / 其他变体

官方还提供 `main-cuda`、`main-vulkan` 等镜像，见 [whisper.cpp README — Docker](https://github.com/ggml-org/whisper.cpp#docker)。
