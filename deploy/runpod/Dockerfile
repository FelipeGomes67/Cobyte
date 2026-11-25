FROM maven:3.9-eclipse-temurin-17 AS api
WORKDIR /build
COPY cobyte-api/pom.xml .
COPY cobyte-api/src ./src
RUN mvn -B -DskipTests package && cp target/cobyte-api-*.jar /build/api.jar

FROM ollama/ollama:0.13.0 AS ollama

FROM nvidia/cuda:12.8.1-cudnn-runtime-ubuntu24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless python3 python3-venv ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ollama /bin/ollama /usr/bin/ollama
COPY --from=ollama /usr/lib/ollama /usr/lib/ollama
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    STT_DEVICE=cuda \
    OLLAMA_MODEL=llama3.2 \
    OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_KEEP_ALIVE=5m \
    SERVER_PORT=8080 \
    SERVER_ADDRESS=0.0.0.0 \
    STT_TIMEOUT_SEGUNDOS=80 \
    STT_MAX_DURATION_SECONDS=120 \
    COBYTE_BOOT_TIMEOUT=1800 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=25 -XX:InitialRAMPercentage=5"
WORKDIR /opt/cobyte
COPY cobyte-api/stt-service/requirements.txt /opt/cobyte/stt/requirements.txt
RUN pip install --no-cache-dir -r /opt/cobyte/stt/requirements.txt
COPY cobyte-api/stt-service/app /opt/cobyte/stt/app
COPY --from=api /build/api.jar /opt/cobyte/api.jar
COPY deploy/runpod/iniciar.py deploy/runpod/preparar_stt.py deploy/runpod/saude.py /opt/cobyte/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=30m --retries=3 \
    CMD ["python", "/opt/cobyte/saude.py"]
ENTRYPOINT ["python", "/opt/cobyte/iniciar.py"]
