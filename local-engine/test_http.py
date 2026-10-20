"""Real loopback API tests against disposable photos and SQLite data."""
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request,urlopen
from http.server import ThreadingHTTPServer
from PIL import Image
from server import Handler,Engine

class HttpTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.root=Path(self.temp.name)
        self.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        self.origin=f'http://127.0.0.1:{self.server.server_port}'
        self.server.allowed_origins={self.origin}
        self.server.token='test-token'
        self.server.frontend=self.root/'ui';self.server.frontend.mkdir()
        (self.server.frontend/'index.html').write_text('test frontend')
        self.server.engine=Engine(self.root/'data',self.root/'missing.task')
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join();self.server.engine.close();self.temp.cleanup()
    def request(self,path,body=None,headers=None,raw=None):
        data=raw if raw is not None else json.dumps(body).encode() if body is not None else None
        request=Request(self.origin+path,data=data,headers={'Authorization':'Bearer test-token',**({'Content-Type':'application/json'} if data is not None else {}),**(headers or {})})
        try:
            with urlopen(request,timeout=15) as response:return response.status,response.read()
        except HTTPError as error:return error.code,error.read()
    def api(self,path,body=None):
        status,data=self.request('/api'+path,body)
        self.assertLess(status,300,data.decode());return json.loads(data)
    def wait(self,identifier,state):
        for _ in range(200):
            result=self.api('/sessions/'+identifier)
            if result['status']==state:return result
            time.sleep(.025)
        self.fail(result)
    def test_auth_origin_validation_and_static_traversal(self):
        self.assertEqual(self.request('/api/health',headers={'Authorization':''})[0],403)
        self.assertEqual(self.request('/api/health',headers={'Origin':'https://foreign.invalid'})[0],403)
        self.assertEqual(self.request('/api/health',headers={'Authorization':'','Cookie':'lensflow_engine=test-token'})[0],200)
        self.assertEqual(self.request('/api/sessions',raw=b'[]')[0],400)
        self.assertEqual(self.request('/api/sessions',raw=b'{')[0],400)
        self.assertEqual(self.request('/api/sessions',raw=b'{}',headers={'Content-Type':'text/plain'})[0],403)
        self.assertEqual(self.request('/api/no-route')[0],404)
        self.assertEqual(self.request('/../outside')[0],404)
        self.assertEqual(self.request('/')[1],b'test frontend')
    def test_pause_after_analysis_completion_does_not_leave_pausing(self):
        from types import SimpleNamespace
        engine=self.server.engine
        identifier=engine.store.create_project('Completed worker cleanup')
        engine.store.update_status(identifier,'complete')
        engine.active=identifier
        engine.worker=SimpleNamespace(is_alive=lambda:True)
        try:
            self.api('/sessions/'+identifier+'/pause',{})
            self.assertEqual(engine.store.snapshot(identifier)['status'],'complete')
        finally:
            engine.worker=None
    def test_project_import_review_reanalyze_and_export(self):
        identifier=self.api('/sessions',{'name':'API test','mode':'fast','shoot_type':'portrait'})['id']
        route='/sessions/'+identifier
        self.assertEqual(self.request('/api'+route+'/resume',{})[0],400)
        source=self.root/'original.jpg';Image.new('RGB',(100,100),'red').save(source);original=source.read_bytes()
        self.api(route+'/import',{'files':[str(source)]});self.wait(identifier,'previews_ready')
        self.api(route+'/resume',{});project=self.wait(identifier,'complete');photo=project['photos'][0]['id']
        self.assertEqual(len(self.api('/sessions')),1)
        self.assertEqual(self.request('/api/photos/'+photo+'/thumbnail')[0],200)
        self.assertEqual(self.request('/api/photos/'+photo+'/not-a-kind')[0],404)
        self.api(route+'/decision',{'photos':[photo],'decision':'reject','reason':'Not needed'})
        self.assertEqual(self.api(route)['photos'][0]['rejection_reason'],'Not needed')
        self.api(route+'/undo',{});self.api(route+'/decision',{'photo':photo,'decision':'keep'})
        self.api(route+'/rating',{'photo':photo,'rating':5,'label':'Green'})
        self.api(route+'/groups',{'operation':'separate','photos':[photo]})
        self.assertTrue(self.api(route)['has_manual_groups'])
        self.api(route+'/groups',{'operation':'undo'})
        self.assertFalse(self.api(route)['has_manual_groups'])
        self.api(route+'/preferences',{'preferences':{**project['preferences'],'auto_xmp':True}})
        self.api(route+'/xmp',{})
        self.api(route+'/options',{'options':{**project['options'],'faces':False}})
        self.api(route+'/mode',{'mode':'balanced'})
        self.api(route+'/reanalyze',{});result=self.wait(identifier,'complete')
        self.assertEqual(result['photos'][0]['decision'],'keep');self.assertEqual(result['photos'][0]['rating'],5)
        self.api(route+'/pause',{});self.api(route+'/retry',{})
        self.api(route+'/watch',{'watch':{'enabled':False,'folder':'','auto_cull':False}})
        self.assertEqual(self.request('/api'+route+'/unknown',{})[0],404)
        self.assertEqual(source.read_bytes(),original)

if __name__=='__main__':unittest.main()
