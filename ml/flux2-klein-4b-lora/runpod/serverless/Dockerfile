FROM runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404

WORKDIR /app

COPY ml/flux2-klein-4b-lora/runpod/serverless/requirements.txt /app/requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r /app/requirements.txt

COPY ml/flux2-klein-4b-lora/runpod/serverless/validation.py /app/validation.py
COPY ml/flux2-klein-4b-lora/runpod/serverless/handler.py /app/handler.py
COPY ml/flux2-klein-4b-lora/runpod/serverless/models/ /app/models/

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/runpod-volume/huggingface \
    GURIA_MODEL_ID=black-forest-labs/FLUX.2-klein-4B \
    GURIA_LORA_ENABLED=false \
    GURIA_LORA_ROOT=/app/models \
    GURIA_CPU_OFFLOAD=true

CMD ["python", "-u", "/app/handler.py"]
