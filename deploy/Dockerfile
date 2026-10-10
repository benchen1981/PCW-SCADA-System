FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chmod +x scripts/*.sh
EXPOSE 1502 1503 8000
CMD ["bash","scripts/start_foreground.sh"]
