import requests
import time

def test_api():
    print("Testing chat API...")
    try:
        response = requests.post(
            "http://127.0.0.1:8005/api/v1/chat/",
            json={"user_id": 1, "query": "What is going on in the tech sector?"},
            timeout=45
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Failed to hit API: {e}")

if __name__ == "__main__":
    test_api()
