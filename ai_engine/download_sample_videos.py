"""
Utility script to download authentic sample traffic videos for live AI detection
"""

import os
import requests

VIDEO_SOURCES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "video_sources")
os.makedirs(VIDEO_SOURCES_DIR, exist_ok=True)

SAMPLE_VIDEOS = [
    {
        "name": "sample_real_traffic.mp4",
        "url": "https://raw.githubusercontent.com/antonmilev/TrafficDetection/main/vid.mp4",
        "description": "1080p Crossroad Traffic Surveillance (Cars, Buses, Vans)"
    },
    {
        "name": "yolo_ci_demo.mp4",
        "url": "https://github.com/ultralytics/assets/releases/download/v0.0.0/solutions_ci_demo.mp4",
        "description": "Ultralytics Official Multi-Object Traffic & Pedestrian Demo"
    }
]

def download_samples():
    print("=" * 65)
    print("  DOWNLOADING AUTHENTIC SAMPLE TRAFFIC VIDEOS")
    print("=" * 65)

    for item in SAMPLE_VIDEOS:
        dest_path = os.path.join(VIDEO_SOURCES_DIR, item["name"])
        if os.path.exists(dest_path):
            print(f"  ✓ Already present: {item['name']} ({item['description']})")
            continue

        print(f"\n  Downloading {item['name']} from {item['url']}...")
        try:
            resp = requests.get(item["url"], stream=True, timeout=20)
            if resp.status_code == 200:
                with open(dest_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)
                print(f"  ✓ Successfully downloaded: {dest_path}")
            else:
                print(f"  ✗ Failed to download (Status {resp.status_code})")
        except Exception as e:
            print(f"  ✗ Download error: {e}")

    print("\n" + "=" * 65)
    print("  DOWNLOADS COMPLETED. Files stored in:")
    print(f"  {VIDEO_SOURCES_DIR}")
    print("=" * 65)

if __name__ == "__main__":
    download_samples()
