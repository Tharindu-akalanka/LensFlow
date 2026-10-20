"""Small offline AVA aesthetic model. A bounded hint, never a quality verdict."""
import threading
import numpy as np
from PIL import Image

class AestheticRuntime:
    def __init__(self,model):
        self.model=model
        self.session=None
        self.lock=threading.Lock()

    def assess(self,rgb):
        if not self.model.is_file():return {'status':'unavailable'}
        try:
            with self.lock:
                import onnxruntime as ort
                if self.session is None:
                    options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
                    self.session=ort.InferenceSession(str(self.model),options,providers=['CPUExecutionProvider'])
                # Same full-image square resize as publisher's test generator.
                image=np.asarray(Image.fromarray(rgb).resize((224,224),Image.Resampling.NEAREST),dtype=np.float32)/127.5-1
                value=np.transpose(image,(2,0,1))[None]
                distribution=self.session.run(None,{'image':value})[0].reshape(-1)
                if distribution.shape!=(10,) or not np.all(np.isfinite(distribution)) or np.any(distribution<0) or abs(float(distribution.sum())-1)>.01:
                    raise ValueError('Invalid aesthetic model output')
                mean=float(distribution@np.arange(1,11))
                spread=float(np.sqrt(distribution@((np.arange(1,11)-mean)**2)))
                return {'status':'available','model':'idealo NIMA MobileNet AVA','score':round(mean,3),'spread':round(spread,3)}
        except Exception:
            return {'status':'unavailable'}
