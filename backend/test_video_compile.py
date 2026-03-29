import requests
import time

def test_compile_endpoint():
    print("Testing Video Compilation API...")
    try:
        response = requests.post(
            "http://127.0.0.1:8005/api/v1/video/compile",
            json={
                "title": "Hackathon Winners Announced",
                "content": "A revolutionary new team has won the AI News OS challenge with a crazy new 60 second video feature powered by Wan2.1 and Groq."
            },
            timeout=30
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Successfully submitted job:")
            print("Task ID:", data.get("task_id"))
            print("Preview Assets:", data.get("assets_preview"))
        else:
            print("Error parsing response:", response.text)
            
    except Exception as e:
        print(f"Failed to hit API: {e}")

if __name__ == "__main__":
    test_compile_endpoint()
