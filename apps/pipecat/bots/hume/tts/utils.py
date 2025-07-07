import numpy as np
import resampy

def resample_pcm(pcm_bytes: bytes, from_sr: int, to_sr: int) -> bytes:
    """
    将原始 PCM 音频从 from_sr 重采样到 to_sr。

    参数：
        pcm_bytes: 原始 PCM int16 字节数据（如 base64 解码后的内容）
        from_sr: 原始采样率，例如 48000
        to_sr: 目标采样率，例如 24000

    返回：
        重采样后的 PCM 字节数据（int16）
    """
    pcm_int16 = np.frombuffer(pcm_bytes, dtype=np.int16)

    resampled = resampy.resample(pcm_int16.astype(np.float32), from_sr, to_sr)
    resampled_int16 = np.clip(resampled, -32768, 32767).astype(np.int16)
    return resampled_int16.tobytes()