"""Offline learned visual descriptors, with optional platform acceleration."""
import os
import sys
import threading
import numpy as np
from PIL import Image


class VisualRuntime:
    def __init__(self, model):
        self.model = model
        self.session = None
        self.provider = 'not_loaded'
        self.lock = threading.Lock()

    def descriptor(self, rgb):
        with self.lock:
            import onnxruntime as ort
            if self.session is None:
                available = ort.get_available_providers()
                preferred = 'CoreMLExecutionProvider' if sys.platform == 'darwin' else 'DmlExecutionProvider'
                providers = [preferred, 'CPUExecutionProvider'] if preferred in available else ['CPUExecutionProvider']
                options = ort.SessionOptions()
                options.intra_op_num_threads = min(4, os.cpu_count() or 1)
                options.inter_op_num_threads = 1
                options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                options.enable_mem_pattern = preferred != 'DmlExecutionProvider'
                try:
                    self.session = ort.InferenceSession(str(self.model), options, providers=providers)
                except Exception:
                    self.session = ort.InferenceSession(str(self.model), options, providers=['CPUExecutionProvider'])
                self.provider = self.session.get_providers()[0]
            image = np.asarray(Image.fromarray(rgb).resize((224, 224)), dtype=np.float32) / 255.0
            image = (image - np.array([.485, .456, .406], dtype=np.float32)) / np.array([.229, .224, .225], dtype=np.float32)
            value = np.transpose(image, (2, 0, 1))[None]
            try:
                result = self.session.run(None, {self.session.get_inputs()[0].name: value})[0].reshape(-1)
            except Exception:
                if self.provider=='CPUExecutionProvider': raise
                cpu_options=ort.SessionOptions()
                cpu_options.intra_op_num_threads=min(4,os.cpu_count() or 1)
                self.session=ort.InferenceSession(str(self.model),cpu_options,providers=['CPUExecutionProvider'])
                self.provider='CPUExecutionProvider'
                result=self.session.run(None,{self.session.get_inputs()[0].name:value})[0].reshape(-1)
            norm = np.linalg.norm(result)
            return np.round(result / max(float(norm), 1e-8), 5).tolist()
