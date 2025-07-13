# echoon 项目结构概览

## 项目描述

echoon 是一个基于 NestJS、React 和 Python 的 AI 项目，主要用于 AI 相关处理。
主要是实现 AI 的对话功能，以及 AI 的 TTS 功能,提供英语对话练习服务

## apps/
- **backend/**：NestJS 后端服务，包含 API、数据库（Prisma）、认证、会话、用户等模块。
- **frontend/**：React 前端应用，包含页面、组件、hooks、国际化、主题等。
- **pipecat/**：基于 pipecat ai 的架构，Python 相关的 bot、TTS、WebAPI、数据库等，主要用于 AI 相关处理。

## 根目录
- `package.json`、`pnpm-workspace.yaml` 等多包管理配置。
