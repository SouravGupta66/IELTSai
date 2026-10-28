# test_ai.py
import requests

# This is the address where Ollama runs on your computer
OLLAMA_URL = "http://localhost:11434/api/generate"

# The question we want to ask
question = "tell me how can i build a web application."

# Send the request to the AI
response = requests.post(OLLAMA_URL, json={
    "model": "qwen2.5:3b",
    "prompt": question,
    "stream": False
})

# Get the answer
answer = response.json()["response"]
print("AI Response:")
print(answer)