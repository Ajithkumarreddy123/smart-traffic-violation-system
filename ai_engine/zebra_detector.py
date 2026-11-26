"""
TrafficGuard AI — Computer Vision Automatic Zebra Crossing Detector
Detects pedestrian zebra crossings (parallel white road stripes) via:
- Dynamic Road ROI extraction
- Multi-scale white stripe luminance & HSV color segmentation
- Directional morphological filtering (rectangular stripe structuring elements)
- Geometric aspect ratio and parallel spatial grouping
- Temporal exponential moving average (EMA) smoothing to prevent flickering
- Dynamic Virtual Stop-Line calibration at the zebra crossing's upper boundary
"""

import cv2
import numpy as np
from typing import Tuple, List, Optional, Dict, Any


class ZebraCrossingResult:
    def __init__(
        self,
        is_detected: bool = False,
        stop_line_y: int = 440,
        zone_bbox: Optional[Tuple[int, int, int, int]] = None,
        stripes: Optional[List[Tuple[int, int, int, int]]] = None,
        confidence: float = 0.0,
        status_text: str = "DEFAULT CALIBRATION"
    ):
        self.is_detected = is_detected
        self.stop_line_y = stop_line_y
        self.zone_bbox = zone_bbox  # (x1, y1, x2, y2)
        self.stripes = stripes or []
        self.confidence = confidence
        self.status_text = status_text


class ZebraCrossingDetector:
    def __init__(self, smoothing_alpha: float = 0.25, min_stripes: int = 3):
        self.smoothing_alpha = smoothing_alpha
        self.min_stripes = min_stripes
        self.smoothed_stop_line_y: Optional[float] = None
        self.smoothed_bbox: Optional[List[float]] = None
        self.last_valid_result: Optional[ZebraCrossingResult] = None
        self.frames_since_detection = 0

    def detect(self, frame: np.ndarray) -> ZebraCrossingResult:
        """
        Analyzes a single video frame and returns the detected Zebra Crossing region
        and calibrated stop-line Y coordinate.
        """
        if frame is None or frame.size == 0:
            return ZebraCrossingResult()

        h, w = frame.shape[:2]
        # Road surface search window: 40% to 92% of frame height
        roi_ymin = int(h * 0.40)
        roi_ymax = int(h * 0.92)
        roi = frame[roi_ymin:roi_ymax, :]

        # 1. Grayscale & HSV White Segmentation
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

        # White mask: high luminance, low-to-medium saturation
        lower_white = np.array([0, 0, 165])
        upper_white = np.array([180, 65, 255])
        mask_hsv = cv2.inRange(hsv, lower_white, upper_white)

        # High grayscale intensity threshold
        _, mask_gray = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
        combined_mask = cv2.bitwise_and(mask_hsv, mask_gray)

        # 2. Morphological filtering to isolate rectangular zebra bars
        # Horizontal rectangular kernel (stripes are wide and distinct)
        k_strip = cv2.getStructuringElement(cv2.MORPH_RECT, (14, 5))
        cleaned = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, k_strip)
        k_bridge = cv2.getStructuringElement(cv2.MORPH_RECT, (18, 6))
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, k_bridge)

        # 3. Contour Detection
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidate_stripes = []
        for c in contours:
            area = cv2.contourArea(c)
            if area < 80 or area > (w * h * 0.12):
                continue
            x, y, cw, ch = cv2.boundingRect(c)
            aspect = cw / float(ch + 1e-5)
            # Zebra stripe criteria: reasonable aspect ratio and minimum dimensions
            if cw >= 20 and ch >= 5 and 0.75 <= aspect <= 12.0:
                abs_y = y + roi_ymin
                candidate_stripes.append((x, abs_y, cw, ch))

        # 4. Group candidate stripes into clusters sharing similar horizontal/vertical bands
        if len(candidate_stripes) >= self.min_stripes:
            # Cluster stripes aligned across similar Y bands
            candidate_stripes.sort(key=lambda s: s[1])
            best_cluster = []
            
            for i, base in enumerate(candidate_stripes):
                current_cluster = [base]
                base_y = base[1]
                for j in range(len(candidate_stripes)):
                    if i == j:
                        continue
                    target = candidate_stripes[j]
                    # Allowed vertical spread across zebra lane
                    if abs(target[1] - base_y) <= int(h * 0.35):
                        current_cluster.append(target)
                if len(current_cluster) > len(best_cluster):
                    best_cluster = current_cluster

            if len(best_cluster) >= self.min_stripes:
                self.frames_since_detection = 0
                min_x = min(s[0] for s in best_cluster)
                max_x = max(s[0] + s[2] for s in best_cluster)
                min_y = min(s[1] for s in best_cluster)
                max_y = max(s[1] + s[3] for s in best_cluster)

                # Ensure minimum width span for roadway
                if (max_x - min_x) > int(w * 0.25):
                    # Temporal exponential smoothing
                    if self.smoothed_stop_line_y is None:
                        self.smoothed_stop_line_y = float(min_y)
                        self.smoothed_bbox = [float(min_x), float(min_y), float(max_x), float(max_y)]
                    else:
                        self.smoothed_stop_line_y = (
                            (1.0 - self.smoothing_alpha) * self.smoothed_stop_line_y +
                            self.smoothing_alpha * float(min_y)
                        )
                        for idx, val in enumerate([min_x, min_y, max_x, max_y]):
                            self.smoothed_bbox[idx] = (
                                (1.0 - self.smoothing_alpha) * self.smoothed_bbox[idx] +
                                self.smoothing_alpha * float(val)
                            )

                    conf = min(0.99, 0.65 + (len(best_cluster) * 0.02))
                    res = ZebraCrossingResult(
                        is_detected=True,
                        stop_line_y=int(self.smoothed_stop_line_y),
                        zone_bbox=(
                            int(self.smoothed_bbox[0]),
                            int(self.smoothed_bbox[1]),
                            int(self.smoothed_bbox[2]),
                            int(self.smoothed_bbox[3])
                        ),
                        stripes=best_cluster,
                        confidence=conf,
                        status_text=f"AUTO-DETECTED ({len(best_cluster)} STRIPES)"
                    )
                    self.last_valid_result = res
                    return res

        # 5. Graceful Fallback if detection failed on this frame
        self.frames_since_detection += 1
        if self.last_valid_result is not None and self.frames_since_detection < 45:
            # Retain cached position for up to 1.5s of camera occlusion
            return self.last_valid_result

        # Default road calibration: standard roadway stop line at 65% of frame
        default_y = int(h * 0.62)
        return ZebraCrossingResult(
            is_detected=False,
            stop_line_y=default_y,
            zone_bbox=(int(w * 0.1), default_y, int(w * 0.9), int(default_y + h * 0.12)),
            stripes=[],
            confidence=0.50,
            status_text="DEFAULT CALIBRATION"
        )

    def render_overlay(
        self,
        frame: np.ndarray,
        zebra_res: ZebraCrossingResult,
        signal_state: str = "RED",
        show_stripes: bool = True
    ) -> np.ndarray:
        """
        Draws high-visibility graphical annotations for the Zebra Crossing zone,
        individual stripe contours, and the Virtual Stop Line.
        """
        h, w = frame.shape[:2]
        stop_y = zebra_res.stop_line_y
        is_red = (signal_state.upper() == "RED")

        # Color schemes:
        # RED signal -> High alert crimson / orange-red
        # GREEN signal -> Cyan / emerald pass
        line_color = (0, 0, 255) if is_red else (0, 235, 120)
        zone_color = (0, 30, 180) if is_red else (0, 160, 80)

        # 1. Semi-transparent Zebra Crossing Region Highlight
        if zebra_res.zone_bbox:
            x1, y1, x2, y2 = zebra_res.zone_bbox
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)

            overlay = frame.copy()
            # Fill subtle translucent crosswalk corridor
            cv2.rectangle(overlay, (x1, y1), (x2, y2), zone_color, -1)
            alpha = 0.22 if is_red else 0.14
            cv2.addWeighted(overlay, alpha, frame, 1.0 - alpha, 0, frame)

            # Draw zone border
            cv2.rectangle(frame, (x1, y1), (x2, y2), line_color, 1)

            # Draw detected stripes with accent glow
            if show_stripes and zebra_res.stripes:
                for sx, sy, sw, sh in zebra_res.stripes[:16]:
                    cv2.rectangle(frame, (sx, sy), (sx + sw, sy + sh), (255, 255, 255), 1)

        # 2. Virtual Stop Line at Zebra Crossing Edge
        cv2.line(frame, (20, stop_y), (w - 20, stop_y), line_color, 4)

        # Stop Line End Caps / Tech Notch
        cv2.circle(frame, (20, stop_y), 6, line_color, -1)
        cv2.circle(frame, (w - 20, stop_y), 6, line_color, -1)

        # 3. Virtual Stop Line Label & HUD Badge
        label_text = f"VIRTUAL STOP LINE [SIGNAL: {signal_state}]"
        cv2.rectangle(frame, (25, stop_y - 28), (420, stop_y - 4), (15, 23, 42), -1)
        cv2.rectangle(frame, (25, stop_y - 28), (420, stop_y - 4), line_color, 1)
        cv2.putText(
            frame, label_text, (35, stop_y - 10),
            cv2.FONT_HERSHEY_SIMPLEX, 0.48, line_color, 2
        )

        # Zebra Crossing Status Pill
        pill_text = f"ZEBRA CROSSING: {zebra_res.status_text}"
        pill_color = (0, 235, 255) if zebra_res.is_detected else (150, 160, 180)
        cv2.rectangle(frame, (w - 380, stop_y - 28), (w - 25, stop_y - 4), (15, 23, 42), -1)
        cv2.rectangle(frame, (w - 380, stop_y - 28), (w - 25, stop_y - 4), pill_color, 1)
        cv2.putText(
            frame, pill_text, (w - 370, stop_y - 10),
            cv2.FONT_HERSHEY_SIMPLEX, 0.42, pill_color, 1
        )

        return frame
