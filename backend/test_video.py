import requests

def test_video_endpoint():
    print("Testing Video Generation API...")
    try:
        response = requests.post(
            "http://127.0.0.1:8005/api/v1/video/generate",
            json={
                "title": "Sam Altman announces AGI",
                "content": "In a shock announcement today, OpenAI revealed a new model that completely solves benchmark reasoning tasks in seconds, shaking global markets."
            },
            timeout=30
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("Response:", response.json())
        else:
            print("Error parsing response or non-200 status:", response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"Failed to hit API: {e}")

if __name__ == "__main__":
    test_video_endpoint()
