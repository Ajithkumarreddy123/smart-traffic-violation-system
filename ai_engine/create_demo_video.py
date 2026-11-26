import os
import cv2
import numpy as np

def generate_traffic_demo_video(output_path: str, num_frames: int = 300, fps: int = 30):
    """
    Generates a realistic traffic scene video with lanes, stop line, traffic signal,
    and multiple moving vehicles (cars and motorcycles) that cross the stop line.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 1280, 720
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    if not out.isOpened():
        print(f"[VideoGen] Warning: Could not open VideoWriter with mp4v, trying XVID...")
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Vehicles schedule: [start_frame, lane, vehicle_type, color, plate, speed]
    vehicles = [
        {"start_frame": 10, "lane": 0, "type": "car", "color": (180, 50, 40), "plate": "KA03NC4501", "speed": 4.5, "y": -120},
        {"start_frame": 40, "lane": 1, "type": "bike", "color": (30, 160, 240), "plate": "KA01AB1234", "speed": 5.2, "y": -80},
        {"start_frame": 90, "lane": 2, "type": "car", "color": (220, 220, 220), "plate": "KA04MK7712", "speed": 4.0, "y": -120},
        {"start_frame": 150, "lane": 1, "type": "bike", "color": (40, 200, 80), "plate": "AP39BQ9021", "speed": 5.8, "y": -80},
        {"start_frame": 200, "lane": 0, "type": "car", "color": (50, 120, 200), "plate": "MH02CD6645", "speed": 4.2, "y": -120},
        {"start_frame": 240, "lane": 2, "type": "car", "color": (80, 80, 80), "plate": "DL01CA1102", "speed": 4.8, "y": -120},
    ]

    lane_x_coords = [380, 640, 900]
    stop_line_y = 440

    for f in range(num_frames):
        # 1. Background (Asphalt Road with Sidewalks)
        frame = np.full((height, width, 3), (35, 38, 46), dtype=np.uint8)

        # Sidewalks
        cv2.rectangle(frame, (0, 0), (220, height), (70, 75, 85), -1)
        cv2.rectangle(frame, (width - 220, 0), (width, height), (70, 75, 85), -1)
        # Curbs
        cv2.line(frame, (220, 0), (220, height), (200, 200, 200), 4)
        cv2.line(frame, (width - 220, 0), (width - 220, height), (200, 200, 200), 4)

        # 2. Lane Dividers (Dashed White Lines)
        lane_dividers = [490, 770]
        dash_offset = (f * 5) % 40
        for lx in lane_dividers:
            for y in range(-40 + dash_offset, height, 40):
                cv2.line(frame, (lx, y), (lx, min(height, y + 22)), (230, 230, 230), 4)

        # 3. Zebra Crossing & Stop Line
        # Zebra stripes
        for zx in range(240, width - 240, 50):
            cv2.rectangle(frame, (zx, stop_line_y + 30), (zx + 30, stop_line_y + 75), (240, 240, 240), -1)

        # Stop Line (Bright White / Red Zone)
        cv2.line(frame, (220, stop_line_y), (width - 220, stop_line_y), (255, 255, 255), 8)

        # 4. Draw Vehicles
        for v in vehicles:
            if f >= v["start_frame"]:
                v["y"] += v["speed"]
                vy = int(v["y"])
                if vy < height + 150:
                    vx = lane_x_coords[v["lane"]]
                    if v["type"] == "car":
                        cw, ch = 130, 200
                        cx1 = vx - cw // 2
                        cy1 = vy - ch // 2
                        cx2 = cx1 + cw
                        cy2 = cy1 + ch
                        # Car Body (Rounded corners appearance)
                        cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), v["color"], -1)
                        cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), (20, 20, 20), 2)
                        # Roof / Cabin
                        cv2.rectangle(frame, (cx1 + 12, cy1 + 45), (cx2 - 12, cy2 - 40), (20, 25, 30), -1)
                        # Windshield front and rear
                        cv2.rectangle(frame, (cx1 + 16, cy1 + 25), (cx2 - 16, cy1 + 45), (80, 110, 140), -1)
                        cv2.rectangle(frame, (cx1 + 16, cy2 - 40), (cx2 - 16, cy2 - 20), (70, 90, 110), -1)
                        # Headlights / Taillights
                        cv2.rectangle(frame, (cx1 + 8, cy2 - 10), (cx1 + 32, cy2), (0, 0, 230), -1)
                        cv2.rectangle(frame, (cx2 - 32, cy2 - 10), (cx2 - 8, cy2), (0, 0, 230), -1)
                        # License Plate
                        pw, ph = 74, 18
                        px1 = vx - pw // 2
                        py1 = cy2 - 16
                        cv2.rectangle(frame, (px1, py1), (px1 + pw, py1 + ph), (255, 255, 255), -1)
                        cv2.rectangle(frame, (px1, py1), (px1 + 10, py1 + ph), (180, 50, 0), -1)
                        cv2.putText(frame, v["plate"][:6], (px1 + 12, py1 + 13), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1)
                    else:
                        # Motorcycle + Rider
                        bw, bh = 50, 110
                        bx1 = vx - bw // 2
                        by1 = vy - bh // 2
                        bx2 = bx1 + bw
                        by2 = by1 + bh
                        # Wheels
                        cv2.ellipse(frame, (vx, by1 + 15), (10, 18), 0, 0, 360, (20, 20, 20), -1)
                        cv2.ellipse(frame, (vx, by2 - 15), (10, 18), 0, 0, 360, (20, 20, 20), -1)
                        # Bike body & Handlebar
                        cv2.line(frame, (vx - 22, by1 + 30), (vx + 22, by1 + 30), (180, 180, 180), 3)
                        cv2.rectangle(frame, (vx - 12, by1 + 25), (vx + 12, by2 - 25), v["color"], -1)
                        # Rider Body
                        cv2.rectangle(frame, (vx - 16, by1 + 38), (vx + 16, by1 + 75), (40, 50, 60), -1)
                        # Rider Head (Helmet status indicator)
                        has_helmet = (v["plate"] == "AP39BQ9021")
                        head_color = (255, 255, 0) if has_helmet else (80, 130, 220)
                        cv2.circle(frame, (vx, by1 + 45), 12, head_color, -1)
                        # Plate
                        cv2.rectangle(frame, (vx - 24, by2 - 10), (vx + 24, by2 + 4), (255, 255, 255), -1)
                        cv2.putText(frame, v["plate"][:6], (vx - 22, by2), cv2.FONT_HERSHEY_SIMPLEX, 0.28, (0, 0, 0), 1)

        # 5. On-Screen Road Label & Traffic Signal Pole
        cv2.putText(frame, "SILK BOARD FLYOVER - LIVE AI SURVEILLANCE FEED [NODE CAM-01]", (30, 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 235, 255), 2)
        cv2.putText(frame, f"FRAME: {f:04d} | 30 FPS | VIRTUAL STOP LINE: Y={stop_line_y}", (30, 75),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 180, 180), 1)

        out.write(frame)

    out.release()
    print(f"[VideoGen] Demo traffic video generated successfully: {output_path} ({num_frames} frames)")
    return output_path

if __name__ == "__main__":
    out_file = os.path.join(os.path.dirname(__file__), "video_sources", "traffic_demo.mp4")
    generate_traffic_demo_video(out_file)
