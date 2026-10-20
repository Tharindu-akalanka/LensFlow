"""Build-time conversion of pinned idealo NIMA MobileNet (Keras 2.1.6) to ONNX.

Requires h5py, onnx, torch and onnxruntime only on the build host. Runtime uses
ONNX exclusively. Preserves the original symmetric padding and BN epsilon.
Publisher: https://github.com/idealo/image-quality-assessment (Apache-2.0).
This converter is a SnapSort modification; original weights are unmodified.
"""
import hashlib
import json
from pathlib import Path
import urllib.request
import numpy as np
import h5py
import onnx
from onnx import helper as H, numpy_helper as N, TensorProto as T

ROOT=Path(__file__).resolve().parent
MODEL=ROOT/'models'
SHA='dceaf7c2d218bc6e80b21d6e147e3b56a21b7f31'
WEIGHTS_SHA='e563ad91b3d47410e45f7238f07ab8f6abd1bd0c4b18a4b0af9c681a21a91cb2'
URL=f'https://raw.githubusercontent.com/idealo/image-quality-assessment/{SHA}/models/MobileNet/weights_mobilenet_aesthetic_0.07.hdf5'

def main():
    MODEL.mkdir(parents=True,exist_ok=True)
    weights=ROOT.parent/'desktop'/'.build'/'weights_mobilenet_aesthetic_0.07.hdf5'
    weights.parent.mkdir(parents=True,exist_ok=True)
    if not weights.exists():weights.write_bytes(urllib.request.urlopen(URL,timeout=120).read())
    assert hashlib.sha256(weights.read_bytes()).hexdigest()==WEIGHTS_SHA,'Unexpected weights checksum'
    nodes,initializers,blocks=[],[],[]
    with h5py.File(weights) as f:
        def get(layer,key):return np.array(f[layer][layer][key+':0'],dtype=np.float32)
        def constant(name,value):initializers.append(N.from_array(value,name));return name
        constant('zero',np.array(0,dtype=np.float32));constant('six',np.array(6,dtype=np.float32))
        previous='image'
        def block(name,stride,depthwise=False):
            nonlocal previous
            kernel=get(name,'depthwise_kernel' if depthwise else 'kernel')
            kernel=kernel.transpose(2,3,0,1) if depthwise else kernel.transpose(3,2,0,1)
            params=[get(name+'_bn',k) for k in ['gamma','beta','moving_mean','moving_variance']]
            pad=1 if kernel.shape[-1]==3 else 0
            nodes.append(H.make_node('Conv',[previous,constant(name+'_weights',kernel)],[name],pads=[pad]*4,strides=[stride]*2,group=kernel.shape[0] if depthwise else 1))
            nodes.append(H.make_node('BatchNormalization',[name]+[constant(name+'_'+str(i),v) for i,v in enumerate(params)],[name+'_bn'],epsilon=.001))
            nodes.append(H.make_node('Clip',[name+'_bn','zero','six'],[name+'_relu']))
            blocks.append((kernel,params,stride,pad,depthwise))
            previous=name+'_relu'
        block('conv1',2)
        for i in range(1,14):
            block(f'conv_dw_{i}',2 if i in (2,4,6,12) else 1,True)
            block(f'conv_pw_{i}',1)
        dense,bias=get('dense_1','kernel'),get('dense_1','bias')
        nodes.extend([H.make_node('GlobalAveragePool',[previous],['pool']),H.make_node('Flatten',['pool'],['flat'],axis=1),
                      H.make_node('Gemm',['flat',constant('dense',dense),constant('bias',bias)],['logits']),H.make_node('Softmax',['logits'],['ratings'],axis=1)])
    model=H.make_model(H.make_graph(nodes,'SnapSort idealo NIMA MobileNet',[H.make_tensor_value_info('image',T.FLOAT,[1,3,224,224])],[H.make_tensor_value_info('ratings',T.FLOAT,[1,10])],initializers),opset_imports=[H.make_opsetid('',13)])
    model.ir_version=8
    onnx.checker.check_model(model)
    output=MODEL/'nima-mobilenet.onnx';onnx.save(model,output)
    # Independent tensor implementation verifies conversion numerics, not taste.
    import torch
    import torch.nn.functional as F
    import onnxruntime as ort
    torch.set_num_threads(2)
    session=ort.InferenceSession(str(output),providers=['CPUExecutionProvider'])
    errors=[]
    rng=np.random.default_rng(30)
    for value in (np.zeros((1,3,224,224),dtype=np.float32),np.ones((1,3,224,224),dtype=np.float32),rng.uniform(-1,1,(1,3,224,224)).astype(np.float32)):
        x=torch.from_numpy(value)
        for kernel,params,stride,pad,dw in blocks:
            x=F.conv2d(x,torch.from_numpy(kernel),stride=stride,padding=pad,groups=kernel.shape[0] if dw else 1)
            gamma,beta,mean,var=[torch.from_numpy(p)[None,:,None,None] for p in params]
            x=torch.clamp((x-mean)/torch.sqrt(var+.001)*gamma+beta,0,6)
        reference=torch.softmax(x.mean((2,3))@torch.from_numpy(dense)+torch.from_numpy(bias),dim=1).numpy()
        actual=session.run(None,{'image':value})[0]
        error=float(np.max(np.abs(reference-actual)));errors.append(error)
        assert error<1e-4,(error,reference,actual)
    license_path=MODEL/'aesthetic-model-license.txt'
    if not license_path.exists():license_path.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/idealo/image-quality-assessment/{SHA}/LICENSE',timeout=60).read())
    provenance={'publisher':'idealo internet GmbH','repository':'https://github.com/idealo/image-quality-assessment','commit':SHA,'weights_url':URL,'weights_sha256':WEIGHTS_SHA,'license':'Apache-2.0','dataset':'AVA','use':'Uncalibrated aesthetic ranking hint; not a pose, expression or quality verdict'}
    provenance.update(onnx_sha256=hashlib.sha256(output.read_bytes()).hexdigest(),conversion='Keras 2.1.6 symmetric padding, BN epsilon 0.001, RGB [-1,1], 224 square',reference_max_abs_errors=errors)
    (MODEL/'aesthetic-model-source.json').write_text(json.dumps(provenance,indent=2))
    print(json.dumps({'onnx_bytes':output.stat().st_size,'reference_max_abs_errors':errors}))

if __name__=='__main__':main()
