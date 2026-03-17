FROM mcr.microsoft.com/playwright/python:v1.47.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -m mypy . --ignore-missing-imports --exclude '__pycache__'

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
