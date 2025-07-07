FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
COPY webapp/requirements.txt webapp/requirements.txt
COPY bots/requirements.txt bots/requirements.txt

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgtk-3-0 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libatlas-base-dev \
    gfortran \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip && pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ && pip install -r webapp/requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ && pip install -r bots/requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 复制 ssl 证书目录
COPY /ssl/ ./ssl/

COPY . .

EXPOSE 7860
