# code-interpreter backend — container for Google Cloud Run / Fly / any Docker host.
# The heavy Python (pandas/matplotlib/…) runs REMOTELY in the E2B sandbox, so this
# image stays small — it only orchestrates + auths.
# BASE_IMAGE: default = Docker Hub (Cloud Build uses this). In mainland China where Docker Hub
# is GFW-blocked, either set a Docker Desktop proxy (recommended) OR pass a mirror, e.g.:
#   --build-arg BASE_IMAGE=docker.m.daocloud.io/library/python:3.12-slim
ARG BASE_IMAGE=python:3.12-slim
FROM ${BASE_IMAGE}

WORKDIR /app

# deps first (layer cache).
# PIP_INDEX_URL defaults to PyPI (Cloud Build / US hosts use this). For LOCAL builds in
# mainland China (where files.pythonhosted.org is GFW-throttled), pass a mirror:
#   docker build --build-arg PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple -t ci-backend .
ARG PIP_INDEX_URL=https://pypi.org/simple
COPY requirements.txt .
RUN pip install --no-cache-dir -i ${PIP_INDEX_URL} -r requirements.txt

COPY . .

# Cloud Run injects $PORT (default 8080). Shell form so $PORT expands; exec for clean signals.
ENV PORT=8080
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
